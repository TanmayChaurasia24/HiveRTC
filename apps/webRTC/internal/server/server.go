package server

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func Run() error {
	app := fiber.New()

	// health check point
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("health check!")
	})


	// Example routes (replace with your actual handler funcs)
	app.Get("/", handlers.Welcome)
	app.Get("/room/create", handlers.CreateRoom)
	app.Get("/room/:room", handlers.JoinRoom)

	// WebSocket routes
	app.Get("/room/:uuid/websocket", websocket.New(handlers.RoomWS))
	app.Get("/room/:uuid/chat", handlers.RoomChat)
	app.Get("/room/:uuid/chat/websocket", websocket.New(handlers.RoomChatWS))
	app.Get("/room/:uuid/viewer/websocket", websocket.New(handlers.RoomViewerWS))

	// Stream routes
	app.Get("/stream/:ssuid", handlers.Stream)
	app.Get("/stream/:ssuid/websocket", websocket.New(handlers.StreamWS))
	app.Get("/stream/:ssuid/chat/websocket", websocket.New(handlers.StreamChatWS))
	app.Get("/stream/:ssuid/viewer/websocket", websocket.New(handlers.StreamViewerWS))

	// Start server
	if err := app.Listen(":8080"); err != nil {
		log.Fatal(err)
	}

	return nil
}
