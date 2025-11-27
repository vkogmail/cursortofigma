# Cursor Talk to Figma MCP

This project implements a Model Context Protocol (MCP) integration between Cursor AI and Figma, allowing Cursor to communicate with Figma for reading designs and modifying them programmatically.

## 🎨 Design Token & Variable Support

This fork extends the original project with comprehensive support for **design tokens, variables, and styles**:

- **Natural Language Token Application**: Apply design tokens using natural language phrases (e.g., "apply surface accent color", "use button md text style")
- **Variable Binding**: Bind Figma variables to any node property (colors, spacing, sizing, text properties)
- **Style Application**: Apply text styles and effect styles (shadows, blurs) to nodes
- **Phrase Resolution**: Intelligent phrase-to-token mapping with automatic property detection
- **Design System Context**: Automatic discovery of Figma variables and collections for context-aware token application

https://github.com/user-attachments/assets/129a14d2-ed73-470f-9a4c-2240b2a4885c

## Project Structure

- `src/talk_to_figma_mcp/` - TypeScript MCP server for Figma integration
- `src/cursor_mcp_plugin/` - Figma plugin for communicating with Cursor
- `src/socket.ts` - WebSocket server that facilitates communication between the MCP server and Figma plugin

## Get Started (local repo setup)

1. Install Bun if you haven't already:

```bash
curl -fsSL https://bun.sh/install | bash
```

2. From the repo root, run the setup script.  
   This will:
   - install dependencies
   - add the `TalkToFigma` MCP entry to your `~/.cursor/mcp.json`  
   - point it at **this local repo** (using your own absolute path)

```bash
bun setup
```

3. Start the WebSocket server

```bash
bun socket
```

