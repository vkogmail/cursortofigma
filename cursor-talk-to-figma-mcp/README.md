# Cursor Talk to Figma MCP

MCP (Model Context Protocol) server for integrating Figma with Cursor AI.

## Setup

```bash
bun install
bun run build
```

## Development

```bash
# Watch mode
bun run dev

# Build once
bun run build

# Start socket server (for Figma plugin communication)
bun run socket
```

## Usage

This MCP server provides tools for:
- Fetching Figma component data
- Describing component structure and variants
- Getting layout information
- Exporting selections as images
- Mapping Figma variables to design tokens

## Configuration

The server connects to Figma via WebSocket. Make sure the Figma plugin is running and connected.

