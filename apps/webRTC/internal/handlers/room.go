package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	guuid "github.com/google/uuid"
)

func CreateRoom(c *fiber.Ctx) error {
	RoomId := guuid.New().String()
	return c.Redirect(fmt.Sprintf("/room/%s", RoomId), fiber.StatusSeeOther)
}

func JoinRoom(c *fiber.Ctx) error {
	roomId := c.Params("room")
	if roomId == "" {
		return c.Status(fiber.StatusBadRequest).SendString("Room ID is required")
	}

	uuid, suuid, _ := CreateOrGetRoom(roomId)
	return c.Render("room", fiber.Map{
		"RoomId": roomId,
		"UUID":   uuid,
		"SSUID":  suuid,
	})
}

func RoomWS(c *websocket.Conn) {
	uuid := c.Params("uuid")

	if uuid == "" {
		c.Close()
	}

	_, _, room := CreateOrGetRoom(uuid)
	return room.HandleWebSocket(c)
}
