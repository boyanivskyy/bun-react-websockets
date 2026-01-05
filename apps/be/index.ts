import type { ServerWebSocket, WebSocketReadyState } from "bun";

const PORT = process.env.PORT || 3001;

// Store all connected WebSocket clients
const clients = new Set<ServerWebSocket<unknown>>();

// Create HTTP server with WebSocket upgrade handler
const server = Bun.serve({
	port: PORT,
	fetch(req, server) {
		// Handle WebSocket upgrade
		if (server.upgrade(req)) {
			return; // WebSocket upgrade request
		}

		// Handle regular HTTP requests
		const url = new URL(req.url);

		if (url.pathname === "/health") {
			return new Response(
				JSON.stringify({
					status: "ok",
					clients: clients.size,
					uptime: process.uptime(),
				}),
				{
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response("WebSocket Server", { status: 200 });
	},
	websocket: {
		// Called when a WebSocket connection is established
		open(ws) {
			clients.add(ws);
			console.log(
				`[WebSocket] Client connected. Total clients: ${clients.size}`
			);

			// Send welcome message to the newly connected client
			ws.send(
				JSON.stringify({
					type: "welcome",
					message: "Connected to WebSocket server",
					timestamp: Date.now(),
				})
			);

			// Broadcast to all other clients that someone joined
			broadcast(
				{
					type: "user_joined",
					message: "A new user joined",
					timestamp: Date.now(),
				},
				ws
			);
		},

		// Called when a message is received from a client
		message(ws, message) {
			try {
				// Handle both string and binary messages
				const data =
					typeof message === "string"
						? JSON.parse(message)
						: JSON.parse(message.toString());

				console.log(`[WebSocket] Received message from client:`, data);

				// Echo the message back to the sender
				ws.send(
					JSON.stringify({
						type: "echo",
						original: data,
						timestamp: Date.now(),
					})
				);

				// Broadcast to all other clients
				broadcast(
					{
						type: "broadcast",
						data: data,
						timestamp: Date.now(),
					},
					ws
				);
			} catch (error) {
				console.error("[WebSocket] Error parsing message:", error);
				ws.send(
					JSON.stringify({
						type: "error",
						message: "Invalid message format",
						timestamp: Date.now(),
					})
				);
			}
		},

		// Called when a WebSocket connection is closed
		close(ws) {
			clients.delete(ws);
			console.log(
				`[WebSocket] Client disconnected. Total clients: ${clients.size}`
			);

			// Broadcast to all remaining clients that someone left
			broadcast({
				type: "user_left",
				message: "A user left",
				timestamp: Date.now(),
			});
		},
	},
});

// Helper function to broadcast messages to all connected clients
function broadcast(message: unknown, exclude?: ServerWebSocket<unknown>) {
	const payload = JSON.stringify(message);
	clients.forEach((client) => {
		if (client !== exclude && client.readyState === 1) {
			client.send(payload);
		}
	});
}

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
console.log(`📡 Health check available at http://localhost:${PORT}/health`);
