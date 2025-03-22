import { Server, ServerWebSocket } from "bun";

// Define WebSocket constants
const WebSocket = {
  OPEN: 1
};

/**
 * Connection Management System
 * 
 * This WebSocket server implements a simplified connection system using a single default channel.
 * Instead of managing multiple channels, all clients connect to a single 'default' channel.
 * This approach simplifies the architecture and makes the behavior more predictable,
 * especially in a local development environment.
 * 
 * Key features:
 * - Single default channel for all connections
 * - Automatic client registration
 * - Simplified message broadcasting
 * - Consistent behavior across server restarts
 */

// Store clients in a single default channel
const DEFAULT_CHANNEL = 'default';
const channels = new Map<string, Set<ServerWebSocket<any>>>();
channels.set(DEFAULT_CHANNEL, new Set());

/**
 * Handles new WebSocket connections
 * - Automatically adds client to default channel
 * - Sends welcome message
 * - Sets up disconnect handler
 */
function handleConnection(ws: ServerWebSocket<any>) {
  console.log("New client connected");
  
  // Automatically add client to default channel
  const defaultClients = channels.get(DEFAULT_CHANNEL)!;
  defaultClients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: "system",
    message: "Connected to default channel",
    channel: DEFAULT_CHANNEL
  }));

  ws.close = () => {
    console.log("Client disconnected");
    const defaultClients = channels.get(DEFAULT_CHANNEL)!;
    defaultClients.delete(ws);

    // Notify other clients
    defaultClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "system",
          message: "A user has left the channel",
          channel: DEFAULT_CHANNEL
        }));
      }
    });
  };
}

const server = Bun.serve({
  port: 3055,
  fetch(req: Request, server: Server) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Handle WebSocket upgrade
    const success = server.upgrade(req, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });

    if (success) {
      return; // Upgraded to WebSocket
    }

    // Return response for non-WebSocket requests
    return new Response("WebSocket server running", {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
  websocket: {
    open: handleConnection,
    message(ws: ServerWebSocket<any>, message: string | Buffer) {
      try {
        console.log("Received message from client:", message);
        const data = JSON.parse(message as string);

        // Handle join messages by automatically confirming default channel
        if (data.type === "join") {
          console.log("Sending join confirmation for:", data.id);
          ws.send(JSON.stringify({
            type: "system",
            message: {
              id: data.id,
              result: "Connected to default channel",
            },
            channel: DEFAULT_CHANNEL
          }));
          return;
        }

        // Handle regular messages
        if (data.type === "message") {
          const defaultClients = channels.get(DEFAULT_CHANNEL)!;
          
          // Broadcast to all clients
          defaultClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log("Broadcasting message to client:", data.message);
              client.send(JSON.stringify({
                type: "broadcast",
                message: data.message,
                sender: client === ws ? "You" : "User",
                channel: DEFAULT_CHANNEL
              }));
            }
          });
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    },
    close(ws: ServerWebSocket<any>) {
      const defaultClients = channels.get(DEFAULT_CHANNEL)!;
      defaultClients.delete(ws);
    }
  }
});

console.log(`WebSocket server running on port ${server.port}`);
