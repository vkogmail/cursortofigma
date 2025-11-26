# MCP Tools Overview

This document categorizes all MCP tools by their relevance to the core goal: **applying design tokens, variables, and styles to Figma nodes**.

## Core Tools (Essential for Token/Variable/Style Application)

These tools are required for the primary use case:

1. **`join_channel`** - Connect to Figma plugin channel
2. **`get_selection`** - Get current selection to apply tokens/styles to
3. **`get_selection_variables`** - See what variables are currently bound
4. **`get_variable_collections`** - Get all Figma variables and collections (needed for context)
5. **`get_styles`** - Get all available text/effect styles (needed for context)
6. **`set_variable_binding`** - **Core**: Bind a variable to a node property
7. **`set_text_style`** - **Core**: Apply a text style to a node
8. **`set_effect_style`** - **Core**: Apply an effect style to a node

## Context Tools (Useful for Understanding Design System)

These tools help build context but aren't strictly required:

9. **`get_document_info`** - Get document metadata
10. **`read_my_design`** - Get detailed selection information
11. **`get_node_info`** - Get information about a specific node
12. **`get_nodes_info`** - Get information about multiple nodes

## Optional Tools (Not Core to Token/Style Application)

These tools provide additional functionality but are not needed for the primary use case:

### Creation Tools
- `create_rectangle`, `create_frame`, `create_text` - Create new nodes

### Direct Property Setting (Use variables instead)
- `set_fill_color`, `set_stroke_color` - Direct color setting (use `set_variable_binding` with `fills`/`strokes` instead)
- `set_corner_radius` - Direct radius setting (use `set_variable_binding` with `cornerRadius` instead)
- `set_padding`, `set_axis_align`, `set_layout_sizing`, `set_item_spacing`, `set_layout_mode` - Direct layout setting (use `set_variable_binding` with padding/spacing properties instead)

### Layout & Manipulation
- `move_node`, `resize_node` - Move/resize nodes
- `clone_node` - Clone nodes
- `delete_node`, `delete_multiple_nodes` - Delete nodes

### Content Editing
- `set_text_content`, `set_multiple_text_contents` - Edit text content
- `scan_text_nodes`, `scan_nodes_by_types` - Scan nodes

### Component Management
- `get_local_components` - Get local components
- `create_component_instance` - Create component instances
- `get_instance_overrides`, `set_instance_overrides` - Manage component overrides

### Prototyping
- `get_reactions` - Get prototype reactions
- `set_default_connector`, `create_connections` - Create connector lines

### Selection & Navigation
- `set_focus`, `set_selections` - Manage selection/focus

### Export
- `export_node_as_image` - Export nodes as images

### Annotations
- `get_annotations`, `set_annotation`, `set_multiple_annotations` - Manage annotations

## Recommendation

For a focused token/variable/style application workflow, you only need the **8 Core Tools** listed above. The other tools can remain available for advanced use cases, but the AI should prioritize using the core tools when applying tokens and styles.