4. **NEW** Install Figma plugin from [Figma community page](https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin) or [install locally](#figma-plugin)

## Quick Video Tutorial

[Video Link](https://www.linkedin.com/posts/sonnylazuardi_just-wanted-to-share-my-latest-experiment-activity-7307821553654657024-yrh8)

## Design Automation Example

**Bulk text content replacement**

Thanks to [@dusskapark](https://github.com/dusskapark) for contributing the bulk text replacement feature. Here is the [demo video](https://www.youtube.com/watch?v=j05gGT3xfCs).

**Instance Override Propagation**
Another contribution from [@dusskapark](https://github.com/dusskapark)
Propagate component instance overrides from a source instance to multiple target instances with a single command. This feature dramatically reduces repetitive design work when working with component instances that need similar customizations. Check out our [demo video](https://youtu.be/uvuT8LByroI).

## Development Setup (local MCP server)

If you want to **run the MCP server from this repo directly** (instead of the published npm package),
your `~/.cursor/mcp.json` should contain a `TalkToFigma` entry like:

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bun",
      "args": ["/path/to/your/repo/cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts"]
    }
  }
}
```

> Note: the path above is an example. In your real `mcp.json` Cursor will use **your own absolute path**
> to this repo (the setup script does this for you automatically).

## Manual Setup and Installation

### MCP Server: Integration with Cursor (npm package option)

Alternatively, you can use the **published package** instead of a local path.
In that case, add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

### WebSocket Server

Start the WebSocket server:

```bash
bun socket
```

### Figma Plugin

1. In Figma, go to Plugins > Development > New Plugin
2. Choose "Link existing plugin"
3. Select the `src/cursor_mcp_plugin/manifest.json` file
4. The plugin should now be available in your Figma development plugins

## Windows + WSL Guide

1. Install bun via powershell

```bash
powershell -c "irm bun.sh/install.ps1|iex"
```

2. Uncomment the hostname `0.0.0.0` in `src/socket.ts`

```typescript
// uncomment this to allow connections in windows wsl
hostname: "0.0.0.0",
```

3. Start the websocket

```bash
bun socket
```

## Usage

1. Start the WebSocket server
2. Install the MCP server in Cursor
3. Open Figma and run the Cursor MCP Plugin
4. The plugin automatically connects to the dedicated channel `figma-mcp-default` (no manual channel joining needed!)
   - The MCP server automatically joins this channel when it connects (configurable via `FIGMA_DEFAULT_CHANNEL` env var)
5. Use Cursor to communicate with Figma using the MCP tools

### Configuration

#### Figma Channel Configuration

The MCP server automatically connects to a default Figma channel on startup. You can customize this via environment variable:

```bash
export FIGMA_DEFAULT_CHANNEL="figma-mcp-default"
```

**Default**: `figma-mcp-default` (matches the Figma plugin's default channel)

#### Design Token Configuration

The MCP server can load design tokens from either:
- **Local files**: Place your `$themes.json` and `$metadata.json` in a `tokens/` directory
- **Remote repository**: Set `TOKENS_THEMES_URL` environment variable to a GitHub raw URL

Example:
```bash
export TOKENS_THEMES_URL="https://raw.githubusercontent.com/your-org/your-tokens/main/tokens/$themes.json"
```

### Natural Language Token Application

You can now apply design tokens using natural language:

```
Apply the surface accent color to the selection's fill
Use the button md text style on the text layer
Apply the shadow surface elevated effect to the frame
Set the padding top to the spacing medium variable
```

The phrase resolver automatically:
- Maps your phrase to the correct token path
- Finds the matching Figma variable or style
- Suggests the appropriate property name
- Applies it to your selection

## MCP Tools

The MCP server provides the following tools for interacting with Figma:

### Document & Selection

- `get_document_info` - Get information about the current Figma document
- `get_selection` - Get information about the current selection
- `read_my_design` - Get detailed node information about the current selection without parameters
- `get_node_info` - Get detailed information about a specific node
- `get_nodes_info` - Get detailed information about multiple nodes by providing an array of node IDs
- `set_focus` - Set focus on a specific node by selecting it and scrolling viewport to it
- `set_selections` - Set selection to multiple nodes and scroll viewport to show them

### Context Tools

These tools help build context but aren't strictly required:

- `get_document_info` - Get information about the current Figma document
- `read_my_design` - Get detailed node information about the current selection
- `get_node_info` - Get detailed information about a specific node
- `get_nodes_info` - Get detailed information about multiple nodes
- `get_styles` - Get all available text styles and effect styles from the document

### Design Tokens & Variables

- `get_variable_collections` - Get all Figma variable collections and their variables
- `get_selection_variables` - Get all variables currently bound to the selection
- `set_variable_binding` - Bind a variable to a node property (fills, strokes, width, height, padding, spacing, text properties, etc.)
- `set_text_style` - Apply a Figma text style to a node (applies to all descendant text nodes, skips icon layers)
- `set_effect_style` - Apply a Figma effect style to a node (shadows, blurs, etc.)

**Supported Variable Properties:**
- **Colors**: `fills`, `strokes`
- **Layout & Sizing**: `width`, `height`, `cornerRadius`, `opacity`
- **Text**: `fontSize`, `fontFamily`, `fontWeight`, `letterSpacing`, `lineHeight`
- **Auto-layout Padding**: `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- **Auto-layout Spacing**: `itemSpacing`, `counterAxisSpacing`

### Connection Management

- `join_channel` - Join a specific channel to communicate with Figma (plugin uses dedicated channel `figma-mcp-default` automatically)

## Tool Categorization

This MCP server is focused on **applying design tokens, variables, and styles to Figma nodes**. Tools are categorized by their relevance to this core goal:

### Core Tools (Essential)

These 8 tools are required for the primary use case:

1. **`join_channel`** - Connect to Figma plugin channel
2. **`get_selection`** - Get current selection to apply tokens/styles to
3. **`get_selection_variables`** - See what variables are currently bound
4. **`get_variable_collections`** - Get all Figma variables and collections (needed for context)
5. **`get_styles`** - Get all available text/effect styles (needed for context)
6. **`set_variable_binding`** - **Core**: Bind a variable to a node property
7. **`set_text_style`** - **Core**: Apply a text style to a node
8. **`set_effect_style`** - **Core**: Apply an effect style to a node

### Optional Tools (Commented Out)

Many tools from the original project have been commented out to focus on token/variable/style application. These tools are available but not needed for the primary workflow:

- **Creation Tools**: `create_rectangle`, `create_frame`, `create_text`
- **Direct Property Setting**: `set_fill_color`, `set_stroke_color`, `set_corner_radius`, `set_padding`, `set_axis_align`, `set_layout_sizing`, `set_item_spacing`, `set_layout_mode` (use `set_variable_binding` instead)
- **Layout & Manipulation**: `move_node`, `resize_node`, `clone_node`, `delete_node`, `delete_multiple_nodes`
- **Content Editing**: `set_text_content`, `set_multiple_text_contents`, `scan_text_nodes`, `scan_nodes_by_types`
- **Component Management**: `get_local_components`, `create_component_instance`, `get_instance_overrides`, `set_instance_overrides`
- **Prototyping**: `get_reactions`, `set_default_connector`, `create_connections`
- **Selection & Navigation**: `set_focus`, `set_selections`
- **Export**: `export_node_as_image`
- **Annotations**: `get_annotations`, `set_annotation`, `set_multiple_annotations`

> **Note**: All optional tools can be easily re-enabled by uncommenting them in `server.ts` if needed for advanced use cases.

## Recent Improvements

### Fixed Channel System
- **Dedicated Channel**: Plugin now uses a fixed channel name `figma-mcp-default` instead of generating random channels
- **Persistent Connection**: Channel name is saved and persists across plugin restarts
- **No Manual Channel Management**: Automatic connection to the dedicated channel - no need to manually join channels

### Tool Focus
- **Streamlined Toolset**: Focused on 8 core tools + 4 context tools essential for token/variable/style application
- **Commented Out Non-Core Tools**: Prototyping, annotations, connections, and other tools are available but commented out
- **Easy Re-enablement**: All tools can be easily re-enabled by uncommenting in `server.ts`

### Enhanced Phrase Resolution
- **Natural Language Support**: Apply tokens using phrases like "surface accent color" or "button md text style"
- **Automatic Property Detection**: System automatically detects which property to bind (fills, paddingTop, textStyleId, etc.)
- **Style Support**: Resolves both variable references and style references (text styles, effect styles)
- **Design System Context**: Automatically builds context from Figma variables and design tokens

## Development

### Building the Figma Plugin

1. Navigate to the Figma plugin directory:

   ```
   cd src/cursor_mcp_plugin
   ```

2. Edit code.js and ui.html

## Best Practices

When working with the Figma MCP for token/variable/style application:

1. **Connection**: Plugin automatically connects to `figma-mcp-default` channel - no manual channel joining needed
2. **Get Context First**: 
   - Use `get_variable_collections` to see available variables
   - Use `get_styles` to see available text/effect styles
   - Use `get_selection_variables` to see what's currently bound
3. **Natural Language**: Use descriptive phrases when applying tokens:
   - "apply surface accent color" → binds color variable to fills
   - "use button md text style" → applies text style
   - "set padding top to spacing medium" → binds spacing variable to paddingTop
4. **Property Detection**: The system auto-detects property types, but you can be explicit:
   - "fill" or "background" → `fills`
   - "padding" or "padding top" → `paddingTop`
   - "spacing" or "item spacing" → `itemSpacing`
   - "text style" or "typography" → `textStyleId`
   - "shadow" or "effect" → `effectStyleId`
5. **Verify Changes**: Use `get_selection_variables` to verify variable bindings
6. **Text Styles**: When applying text styles, icon text layers are automatically skipped
7. **Variable Types**: Ensure variables match the property type (color variables for fills/strokes, number variables for spacing/sizing)

### Configuration Reference

#### Figma Channel
- **Default Channel**: Automatically connects to `figma-mcp-default` channel on startup
- **Custom Channel**: Set `FIGMA_DEFAULT_CHANNEL` environment variable to use a different channel

#### Token Configuration
- **Local Tokens**: Place `$themes.json` and `$metadata.json` in a `tokens/` directory
- **Remote Tokens**: Set `TOKENS_THEMES_URL` environment variable for remote token loading
- **Token Mapping**: The system maps token paths (e.g., `color.surface.action.accent.default`) to Figma variable names (e.g., `color/surface/action/accent/default`)

## License

MIT
