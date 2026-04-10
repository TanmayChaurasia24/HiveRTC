import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager.js";
import jwt from "jsonwebtoken";
import client from "@metaverse2d/database"

const JWT_PASSWORD = "asnjkn32083ehjskdjNSDJNS";

function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export class User {
    public id: string;
    public userId?: string;
    private spaceId?: string;
    public x: number;   // public so RoomManager can read position
    public y: number;
    private ws: WebSocket;

    constructor(ws: WebSocket) {
        this.id = getRandomString(10);
        this.x = 0;
        this.y = 0;
        this.ws = ws;
        this.initHandlers();
    }

    initHandlers() {
        this.ws.on("message", async (data) => {
            let parsedData: any;
            try {
                parsedData = JSON.parse(data.toString());
            } catch {
                return;
            }

            switch (parsedData.type) {
                case "join": {
                    const spaceId = parsedData.payload?.spaceId;
                    const token = parsedData.payload?.token;

                    if (!spaceId || !token) {
                        this.ws.close();
                        return;
                    }

                    let userId: string;
                    try {
                        userId = (jwt.verify(token, JWT_PASSWORD) as any).userId;
                    } catch {
                        console.error("JWT verification failed");
                        this.ws.close();
                        return;
                    }

                    if (!userId) {
                        this.ws.close();
                        return;
                    }

                    this.userId = userId;

                    const space = await client.space.findFirst({ where: { id: spaceId } });
                    if (!space) {
                        this.ws.close();
                        return;
                    }

                    this.spaceId = spaceId;
                    RoomManager.getInstance().addUser(spaceId, this);

                    // Spawn at a random position within the space
                    this.x = Math.floor(Math.random() * space.width);
                    this.y = Math.floor(Math.random() * space.height);

                    // FIX: send existing users WITH their userId AND position
                    const existingUsers = RoomManager.getInstance().rooms
                        .get(spaceId)
                        ?.filter(u => u.id !== this.id)
                        ?.map(u => ({
                            userId: u.userId,
                            x: u.x,
                            y: u.y,
                        })) ?? [];

                    this.send({
                        type: "space-joined",
                        payload: {
                            userId: this.userId,   // FIX: include own userId
                            spawn: { x: this.x, y: this.y },
                            users: existingUsers,
                        },
                    });

                    // FIX: broadcast user-joined with userId to everyone else
                    RoomManager.getInstance().broadcast({
                        type: "user-joined",
                        payload: {
                            userId: this.userId,
                            x: this.x,
                            y: this.y,
                        },
                    }, this, this.spaceId!);
                    break;
                }

                case "move": {
                    const moveX = parsedData.payload?.x;
                    const moveY = parsedData.payload?.y;

                    if (moveX === undefined || moveY === undefined) return;

                    const xDisplacement = Math.abs(this.x - moveX);
                    const yDisplacement = Math.abs(this.y - moveY);

                    // Allow only 1-step move in cardinal direction
                    if (
                        (xDisplacement === 1 && yDisplacement === 0) ||
                        (xDisplacement === 0 && yDisplacement === 1)
                    ) {
                        this.x = moveX;
                        this.y = moveY;

                        // FIX: broadcast movement WITH userId so others know who moved
                        RoomManager.getInstance().broadcast({
                            type: "movement",
                            payload: {
                                userId: this.userId,
                                x: this.x,
                                y: this.y,
                            },
                        }, this, this.spaceId!);
                        return;
                    }

                    // Reject invalid move
                    this.send({
                        type: "movement-rejected",
                        payload: { x: this.x, y: this.y },
                    });
                    break;
                }
            }
        });
    }

    destroy() {
        RoomManager.getInstance().broadcast({
            type: "user-left",
            payload: { userId: this.userId },
        }, this, this.spaceId!);
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }

    send(payload: any) {
        this.ws.send(JSON.stringify(payload));
    }
}