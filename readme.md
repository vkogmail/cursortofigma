# Cursor Talk to Figma MCP

This project is a fork of [Sonny Lazuardi's original Cursor Talk to Figma MCP](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp) with additional functionality for working with Figma variables.

## Recent Improvements

### Connection Management
- **Default Channel System**: Simplified channel management by using a single 'default' channel
  - No more random channel generation
  - Consistent channel name across server restarts
  - Automatic channel joining on connection
  - Predictable behavior for local development

- **Robust Reconnection Logic**: 
  - Implemented exponential backoff strategy
  - Initial quick attempts (1s, 2s) for fast recovery
  - Gradually increasing delays (4s, 8s, 16s) to prevent server flooding
  - Maximum 5 reconnection attempts
  - Clear status feedback in the UI
  - Automatic reset of reconnection counter on successful connection

- **Type Safety Improvements**:
  - Added proper TypeScript configurations
  - Integrated `bun-types` for complete type coverage
  - No more TypeScript warnings or errors

### Architecture Changes
- WebSocket server (`src/socket.ts`):
  - Simplified to use single default channel
  - Improved error handling and client management
  - Added proper TypeScript type definitions

- Figma Plugin UI:
  - Automatic connection to default channel
  - Better connection status feedback
  - Improved error handling and recovery

## Changes from Original Project

This project is a fork of Sonny Lazuardi's original project with added functionality:

1. Complete support for Figma variables:
   - Get local variables and variable collections
   - Create new variables and variable collections
   - Bind variables to node properties
   - **Change existing variable bindings** - Successfully tested with changing fill colors on frames and components
   
Tools added for variable management:
- `get_local_variables` - Retrieve all local variables with optional type filtering
- `get_variable_collections` - Retrieve all variable collections
- `get_variable_by_id` - Retrieve a specific variable by ID
- `create_variable_collection` - Create a new variable collection
- `create_variable` - Create a new variable in a collection
- `set_bound_variable` - Bind a variable to a node property or change existing variable bindings

All original functionality from Sonny's project is maintained while adding these new capabilities.

### Additional MCP Tools

In addition to all the original tools, this version includes:

#### Variable Management
- `get_local_variables` - Get all local variables from the current Figma document
- `get_variable_collections` - Get all variable collections
- `get_variable_by_id` - Get a specific variable by ID
- `create_variable_collection` - Create a new variable collection
- `create_variable` - Create a new variable in a collection
- `set_bound_variable` - Bind a variable to a node property

https://github.com/user-attachments/assets/129a14d2-ed73-470f-9a4c-2240b2a4885c

## Project Structure

- `src/talk_to_figma_mcp/` - TypeScript MCP server for Figma integration
- `src/cursor_mcp_plugin/` - Figma plugin for communicating with Cursor
- `src/socket.ts` - WebSocket server that facilitates communication between the MCP server and Figma plugin

## Get Started

1. Install Bun if you haven't already:

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Run setup, this will also install MCP in your Cursor's active project

```bash
bun setup
```

3. Start the Websocket server

```bash
bun start
```

4. Install [Figma Plugin](#figma-plugin)

# Quick Video Tutorial

[![image](images/tutorial.jpg)](https://www.linkedin.com/posts/sonnylazuardi_just-wanted-to-share-my-latest-experiment-activity-7307821553654657024-yrh8)

## Manual Setup and Installation

### MCP Server: Integration with Cursor

Add the server to your Cursor MCP configuration in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bun",
      "args": [
        "/path/to/cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts"
      ]
    }
  }
}
```

### WebSocket Server

Start the WebSocket server:

```bash
bun run src/socket.ts
```

### Figma Plugin

1. In Figma, go to Plugins > Development > New Plugin
2. Choose "Link existing plugin"
3. Select the `src/cursor_mcp_plugin/manifest.json` file
4. The plugin should now be available in your Figma development plugins

## Usage

1. Start the WebSocket server
2. Install the MCP server in Cursor
3. Open Figma and run the Cursor MCP Plugin
4. Connect the plugin to the WebSocket server by joining a channel using `join_channel`
5. Use Cursor to communicate with Figma using the MCP tools

## MCP Tools

The MCP server provides the following tools for interacting with Figma:

### Document & Selection

- `get_document_info` - Get information about the current Figma document
- `get_selection` - Get information about the current selection
- `get_node_info` - Get detailed information about a specific node

### Creating Elements

- `create_rectangle` - Create a new rectangle with position, size, and optional name
- `create_frame` - Create a new frame with position, size, and optional name
- `create_text` - Create a new text node with customizable font properties

### Modifying text content

- `set_text_content` - Set the text content of an existing text node

### Styling

- `set_fill_color` - Set the fill color of a node (RGBA)
- `set_stroke_color` - Set the stroke color and weight of a node
- `set_corner_radius` - Set the corner radius of a node with optional per-corner control

### Layout & Organization

- `move_node` - Move a node to a new position
- `resize_node` - Resize a node with new dimensions
- `delete_node`