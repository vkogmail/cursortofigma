import { Server, ServerWebSocket } from "bun";

/**
 * Connection Management System
 * 
 * WebSocket server that handles communication between Cursor and Figma plugin.
 * Implements a simplified connection system using a single default channel.
 */

// Store clients in a single default channel
const DEFAULT_CHANNEL = 'default';
const channels = new Map<string, Set<ServerWebSocket<any>>>();
channels.set(DEFAULT_CHANNEL, new Set());

const WebSocket = {
  OPEN: 1
};

/**
 * Handles new WebSocket connections
 */
function handleConnection(ws: ServerWebSocket<any>) {
  console.log("New client connected");
  
  // Add client to default channel
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
      return;
    }

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

        // Handle join messages
        if (data.type === "join") {
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

        // Handle get_team_components command
        if (data.type === "message" && data.message?.command === "get_team_components") {
          // The actual component fetching will be handled by the Figma plugin
          // We just relay the response back to the client
          ws.send(JSON.stringify({
            type: "response",
            id: data.message.id,
            result: {
              message: "Use figma.teamLibrary APIs directly in the plugin"
            }
          }));
          return;
        }

        // Handle get_all_components command
        if (data.type === "message" && data.message?.command === "get_all_components") {
          // Relay the command to the Figma plugin
          const defaultClients = channels.get(DEFAULT_CHANNEL)!;
          defaultClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "broadcast",
                message: data.message,
                sender: client === ws ? "You" : "User",
                channel: DEFAULT_CHANNEL
              }));
            }
          });
          return;
        }

        // Handle regular messages
        if (data.type === "message") {
          const defaultClients = channels.get(DEFAULT_CHANNEL)!;
          defaultClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
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
