import { createClient } from "redis";

class RedisService {
  private inMemory: Map<string, any> = new Map();
  private isConnected = false;
  private client = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  });

  async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log("Connected to Redis");
    } catch (e) {
      console.log("Redis not available, falling back to in-memory store.");
    }
  }

  async setRoomLocation(roomId: string, nodeIp: string) {
    if (this.isConnected) {
      await this.client.set(`room: ${roomId}: node`, nodeIp, { EX: 3600 });
    } else {
      this.inMemory.set(`room: ${roomId}: node`, nodeIp);
    }
  }

  async getRoomLocation(roomId: string): Promise<string | null> {
    if (this.isConnected) {
      return await this.client.get(`room: ${roomId}: node`);
    } else {
      return this.inMemory.get(`room: ${roomId}: node`) || null;
    }
  }

  async updateNodeLoad(nodeIp: string, load: number) {
    if (this.isConnected) {
      //@ts-ignore
      await this.client.zadd("media_node_loads", { score: load, value: nodeIp });
    }
  }

  async getLeastLoadedNode(): Promise<string | null> {
    if (this.isConnected) {
      //@ts-ignore
      const result: any[] = await this.client.zrange("media_node_loads", 0, 0);
      return result[0] || process.env.NODE_IP || "127.0.0.1";
    } else {
      return process.env.NODE_IP || "127.0.0.1";
    }
  }
}

export const redisService = new RedisService();
