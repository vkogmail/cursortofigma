#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import type { ComponentDescription } from "./componentDescription.js";
import {
  mapComponentDescriptionToTokenized,
  generateReactComponentFromTokenized,
} from "./mapComponentDescriptionToTokens.js";
import { loadTokensConfigFromEnv } from "./tokensConfig.js";
import {
  matchComponentValuesToTokens,
  matchColorToToken,
  matchSpacingToToken,
} from "./valueToTokenMatcher.js";

// Define TypeScript interfaces for Figma responses
interface FigmaResponse {
  id: string;
  result?: any;
  error?: string;
}

// Define interface for command progress updates
interface CommandProgressUpdate {
  type: 'command_progress';
  commandId: string;
  commandType: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  progress: number;
  totalItems: number;
  processedItems: number;
  currentChunk?: number;
  totalChunks?: number;
  chunkSize?: number;
  message: string;
  payload?: any;
  timestamp: number;
}

// Update the getInstanceOverridesResult interface to match the plugin implementation
interface getInstanceOverridesResult {
  success: boolean;
  message: string;
  sourceInstanceId: string;
  mainComponentId: string;
  overridesCount: number;
}

interface setInstanceOverridesResult {
  success: boolean;
  message: string;
  totalCount?: number;
  results?: Array<{
    success: boolean;
    instanceId: string;
    instanceName: string;
    appliedCount?: number;
    message?: string;
  }>;
}

// Custom logging functions that write to stderr instead of stdout to avoid being captured
const logger = {
  info: (message: string) => process.stderr.write(`[INFO] ${message}\n`),
  debug: (message: string) => process.stderr.write(`[DEBUG] ${message}\n`),
  warn: (message: string) => process.stderr.write(`[WARN] ${message}\n`),
  error: (message: string) => process.stderr.write(`[ERROR] ${message}\n`),
  log: (message: string) => process.stderr.write(`[LOG] ${message}\n`)
};

// WebSocket connection and request tracking
let ws: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  lastActivity: number; // Add timestamp for last activity
}>();

// Track which channel each client is in
let currentChannel: string | null = null;

// Create MCP server
const server = new McpServer({
  name: "TalkToFigmaMCP",
  version: "1.0.0",
});

// Add command line argument parsing
const args = process.argv.slice(2);
const serverArg = args.find(arg => arg.startsWith('--server='));
const serverUrl = serverArg ? serverArg.split('=')[1] : 'localhost';
const WS_URL = serverUrl === 'localhost' ? `ws://${serverUrl}` : `wss://${serverUrl}`;

// Default Figma channel configuration
const DEFAULT_FIGMA_CHANNEL = process.env.FIGMA_DEFAULT_CHANNEL || "figma-mcp-default";

// ============================================================================
// TOOL ORGANIZATION
// ============================================================================
// This MCP server is focused on applying design tokens, variables, and styles
// to Figma nodes. Non-core tools have been commented out but can be easily
// re-enabled if needed. See TOOLS.md for full categorization.
//
// CORE TOOLS (active):
//   - join_channel, get_selection, get_selection_variables
//   - get_variable_collections, get_styles
//   - set_variable_binding, set_text_style, set_effect_style
//
// CONTEXT TOOLS (active):
//   - get_document_info, read_my_design, get_node_info, get_nodes_info
//
// OPTIONAL TOOLS (commented out):
//   - Creation tools (create_rectangle, create_frame, create_text)
//   - Direct property setting (set_fill_color, set_corner_radius, etc.)
//   - Layout manipulation (move_node, resize_node, set_padding, etc.)
//   - Component management (create_component_instance, set_instance_overrides)
//   - Prototyping (get_reactions, create_connections)
//   - Text/content editing (set_text_content, scan_text_nodes)
//   - Annotations (get_annotations, set_annotation)
// ============================================================================

// ============================================================================
// CONTEXT TOOLS - Useful for understanding design system
// ============================================================================

// Document Info Tool
server.tool(
  "get_document_info",
  "Get detailed information about the current Figma document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_document_info");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting document info: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Selection Tool
server.tool(
  "get_selection",
  "Get information about the current selection in Figma",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_selection");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting selection: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Selection Variables Tool
server.tool(
  "get_selection_variables",
  "Get all Figma variables (by ID and name) used by the current selection",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_selection_variables", {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting selection variables: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Export Selection as PNG Tool
server.tool(
  "export_selection_png",
  "Export the current Figma selection as a PNG image. Gets the first selected node and exports it. Optionally saves to notes directory for visual verification.",
  {
    scale: z
      .number()
      .positive()
      .optional()
      .describe("Export scale (default: 1, use 2 for retina/high-DPI)"),
    saveToFile: z
      .boolean()
      .optional()
      .describe("Whether to save the PNG to notes/figma-selection.png (default: true)"),
    filename: z
      .string()
      .optional()
      .describe("Custom filename for saved PNG (default: figma-selection.png)"),
  },
  async ({ scale, saveToFile = true, filename }: any) => {
    try {
      // Get current selection
      const selection = (await sendCommandToFigma("get_selection", {})) as {
        selectionCount: number;
        selection: { id: string; name: string; type: string; visible: boolean }[];
      };

      if (!selection.selectionCount || selection.selection.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No nodes selected in Figma. Please select a node to export.",
            },
          ],
        };
      }

      const firstNode = selection.selection[0];

      // Export the first selected node as PNG
      const result = await sendCommandToFigma("export_node_as_image", {
        nodeId: firstNode.id,
        format: "PNG",
        scale: scale || 1,
      });

      const typedResult = result as {
        nodeId: string;
        format: string;
        scale: number;
        mimeType: string;
        imageData: string; // base64 encoded
      };

      // Optionally save to file
      if (saveToFile) {
        try {
          // Try to find project root by looking for notes directory
          // Start from process.cwd() and go up until we find it, or use a relative path
          let projectRoot = process.cwd();
          let notesDir = path.join(projectRoot, "notes");
          
          // If notes doesn't exist in cwd, try going up a few levels
          if (!fs.existsSync(notesDir)) {
            // Try going up from current working directory
            const possibleRoots = [
              path.resolve(projectRoot, ".."),
              path.resolve(projectRoot, "../.."),
              path.resolve(projectRoot, "../../.."),
            ];
            for (const possibleRoot of possibleRoots) {
              const possibleNotes = path.join(possibleRoot, "notes");
              if (fs.existsSync(possibleNotes)) {
                projectRoot = possibleRoot;
                notesDir = possibleNotes;
                break;
              }
            }
          }
          
          const outputFilename = filename || "figma-selection.png";
          const outputPath = path.join(notesDir, outputFilename);

          // Ensure notes directory exists
          if (!fs.existsSync(notesDir)) {
            fs.mkdirSync(notesDir, { recursive: true });
          }

          // Decode base64 and write to file
          const imageBuffer = Buffer.from(typedResult.imageData, "base64");
          fs.writeFileSync(outputPath, imageBuffer);

          return {
            content: [
              {
                type: "image",
                data: typedResult.imageData,
                mimeType: typedResult.mimeType || "image/png",
              },
              {
                type: "text",
                text: `✅ Exported selection as PNG (scale: ${typedResult.scale})\n📁 Saved to: ${outputPath}\n📦 Node: ${firstNode.name} (${firstNode.type})`,
              },
            ],
          };
        } catch (fileError) {
          // If file save fails, still return the image data
          return {
            content: [
              {
                type: "image",
                data: typedResult.imageData,
                mimeType: typedResult.mimeType || "image/png",
              },
              {
                type: "text",
                text: `✅ Exported selection as PNG (scale: ${typedResult.scale})\n⚠️  Failed to save file: ${fileError instanceof Error ? fileError.message : String(fileError)}\n📦 Node: ${firstNode.name} (${firstNode.type})`,
              },
            ],
          };
        }
      }

      // Return image data without saving
      return {
        content: [
          {
            type: "image",
            data: typedResult.imageData,
            mimeType: typedResult.mimeType || "image/png",
          },
          {
            type: "text",
            text: `✅ Exported selection as PNG (scale: ${typedResult.scale})\n📦 Node: ${firstNode.name} (${firstNode.type})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error exporting selection as PNG: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Describe currently selected component (high-level helper)
server.tool(
  "describe_selection_component",
  "Describe the first selected Figma node as a component, if applicable (uses get_selection + describe_component)",
  {},
  async () => {
    try {
      const selection = (await sendCommandToFigma("get_selection", {})) as {
        selectionCount: number;
        selection: { id: string; name: string; type: string; visible: boolean }[];
      };

      if (!selection.selectionCount || selection.selection.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No nodes selected in Figma. Please select an instance, component, or component set.",
            },
          ],
        };
      }

      const first = selection.selection[0];

      const description = await sendCommandToFigma("describe_component", {
        nodeId: first.id,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              selection: first,
              description,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing selected component: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Generate React component code for the first selected Figma component/instance
server.tool(
  "generate_selection_component_react",
  "Generate a React component skeleton (using design tokens) for the first selected Figma component or instance",
  {
    componentName: z
      .string()
      .optional()
      .describe("Optional explicit React component name (defaults to the Figma component name)"),
  },
  async (args) => {
    try {
      const selection = (await sendCommandToFigma("get_selection", {})) as {
        selectionCount: number;
        selection: { id: string; name: string; type: string; visible: boolean }[];
      };

      if (!selection.selectionCount || selection.selection.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No nodes selected in Figma. Please select an instance, component, or component set.",
            },
          ],
        };
      }

      const first = selection.selection[0];

      const rawDescription = (await sendCommandToFigma("describe_component", {
        nodeId: first.id,
      })) as ComponentDescription;

      // Load token config (now includes cssUrls)
      const tokensConfig = loadTokensConfigFromEnv();

      const tokenized = await mapComponentDescriptionToTokenized(rawDescription, {
        tokensConfig,
      });

      const reactSource = generateReactComponentFromTokenized(tokenized, {
        componentName: args?.componentName,
        tokensConfig, // Pass config so generator can include CSS import hints
      });

      return {
        content: [
          {
            type: "text",
            text: reactSource,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating React component for selected node: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Describe Component Tool
server.tool(
  "describe_component",
  "Describe a Figma component / component set / instance, including variant axes and variable usage",
  {
    nodeId: {
      type: "string",
      description: "ID of the node to describe (instance, component, or component set)",
    },
  },
  async (args) => {
    try {
      const params = {
        nodeId: String(args.nodeId),
      };
      const result = await sendCommandToFigma("describe_component", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing component: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Describe layout-focused view of the first selected component/instance
// This surfaces explicit Auto Layout numbers (layoutMode, padding, spacing, etc.)
// for each node, including nested children, without requiring variables/tokens.
server.tool(
  "describe_selection_layout",
  "Summarize Auto Layout properties (layoutMode, paddings, spacing, alignment) for the first selected component or instance, including nested nodes",
  {},
  async () => {
    try {
      const selection = (await sendCommandToFigma("get_selection", {})) as {
        selectionCount: number;
        selection: { id: string; name: string; type: string; visible: boolean }[];
      };

      if (!selection.selectionCount || selection.selection.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No nodes selected in Figma. Please select an instance, component, or component set.",
            },
          ],
        };
      }

      const first = selection.selection[0];

      const rawDescription = (await sendCommandToFigma("describe_component", {
        nodeId: first.id,
      })) as ComponentDescription;

      function extractLayout(node: any): any {
        const layout: any = {
          id: node.id,
          name: node.name,
          type: node.type,
        };

        if (typeof node.x === "number") layout.x = node.x;
        if (typeof node.y === "number") layout.y = node.y;
        if (typeof node.width === "number") layout.width = node.width;
        if (typeof node.height === "number") layout.height = node.height;

        if (node.layoutMode && node.layoutMode !== "NONE") {
          layout.layoutMode = node.layoutMode;
          if (node.primaryAxisAlignItems)
            layout.primaryAxisAlignItems = node.primaryAxisAlignItems;
          if (node.counterAxisAlignItems)
            layout.counterAxisAlignItems = node.counterAxisAlignItems;
          if (typeof node.paddingLeft === "number")
            layout.paddingLeft = node.paddingLeft;
          if (typeof node.paddingRight === "number")
            layout.paddingRight = node.paddingRight;
          if (typeof node.paddingTop === "number")
            layout.paddingTop = node.paddingTop;
          if (typeof node.paddingBottom === "number")
            layout.paddingBottom = node.paddingBottom;
          if (typeof node.itemSpacing === "number")
            layout.itemSpacing = node.itemSpacing;
          if (typeof node.counterAxisSpacing === "number")
            layout.counterAxisSpacing = node.counterAxisSpacing;
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
          layout.children = node.children.map((child: any) =>
            extractLayout(child)
          );
        }

        return layout;
      }

      const variantsWithLayout = rawDescription.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        props: variant.props,
        layoutTree: variant.structure ? extractLayout(variant.structure) : null,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              selection: first,
              variants: variantsWithLayout,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing selection layout: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Read My Design Tool
server.tool(
  "read_my_design",
  "Get detailed information about the current selection in Figma, including all node details",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("read_my_design", {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting node info: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Node Info Tool
server.tool(
  "get_node_info",
  "Get detailed information about a specific node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to get information about"),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("get_node_info", { nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(filterFigmaNode(result))
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting node info: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

function rgbaToHex(color: any): string {
  // skip if color is already hex
  if (color.startsWith('#')) {
    return color;
  }

  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round(color.a * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a === 255 ? '' : a.toString(16).padStart(2, '0')}`;
}

function filterFigmaNode(node: any) {
  // Skip VECTOR type nodes
  if (node.type === "VECTOR") {
    return null;
  }

  const filtered: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if (node.fills && node.fills.length > 0) {
    filtered.fills = node.fills.map((fill: any) => {
      const processedFill = { ...fill };

      // Remove boundVariables and imageRef
      delete processedFill.boundVariables;
      delete processedFill.imageRef;

      // Process gradientStops if present
      if (processedFill.gradientStops) {
        processedFill.gradientStops = processedFill.gradientStops.map((stop: any) => {
          const processedStop = { ...stop };
          // Convert color to hex if present
          if (processedStop.color) {
            processedStop.color = rgbaToHex(processedStop.color);
          }
          // Remove boundVariables
          delete processedStop.boundVariables;
          return processedStop;
        });
      }

      // Convert solid fill colors to hex
      if (processedFill.color) {
        processedFill.color = rgbaToHex(processedFill.color);
      }

      return processedFill;
    });
  }

  if (node.strokes && node.strokes.length > 0) {
    filtered.strokes = node.strokes.map((stroke: any) => {
      const processedStroke = { ...stroke };
      // Remove boundVariables
      delete processedStroke.boundVariables;
      // Convert color to hex if present
      if (processedStroke.color) {
        processedStroke.color = rgbaToHex(processedStroke.color);
      }
      return processedStroke;
    });
  }

  if (node.cornerRadius !== undefined) {
    filtered.cornerRadius = node.cornerRadius;
  }

  if (node.absoluteBoundingBox) {
    filtered.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  if (node.characters) {
    filtered.characters = node.characters;
  }

  if (node.style) {
    filtered.style = {
      fontFamily: node.style.fontFamily,
      fontStyle: node.style.fontStyle,
      fontWeight: node.style.fontWeight,
      fontSize: node.style.fontSize,
      textAlignHorizontal: node.style.textAlignHorizontal,
      letterSpacing: node.style.letterSpacing,
      lineHeightPx: node.style.lineHeightPx
    };
  }

  if (node.children) {
    filtered.children = node.children
      .map((child: any) => filterFigmaNode(child))
      .filter((child: any) => child !== null); // Remove null children (VECTOR nodes)
  }

  return filtered;
}

// Nodes Info Tool
server.tool(
  "get_nodes_info",
  "Get detailed information about multiple nodes in Figma",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to get information about")
  },
  async ({ nodeIds }: any) => {
    try {
      const results = await Promise.all(
        nodeIds.map(async (nodeId: any) => {
          const result = await sendCommandToFigma('get_node_info', { nodeId });
          return { nodeId, info: result };
        })
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results.map((result) => filterFigmaNode(result.info)))
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting nodes info: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// ============================================================================
// OPTIONAL TOOLS - Commented out (not core to token/variable/style application)
// ============================================================================
// These tools are available but not needed for the primary workflow.
// Uncomment if you need them for advanced use cases.
// See TOOLS.md for full categorization.

/*
// Create Rectangle Tool
server.tool(
  "create_rectangle",
  "Create a new rectangle in Figma",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the rectangle"),
    height: z.number().describe("Height of the rectangle"),
    name: z.string().optional().describe("Optional name for the rectangle"),
    parentId: z
      .string()
      .optional()
      .describe("Optional parent node ID to append the rectangle to"),
  },
  async ({ x, y, width, height, name, parentId }: any) => {
    try {
      const result = await sendCommandToFigma("create_rectangle", {
        x,
        y,
        width,
        height,
        name: name || "Rectangle",
        parentId,
      });
      return {
        content: [
          {
            type: "text",
            text: `Created rectangle "${JSON.stringify(result)}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating rectangle: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Create Frame Tool
server.tool(
  "create_frame",
  "Create a new frame in Figma",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the frame"),
    height: z.number().describe("Height of the frame"),
    name: z.string().optional().describe("Optional name for the frame"),
    parentId: z
      .string()
      .optional()
      .describe("Optional parent node ID to append the frame to"),
    fillColor: z
      .object({
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
        a: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Alpha component (0-1)"),
      })
      .optional()
      .describe("Fill color in RGBA format"),
    strokeColor: z
      .object({
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
        a: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Alpha component (0-1)"),
      })
      .optional()
      .describe("Stroke color in RGBA format"),
    strokeWeight: z.number().positive().optional().describe("Stroke weight"),
    layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).optional().describe("Auto-layout mode for the frame"),
    layoutWrap: z.enum(["NO_WRAP", "WRAP"]).optional().describe("Whether the auto-layout frame wraps its children"),
    paddingTop: z.number().optional().describe("Top padding for auto-layout frame"),
    paddingRight: z.number().optional().describe("Right padding for auto-layout frame"),
    paddingBottom: z.number().optional().describe("Bottom padding for auto-layout frame"),
    paddingLeft: z.number().optional().describe("Left padding for auto-layout frame"),
    primaryAxisAlignItems: z
      .enum(["MIN", "MAX", "CENTER", "SPACE_BETWEEN"])
      .optional()
      .describe("Primary axis alignment for auto-layout frame. Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced."),
    counterAxisAlignItems: z.enum(["MIN", "MAX", "CENTER", "BASELINE"]).optional().describe("Counter axis alignment for auto-layout frame"),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Horizontal sizing mode for auto-layout frame"),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Vertical sizing mode for auto-layout frame"),
    itemSpacing: z
      .number()
      .optional()
      .describe("Distance between children in auto-layout frame. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.")
  },
  async ({
    x,
    y,
    width,
    height,
    name,
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
    layoutMode,
    layoutWrap,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    layoutSizingHorizontal,
    layoutSizingVertical,
    itemSpacing
  }: any) => {
    try {
      const result = await sendCommandToFigma("create_frame", {
        x,
        y,
        width,
        height,
        name: name || "Frame",
        parentId,
        fillColor: fillColor || { r: 1, g: 1, b: 1, a: 1 },
        strokeColor: strokeColor,
        strokeWeight: strokeWeight,
        layoutMode,
        layoutWrap,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        primaryAxisAlignItems,
        counterAxisAlignItems,
        layoutSizingHorizontal,
        layoutSizingVertical,
        itemSpacing
      });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created frame "${typedResult.name}" with ID: ${typedResult.id}. Use the ID as the parentId to appendChild inside this frame.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating frame: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Create Text Tool
server.tool(
  "create_text",
  "Create a new text element in Figma",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    text: z.string().describe("Text content"),
    fontSize: z.number().optional().describe("Font size (default: 14)"),
    fontWeight: z
      .number()
      .optional()
      .describe("Font weight (e.g., 400 for Regular, 700 for Bold)"),
    fontColor: z
      .object({
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
        a: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Alpha component (0-1)"),
      })
      .optional()
      .describe("Font color in RGBA format"),
    name: z
      .string()
      .optional()
      .describe("Semantic layer name for the text node"),
    parentId: z
      .string()
      .optional()
      .describe("Optional parent node ID to append the text to"),
  },
  async ({ x, y, text, fontSize, fontWeight, fontColor, name, parentId }: any) => {
    try {
      const result = await sendCommandToFigma("create_text", {
        x,
        y,
        text,
        fontSize: fontSize || 14,
        fontWeight: fontWeight || 400,
        fontColor: fontColor || { r: 0, g: 0, b: 0, a: 1 },
        name: name || "Text",
        parentId,
      });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created text "${typedResult.name}" with ID: ${typedResult.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating text: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Set Fill Color Tool
server.tool(
  "set_fill_color",
  "Set the fill color of a node in Figma can be TextNode or FrameNode",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    r: z.number().min(0).max(1).describe("Red component (0-1)"),
    g: z.number().min(0).max(1).describe("Green component (0-1)"),
    b: z.number().min(0).max(1).describe("Blue component (0-1)"),
    a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
  },
  async ({ nodeId, r, g, b, a }: any) => {
    try {
      const result = await sendCommandToFigma("set_fill_color", {
        nodeId,
        color: { r, g, b, a: a || 1 },
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set fill color of node "${typedResult.name
              }" to RGBA(${r}, ${g}, ${b}, ${a || 1})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting fill color: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Set Stroke Color Tool
server.tool(
  "set_stroke_color",
  "Set the stroke color of a node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    r: z.number().min(0).max(1).describe("Red component (0-1)"),
    g: z.number().min(0).max(1).describe("Green component (0-1)"),
    b: z.number().min(0).max(1).describe("Blue component (0-1)"),
    a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
    weight: z.number().positive().optional().describe("Stroke weight"),
  },
  async ({ nodeId, r, g, b, a, weight }: any) => {
    try {
      const result = await sendCommandToFigma("set_stroke_color", {
        nodeId,
        color: { r, g, b, a: a || 1 },
        weight: weight || 1,
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set stroke color of node "${typedResult.name
              }" to RGBA(${r}, ${g}, ${b}, ${a || 1}) with weight ${weight || 1}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting stroke color: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Move Node Tool
server.tool(
  "move_node",
  "Move a node to a new position in Figma",
  {
    nodeId: z.string().describe("The ID of the node to move"),
    x: z.number().describe("New X position"),
    y: z.number().describe("New Y position"),
  },
  async ({ nodeId, x, y }: any) => {
    try {
      const result = await sendCommandToFigma("move_node", { nodeId, x, y });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved node "${typedResult.name}" to position (${x}, ${y})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error moving node: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Clone Node Tool
server.tool(
  "clone_node",
  "Clone an existing node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to clone"),
    x: z.number().optional().describe("New X position for the clone"),
    y: z.number().optional().describe("New Y position for the clone")
  },
  async ({ nodeId, x, y }: any) => {
    try {
      const result = await sendCommandToFigma('clone_node', { nodeId, x, y });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Cloned node "${typedResult.name}" with new ID: ${typedResult.id}${x !== undefined && y !== undefined ? ` at position (${x}, ${y})` : ''}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error cloning node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Resize Node Tool
server.tool(
  "resize_node",
  "Resize a node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to resize"),
    width: z.number().positive().describe("New width"),
    height: z.number().positive().describe("New height"),
  },
  async ({ nodeId, width, height }: any) => {
    try {
      const result = await sendCommandToFigma("resize_node", {
        nodeId,
        width,
        height,
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Resized node "${typedResult.name}" to width ${width} and height ${height}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error resizing node: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Delete Node Tool
server.tool(
  "delete_node",
  "Delete a node from Figma",
  {
    nodeId: z.string().describe("The ID of the node to delete"),
  },
  async ({ nodeId }: any) => {
    try {
      await sendCommandToFigma("delete_node", { nodeId });
      return {
        content: [
          {
            type: "text",
            text: `Deleted node with ID: ${nodeId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting node: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Delete Multiple Nodes Tool
server.tool(
  "delete_multiple_nodes",
  "Delete multiple nodes from Figma at once",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to delete"),
  },
  async ({ nodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("delete_multiple_nodes", { nodeIds });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting multiple nodes: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Export Node as Image Tool
server.tool(
  "export_node_as_image",
  "Export a node as an image from Figma",
  {
    nodeId: z.string().describe("The ID of the node to export"),
    format: z
      .enum(["PNG", "JPG", "SVG", "PDF"])
      .optional()
      .describe("Export format"),
    scale: z.number().positive().optional().describe("Export scale"),
  },
  async ({ nodeId, format, scale }: any) => {
    try {
      const result = await sendCommandToFigma("export_node_as_image", {
        nodeId,
        format: format || "PNG",
        scale: scale || 1,
      });
      const typedResult = result as { imageData: string; mimeType: string };

      return {
        content: [
          {
            type: "image",
            data: typedResult.imageData,
            mimeType: typedResult.mimeType || "image/png",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error exporting node as image: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Set Text Content Tool
server.tool(
  "set_text_content",
  "Set the text content of an existing text node in Figma",
  {
    nodeId: z.string().describe("The ID of the text node to modify"),
    text: z.string().describe("New text content"),
  },
  async ({ nodeId, text }: any) => {
    try {
      const result = await sendCommandToFigma("set_text_content", {
        nodeId,
        text,
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Updated text content of node "${typedResult.name}" to "${text}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting text content: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);
*/

// ============================================================================
// CORE TOOLS - Essential for token/variable/style application (continued)
// ============================================================================

// Get Styles Tool
server.tool(
  "get_styles",
  "Get all styles from the current Figma document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_styles");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting styles: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Get Local Components Tool
server.tool(
  "get_local_components",
  "Get all local components from the Figma document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_local_components");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting local components: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Get Annotations Tool (COMMENTED OUT - not needed for token/variable/style application)
/*
server.tool(
  "get_annotations",
  "Get all annotations in the current document or specific node",
  {
    nodeId: z.string().describe("node ID to get annotations for specific node"),
    includeCategories: z.boolean().optional().default(true).describe("Whether to include category information")
  },
  async ({ nodeId, includeCategories }: any) => {
    try {
      const result = await sendCommandToFigma("get_annotations", {
        nodeId,
        includeCategories
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting annotations: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Annotation Tool
server.tool(
  "set_annotation",
  "Create or update an annotation",
  {
    nodeId: z.string().describe("The ID of the node to annotate"),
    annotationId: z.string().optional().describe("The ID of the annotation to update (if updating existing annotation)"),
    labelMarkdown: z.string().describe("The annotation text in markdown format"),
    categoryId: z.string().optional().describe("The ID of the annotation category"),
    properties: z.array(z.object({
      type: z.string()
    })).optional().describe("Additional properties for the annotation")
  },
  async ({ nodeId, annotationId, labelMarkdown, categoryId, properties }: any) => {
    try {
      const result = await sendCommandToFigma("set_annotation", {
        nodeId,
        annotationId,
        labelMarkdown,
        categoryId,
        properties
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting annotation: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Multiple Annotations Tool
server.tool(
  "set_multiple_annotations",
  "Set multiple annotations parallelly in a node",
  {
    nodeId: z
      .string()
      .describe("The ID of the node containing the elements to annotate"),
    annotations: z
      .array(
        z.object({
          nodeId: z.string().describe("The ID of the node to annotate"),
          labelMarkdown: z.string().describe("The annotation text in markdown format"),
          categoryId: z.string().optional().describe("The ID of the annotation category"),
          annotationId: z.string().optional().describe("The ID of the annotation to update (if updating existing annotation)"),
          properties: z.array(z.object({
            type: z.string()
          })).optional().describe("Additional properties for the annotation")
        })
      )
      .describe("Array of annotations to apply"),
  },
  async ({ nodeId, annotations }: any) => {
    try {
      if (!annotations || annotations.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No annotations provided",
            },
          ],
        };
      }

      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: `Starting annotation process for ${annotations.length} nodes. This will be processed in batches of 5...`,
      };

      // Track overall progress
      let totalProcessed = 0;
      const totalToProcess = annotations.length;

      // Use the plugin's set_multiple_annotations function with chunking
      const result = await sendCommandToFigma("set_multiple_annotations", {
        nodeId,
        annotations,
      });

      // Cast the result to a specific type to work with it safely
      interface AnnotationResult {
        success: boolean;
        nodeId: string;
        annotationsApplied?: number;
        annotationsFailed?: number;
        totalAnnotations?: number;
        completedInChunks?: number;
        results?: Array<{
          success: boolean;
          nodeId: string;
          error?: string;
          annotationId?: string;
        }>;
      }

      const typedResult = result as AnnotationResult;

      // Format the results for display
      const success = typedResult.annotationsApplied && typedResult.annotationsApplied > 0;
      const progressText = `
      Annotation process completed:
      - ${typedResult.annotationsApplied || 0} of ${totalToProcess} successfully applied
      - ${typedResult.annotationsFailed || 0} failed
      - Processed in ${typedResult.completedInChunks || 1} batches
      `;

      // Detailed results
      const detailedResults = typedResult.results || [];
      const failedResults = detailedResults.filter(item => !item.success);

      // Create the detailed part of the response
      let detailedResponse = "";
      if (failedResults.length > 0) {
        detailedResponse = `\n\nNodes that failed:\n${failedResults.map(item =>
          `- ${item.nodeId}: ${item.error || "Unknown error"}`
        ).join('\n')}`;
      }

      return {
        content: [
          initialStatus,
          {
            type: "text" as const,
            text: progressText + detailedResponse,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting multiple annotations: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);
*/

// Interface needed for type definitions (keep outside comment block)
interface SetMultipleAnnotationsParams {
  nodeId: string;
  annotations: Array<{
    nodeId: string;
    labelMarkdown: string;
    categoryId?: string;
    annotationId?: string;
    properties?: Array<{ type: string }>;
  }>;
}

// ============================================================================
// OPTIONAL TOOLS - Commented out (continued)
// ============================================================================

/*
// Create Component Instance Tool
server.tool(
  "create_component_instance",
  "Create an instance of a component in Figma",
  {
    componentKey: z.string().describe("Key of the component to instantiate"),
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
  },
  async ({ componentKey, x, y }: any) => {
    try {
      const result = await sendCommandToFigma("create_component_instance", {
        componentKey,
        x,
        y,
      });
      const typedResult = result as any;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(typedResult),
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating component instance: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Copy Instance Overrides Tool
server.tool(
  "get_instance_overrides",
  "Get all override properties from a selected component instance. These overrides can be applied to other instances, which will swap them to match the source component.",
  {
    nodeId: z.string().optional().describe("Optional ID of the component instance to get overrides from. If not provided, currently selected instance will be used."),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("get_instance_overrides", {
        instanceNodeId: nodeId || null
      });
      const typedResult = result as getInstanceOverridesResult;

      return {
        content: [
          {
            type: "text",
            text: typedResult.success
              ? `Successfully got instance overrides: ${typedResult.message}`
              : `Failed to get instance overrides: ${typedResult.message}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error copying instance overrides: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Instance Overrides Tool
server.tool(
  "set_instance_overrides",
  "Apply previously copied overrides to selected component instances. Target instances will be swapped to the source component and all copied override properties will be applied.",
  {
    sourceInstanceId: z.string().describe("ID of the source component instance"),
    targetNodeIds: z.array(z.string()).describe("Array of target instance IDs. Currently selected instances will be used.")
  },
  async ({ sourceInstanceId, targetNodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("set_instance_overrides", {
        sourceInstanceId: sourceInstanceId,
        targetNodeIds: targetNodeIds || []
      });
      const typedResult = result as setInstanceOverridesResult;

      if (typedResult.success) {
        const successCount = typedResult.results?.filter(r => r.success).length || 0;
        return {
          content: [
            {
              type: "text",
              text: `Successfully applied ${typedResult.totalCount || 0} overrides to ${successCount} instances.`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to set instance overrides: ${typedResult.message}`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting instance overrides: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);


// Set Corner Radius Tool
server.tool(
  "set_corner_radius",
  "Set the corner radius of a node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    radius: z.number().min(0).describe("Corner radius value"),
    corners: z
      .array(z.boolean())
      .length(4)
      .optional()
      .describe(
        "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]"
      ),
  },
  async ({ nodeId, radius, corners }: any) => {
    try {
      const result = await sendCommandToFigma("set_corner_radius", {
        nodeId,
        radius,
        corners: corners || [true, true, true, true],
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set corner radius of node "${typedResult.name}" to ${radius}px`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting corner radius: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Define design strategy prompt
server.prompt(
  "design_strategy",
  "Best practices for working with Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When working with Figma designs, follow these best practices:

1. Start with Document Structure:
   - First use get_document_info() to understand the current document
   - Plan your layout hierarchy before creating elements
   - Create a main container frame for each screen/section

2. Naming Conventions:
   - Use descriptive, semantic names for all elements
   - Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
   - Group related elements with meaningful names

3. Layout Hierarchy:
   - Create parent frames first, then add child elements
   - For forms/login screens:
     * Start with the main screen container frame
     * Create a logo container at the top
     * Group input fields in their own containers
     * Place action buttons (login, submit) after inputs
     * Add secondary elements (forgot password, signup links) last

4. Input Fields Structure:
   - Create a container frame for each input field
   - Include a label text above or inside the input
   - Group related inputs (e.g., username/password) together

5. Element Creation:
   - Use create_frame() for containers and input fields
   - Use create_text() for labels, buttons text, and links
   - Set appropriate colors and styles:
     * Use fillColor for backgrounds
     * Use strokeColor for borders
     * Set proper fontWeight for different text elements

6. Mofifying existing elements:
  - use set_text_content() to modify text content.

7. Visual Hierarchy:
   - Position elements in logical reading order (top to bottom)
   - Maintain consistent spacing between elements
   - Use appropriate font sizes for different text types:
     * Larger for headings/welcome text
     * Medium for input labels
     * Standard for button text
     * Smaller for helper text/links

8. Best Practices:
   - Verify each creation with get_node_info()
   - Use parentId to maintain proper hierarchy
   - Group related elements together in frames
   - Keep consistent spacing and alignment

Example Login Screen Structure:
- Login Screen (main frame)
  - Logo Container (frame)
    - Logo (image/text)
  - Welcome Text (text)
  - Input Container (frame)
    - Email Input (frame)
      - Email Label (text)
      - Email Field (frame)
    - Password Input (frame)
      - Password Label (text)
      - Password Field (frame)
  - Login Button (frame)
    - Button Text (text)
  - Helper Links (frame)
    - Forgot Password (text)
    - Don't have account (text)`,
          },
        },
      ],
      description: "Best practices for working with Figma designs",
    };
  }
);

server.prompt(
  "read_design_strategy",
  "Best practices for reading Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When reading Figma designs, follow these best practices:

1. Start with selection:
   - First use read_my_design() to understand the current selection
   - If no selection ask user to select single or multiple nodes
`,
          },
        },
      ],
      description: "Best practices for reading Figma designs",
    };
  }
);

// Text Node Scanning Tool
server.tool(
  "scan_text_nodes",
  "Scan all text nodes in the selected Figma node",
  {
    nodeId: z.string().describe("ID of the node to scan"),
  },
  async ({ nodeId }: any) => {
    try {
      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: "Starting text node scanning. This may take a moment for large designs...",
      };

      // Use the plugin's scan_text_nodes function with chunking flag
      const result = await sendCommandToFigma("scan_text_nodes", {
        nodeId,
        useChunking: true,  // Enable chunking on the plugin side
        chunkSize: 10       // Process 10 nodes at a time
      });

      // If the result indicates chunking was used, format the response accordingly
      if (result && typeof result === 'object' && 'chunks' in result) {
        const typedResult = result as {
          success: boolean,
          totalNodes: number,
          processedNodes: number,
          chunks: number,
          textNodes: Array<any>
        };

        const summaryText = `
        Scan completed:
        - Found ${typedResult.totalNodes} text nodes
        - Processed in ${typedResult.chunks} chunks
        `;

        return {
          content: [
            initialStatus,
            {
              type: "text" as const,
              text: summaryText
            },
            {
              type: "text" as const,
              text: JSON.stringify(typedResult.textNodes, null, 2)
            }
          ],
        };
      }

      // If chunking wasn't used or wasn't reported in the result format, return the result as is
      return {
        content: [
          initialStatus,
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error scanning text nodes: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Node Type Scanning Tool
server.tool(
  "scan_nodes_by_types",
  "Scan for child nodes with specific types in the selected Figma node",
  {
    nodeId: z.string().describe("ID of the node to scan"),
    types: z.array(z.string()).describe("Array of node types to find in the child nodes (e.g. ['COMPONENT', 'FRAME'])")
  },
  async ({ nodeId, types }: any) => {
    try {
      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: `Starting node type scanning for types: ${types.join(', ')}...`,
      };

      // Use the plugin's scan_nodes_by_types function
      const result = await sendCommandToFigma("scan_nodes_by_types", {
        nodeId,
        types
      });

      // Format the response
      if (result && typeof result === 'object' && 'matchingNodes' in result) {
        const typedResult = result as {
          success: boolean,
          count: number,
          matchingNodes: Array<{
            id: string,
            name: string,
            type: string,
            bbox: {
              x: number,
              y: number,
              width: number,
              height: number
            }
          }>,
          searchedTypes: Array<string>
        };

        const summaryText = `Scan completed: Found ${typedResult.count} nodes matching types: ${typedResult.searchedTypes.join(', ')}`;

        return {
          content: [
            initialStatus,
            {
              type: "text" as const,
              text: summaryText
            },
            {
              type: "text" as const,
              text: JSON.stringify(typedResult.matchingNodes, null, 2)
            }
          ],
        };
      }

      // If the result is in an unexpected format, return it as is
      return {
        content: [
          initialStatus,
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error scanning nodes by types: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Text Replacement Strategy Prompt
server.prompt(
  "text_replacement_strategy",
  "Systematic approach for replacing text in Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Intelligent Text Replacement Strategy

## 1. Analyze Design & Identify Structure
- Scan text nodes to understand the overall structure of the design
- Use AI pattern recognition to identify logical groupings:
  * Tables (rows, columns, headers, cells)
  * Lists (items, headers, nested lists)
  * Card groups (similar cards with recurring text fields)
  * Forms (labels, input fields, validation text)
  * Navigation (menu items, breadcrumbs)
\`\`\`
scan_text_nodes(nodeId: "node-id")
get_node_info(nodeId: "node-id")  // optional
\`\`\`

## 2. Strategic Chunking for Complex Designs
- Divide replacement tasks into logical content chunks based on design structure
- Use one of these chunking strategies that best fits the design:
  * **Structural Chunking**: Table rows/columns, list sections, card groups
  * **Spatial Chunking**: Top-to-bottom, left-to-right in screen areas
  * **Semantic Chunking**: Content related to the same topic or functionality
  * **Component-Based Chunking**: Process similar component instances together

## 3. Progressive Replacement with Verification
- Create a safe copy of the node for text replacement
- Replace text chunk by chunk with continuous progress updates
- After each chunk is processed:
  * Export that section as a small, manageable image
  * Verify text fits properly and maintain design integrity
  * Fix issues before proceeding to the next chunk

\`\`\`
// Clone the node to create a safe copy
clone_node(nodeId: "selected-node-id", x: [new-x], y: [new-y])

// Replace text chunk by chunk
set_multiple_text_contents(
  nodeId: "parent-node-id", 
  text: [
    { nodeId: "node-id-1", text: "New text 1" },
    // More nodes in this chunk...
  ]
)

// Verify chunk with small, targeted image exports
export_node_as_image(nodeId: "chunk-node-id", format: "PNG", scale: 0.5)
\`\`\`

## 4. Intelligent Handling for Table Data
- For tabular content:
  * Process one row or column at a time
  * Maintain alignment and spacing between cells
  * Consider conditional formatting based on cell content
  * Preserve header/data relationships

## 5. Smart Text Adaptation
- Adaptively handle text based on container constraints:
  * Auto-detect space constraints and adjust text length
  * Apply line breaks at appropriate linguistic points
  * Maintain text hierarchy and emphasis
  * Consider font scaling for critical content that must fit

## 6. Progressive Feedback Loop
- Establish a continuous feedback loop during replacement:
  * Real-time progress updates (0-100%)
  * Small image exports after each chunk for verification
  * Issues identified early and resolved incrementally
  * Quick adjustments applied to subsequent chunks

## 7. Final Verification & Context-Aware QA
- After all chunks are processed:
  * Export the entire design at reduced scale for final verification
  * Check for cross-chunk consistency issues
  * Verify proper text flow between different sections
  * Ensure design harmony across the full composition

## 8. Chunk-Specific Export Scale Guidelines
- Scale exports appropriately based on chunk size:
  * Small chunks (1-5 elements): scale 1.0
  * Medium chunks (6-20 elements): scale 0.7
  * Large chunks (21-50 elements): scale 0.5
  * Very large chunks (50+ elements): scale 0.3
  * Full design verification: scale 0.2

## Sample Chunking Strategy for Common Design Types

### Tables
- Process by logical rows (5-10 rows per chunk)
- Alternative: Process by column for columnar analysis
- Tip: Always include header row in first chunk for reference

### Card Lists
- Group 3-5 similar cards per chunk
- Process entire cards to maintain internal consistency
- Verify text-to-image ratio within cards after each chunk

### Forms
- Group related fields (e.g., "Personal Information", "Payment Details")
- Process labels and input fields together
- Ensure validation messages and hints are updated with their fields

### Navigation & Menus
- Process hierarchical levels together (main menu, submenu)
- Respect information architecture relationships
- Verify menu fit and alignment after replacement

## Best Practices
- **Preserve Design Intent**: Always prioritize design integrity
- **Structural Consistency**: Maintain alignment, spacing, and hierarchy
- **Visual Feedback**: Verify each chunk visually before proceeding
- **Incremental Improvement**: Learn from each chunk to improve subsequent ones
- **Balance Automation & Control**: Let AI handle repetitive replacements but maintain oversight
- **Respect Content Relationships**: Keep related content consistent across chunks

Remember that text is never just text—it's a core design element that must work harmoniously with the overall composition. This chunk-based strategy allows you to methodically transform text while maintaining design integrity.`,
          },
        },
      ],
      description: "Systematic approach for replacing text in Figma designs",
    };
  }
);

// Set Multiple Text Contents Tool
server.tool(
  "set_multiple_text_contents",
  "Set multiple text contents parallelly in a node",
  {
    nodeId: z
      .string()
      .describe("The ID of the node containing the text nodes to replace"),
    text: z
      .array(
        z.object({
          nodeId: z.string().describe("The ID of the text node"),
          text: z.string().describe("The replacement text"),
        })
      )
      .describe("Array of text node IDs and their replacement texts"),
  },
  async ({ nodeId, text }: any) => {
    try {
      if (!text || text.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No text provided",
            },
          ],
        };
      }

      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: `Starting text replacement for ${text.length} nodes. This will be processed in batches of 5...`,
      };

      // Track overall progress
      let totalProcessed = 0;
      const totalToProcess = text.length;

      // Use the plugin's set_multiple_text_contents function with chunking
      const result = await sendCommandToFigma("set_multiple_text_contents", {
        nodeId,
        text,
      });

      // Cast the result to a specific type to work with it safely
      interface TextReplaceResult {
        success: boolean;
        nodeId: string;
        replacementsApplied?: number;
        replacementsFailed?: number;
        totalReplacements?: number;
        completedInChunks?: number;
        results?: Array<{
          success: boolean;
          nodeId: string;
          error?: string;
          originalText?: string;
          translatedText?: string;
        }>;
      }

      const typedResult = result as TextReplaceResult;

      // Format the results for display
      const success = typedResult.replacementsApplied && typedResult.replacementsApplied > 0;
      const progressText = `
      Text replacement completed:
      - ${typedResult.replacementsApplied || 0} of ${totalToProcess} successfully updated
      - ${typedResult.replacementsFailed || 0} failed
      - Processed in ${typedResult.completedInChunks || 1} batches
      `;

      // Detailed results
      const detailedResults = typedResult.results || [];
      const failedResults = detailedResults.filter(item => !item.success);

      // Create the detailed part of the response
      let detailedResponse = "";
      if (failedResults.length > 0) {
        detailedResponse = `\n\nNodes that failed:\n${failedResults.map(item =>
          `- ${item.nodeId}: ${item.error || "Unknown error"}`
        ).join('\n')}`;
      }

      return {
        content: [
          initialStatus,
          {
            type: "text" as const,
            text: progressText + detailedResponse,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting multiple text contents: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Annotation Conversion Strategy Prompt
server.prompt(
  "annotation_conversion_strategy",
  "Strategy for converting manual annotations to Figma's native annotations",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Automatic Annotation Conversion
            
## Process Overview

The process of converting manual annotations (numbered/alphabetical indicators with connected descriptions) to Figma's native annotations:

1. Get selected frame/component information
2. Scan and collect all annotation text nodes
3. Scan target UI elements (components, instances, frames)
4. Match annotations to appropriate UI elements
5. Apply native Figma annotations

## Step 1: Get Selection and Initial Setup

First, get the selected frame or component that contains annotations:

\`\`\`typescript
// Get the selected frame/component
const selection = await get_selection();
const selectedNodeId = selection[0].id

// Get available annotation categories for later use
const annotationData = await get_annotations({
  nodeId: selectedNodeId,
  includeCategories: true
});
const categories = annotationData.categories;
\`\`\`

## Step 2: Scan Annotation Text Nodes

Scan all text nodes to identify annotations and their descriptions:

\`\`\`typescript
// Get all text nodes in the selection
const textNodes = await scan_text_nodes({
  nodeId: selectedNodeId
});

// Filter and group annotation markers and descriptions

// Markers typically have these characteristics:
// - Short text content (usually single digit/letter)
// - Specific font styles (often bold)
// - Located in a container with "Marker" or "Dot" in the name
// - Have a clear naming pattern (e.g., "1", "2", "3" or "A", "B", "C")


// Identify description nodes
// Usually longer text nodes near markers or with matching numbers in path
  
\`\`\`

## Step 3: Scan Target UI Elements

Get all potential target elements that annotations might refer to:

\`\`\`typescript
// Scan for all UI elements that could be annotation targets
const targetNodes = await scan_nodes_by_types({
  nodeId: selectedNodeId,
  types: [
    "COMPONENT",
    "INSTANCE",
    "FRAME"
  ]
});
\`\`\`

## Step 4: Match Annotations to Targets

Match each annotation to its target UI element using these strategies in order of priority:

1. **Path-Based Matching**:
   - Look at the marker's parent container name in the Figma layer hierarchy
   - Remove any "Marker:" or "Annotation:" prefixes from the parent name
   - Find UI elements that share the same parent name or have it in their path
   - This works well when markers are grouped with their target elements

2. **Name-Based Matching**:
   - Extract key terms from the annotation description
   - Look for UI elements whose names contain these key terms
   - Consider both exact matches and semantic similarities
   - Particularly effective for form fields, buttons, and labeled components

3. **Proximity-Based Matching** (fallback):
   - Calculate the center point of the marker
   - Find the closest UI element by measuring distances to element centers
   - Consider the marker's position relative to nearby elements
   - Use this method when other matching strategies fail

Additional Matching Considerations:
- Give higher priority to matches found through path-based matching
- Consider the type of UI element when evaluating matches
- Take into account the annotation's context and content
- Use a combination of strategies for more accurate matching

## Step 5: Apply Native Annotations

Convert matched annotations to Figma's native annotations using batch processing:

\`\`\`typescript
// Prepare annotations array for batch processing
const annotationsToApply = Object.values(annotations).map(({ marker, description }) => {
  // Find target using multiple strategies
  const target = 
    findTargetByPath(marker, targetNodes) ||
    findTargetByName(description, targetNodes) ||
    findTargetByProximity(marker, targetNodes);
  
  if (target) {
    // Determine appropriate category based on content
    const category = determineCategory(description.characters, categories);

    // Determine appropriate additional annotationProperty based on content
    const annotationProperty = determineProperties(description.characters, target.type);
    
    return {
      nodeId: target.id,
      labelMarkdown: description.characters,
      categoryId: category.id,
      properties: annotationProperty
    };
  }
  return null;
}).filter(Boolean); // Remove null entries

// Apply annotations in batches using set_multiple_annotations
if (annotationsToApply.length > 0) {
  await set_multiple_annotations({
    nodeId: selectedNodeId,
    annotations: annotationsToApply
  });
}
\`\`\`


This strategy focuses on practical implementation based on real-world usage patterns, emphasizing the importance of handling various UI elements as annotation targets, not just text nodes.`
          },
        },
      ],
      description: "Strategy for converting manual annotations to Figma's native annotations",
    };
  }
);

// Instance Slot Filling Strategy Prompt
server.prompt(
  "swap_overrides_instances",
  "Guide to swap instance overrides between instances",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Swap Component Instance and Override Strategy

## Overview
This strategy enables transferring content and property overrides from a source instance to one or more target instances in Figma, maintaining design consistency while reducing manual work.

## Step-by-Step Process

### 1. Selection Analysis
- Use \`get_selection()\` to identify the parent component or selected instances
- For parent components, scan for instances with \`scan_nodes_by_types({ nodeId: "parent-id", types: ["INSTANCE"] })\`
- Identify custom slots by name patterns (e.g. "Custom Slot*" or "Instance Slot") or by examining text content
- Determine which is the source instance (with content to copy) and which are targets (where to apply content)

### 2. Extract Source Overrides
- Use \`get_instance_overrides()\` to extract customizations from the source instance
- This captures text content, property values, and style overrides
- Command syntax: \`get_instance_overrides({ nodeId: "source-instance-id" })\`
- Look for successful response like "Got component information from [instance name]"

### 3. Apply Overrides to Targets
- Apply captured overrides using \`set_instance_overrides()\`
- Command syntax:
  \`\`\`
  set_instance_overrides({
    sourceInstanceId: "source-instance-id", 
    targetNodeIds: ["target-id-1", "target-id-2", ...]
  })
  \`\`\`

### 4. Verification
- Verify results with \`get_node_info()\` or \`read_my_design()\`
- Confirm text content and style overrides have transferred successfully

## Key Tips
- Always join the appropriate channel first with \`join_channel()\`
- When working with multiple targets, check the full selection with \`get_selection()\`
- Preserve component relationships by using instance overrides rather than direct text manipulation`,
          },
        },
      ],
      description: "Strategy for transferring overrides between component instances in Figma",
    };
  }
);

// Set Layout Mode Tool
server.tool(
  "set_layout_mode",
  "Set the layout mode and wrap behavior of a frame in Figma",
  {
    nodeId: z.string().describe("The ID of the frame to modify"),
    layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).describe("Layout mode for the frame"),
    layoutWrap: z.enum(["NO_WRAP", "WRAP"]).optional().describe("Whether the auto-layout frame wraps its children")
  },
  async ({ nodeId, layoutMode, layoutWrap }: any) => {
    try {
      const result = await sendCommandToFigma("set_layout_mode", {
        nodeId,
        layoutMode,
        layoutWrap: layoutWrap || "NO_WRAP"
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set layout mode of frame "${typedResult.name}" to ${layoutMode}${layoutWrap ? ` with ${layoutWrap}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting layout mode: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Set Padding Tool
server.tool(
  "set_padding",
  "Set padding values for an auto-layout frame in Figma",
  {
    nodeId: z.string().describe("The ID of the frame to modify"),
    paddingTop: z.number().optional().describe("Top padding value"),
    paddingRight: z.number().optional().describe("Right padding value"),
    paddingBottom: z.number().optional().describe("Bottom padding value"),
    paddingLeft: z.number().optional().describe("Left padding value"),
  },
  async ({ nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft }: any) => {
    try {
      const result = await sendCommandToFigma("set_padding", {
        nodeId,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
      });
      const typedResult = result as { name: string };

      // Create a message about which padding values were set
      const paddingMessages = [];
      if (paddingTop !== undefined) paddingMessages.push(`top: ${paddingTop}`);
      if (paddingRight !== undefined) paddingMessages.push(`right: ${paddingRight}`);
      if (paddingBottom !== undefined) paddingMessages.push(`bottom: ${paddingBottom}`);
      if (paddingLeft !== undefined) paddingMessages.push(`left: ${paddingLeft}`);

      const paddingText = paddingMessages.length > 0
        ? `padding (${paddingMessages.join(', ')})`
        : "padding";

      return {
        content: [
          {
            type: "text",
            text: `Set ${paddingText} for frame "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting padding: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Set Axis Align Tool
server.tool(
  "set_axis_align",
  "Set primary and counter axis alignment for an auto-layout frame in Figma",
  {
    nodeId: z.string().describe("The ID of the frame to modify"),
    primaryAxisAlignItems: z
      .enum(["MIN", "MAX", "CENTER", "SPACE_BETWEEN"])
      .optional()
      .describe("Primary axis alignment (MIN/MAX = left/right in horizontal, top/bottom in vertical). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced."),
    counterAxisAlignItems: z
      .enum(["MIN", "MAX", "CENTER", "BASELINE"])
      .optional()
      .describe("Counter axis alignment (MIN/MAX = top/bottom in horizontal, left/right in vertical)")
  },
  async ({ nodeId, primaryAxisAlignItems, counterAxisAlignItems }: any) => {
    try {
      const result = await sendCommandToFigma("set_axis_align", {
        nodeId,
        primaryAxisAlignItems,
        counterAxisAlignItems
      });
      const typedResult = result as { name: string };

      // Create a message about which alignments were set
      const alignMessages = [];
      if (primaryAxisAlignItems !== undefined) alignMessages.push(`primary: ${primaryAxisAlignItems}`);
      if (counterAxisAlignItems !== undefined) alignMessages.push(`counter: ${counterAxisAlignItems}`);

      const alignText = alignMessages.length > 0
        ? `axis alignment (${alignMessages.join(', ')})`
        : "axis alignment";

      return {
        content: [
          {
            type: "text",
            text: `Set ${alignText} for frame "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting axis alignment: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Set Layout Sizing Tool
server.tool(
  "set_layout_sizing",
  "Set horizontal and vertical sizing modes for an auto-layout frame in Figma",
  {
    nodeId: z.string().describe("The ID of the frame to modify"),
    layoutSizingHorizontal: z
      .enum(["FIXED", "HUG", "FILL"])
      .optional()
      .describe("Horizontal sizing mode (HUG for frames/text only, FILL for auto-layout children only)"),
    layoutSizingVertical: z
      .enum(["FIXED", "HUG", "FILL"])
      .optional()
      .describe("Vertical sizing mode (HUG for frames/text only, FILL for auto-layout children only)")
  },
  async ({ nodeId, layoutSizingHorizontal, layoutSizingVertical }: any) => {
    try {
      const result = await sendCommandToFigma("set_layout_sizing", {
        nodeId,
        layoutSizingHorizontal,
        layoutSizingVertical
      });
      const typedResult = result as { name: string };

      // Create a message about which sizing modes were set
      const sizingMessages = [];
      if (layoutSizingHorizontal !== undefined) sizingMessages.push(`horizontal: ${layoutSizingHorizontal}`);
      if (layoutSizingVertical !== undefined) sizingMessages.push(`vertical: ${layoutSizingVertical}`);

      const sizingText = sizingMessages.length > 0
        ? `layout sizing (${sizingMessages.join(', ')})`
        : "layout sizing";

      return {
        content: [
          {
            type: "text",
            text: `Set ${sizingText} for frame "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting layout sizing: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Set Item Spacing Tool
server.tool(
  "set_item_spacing",
  "Set distance between children in an auto-layout frame",
  {
    nodeId: z.string().describe("The ID of the frame to modify"),
    itemSpacing: z.number().optional().describe("Distance between children. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN."),
    counterAxisSpacing: z.number().optional().describe("Distance between wrapped rows/columns. Only works when layoutWrap is set to WRAP.")
  },
  async ({ nodeId, itemSpacing, counterAxisSpacing}: any) => {
    try {
      const params: any = { nodeId };
      if (itemSpacing !== undefined) params.itemSpacing = itemSpacing;
      if (counterAxisSpacing !== undefined) params.counterAxisSpacing = counterAxisSpacing;
      
      const result = await sendCommandToFigma("set_item_spacing", params);
      const typedResult = result as { name: string, itemSpacing?: number, counterAxisSpacing?: number };

      let message = `Updated spacing for frame "${typedResult.name}":`;
      if (itemSpacing !== undefined) message += ` itemSpacing=${itemSpacing}`;
      if (counterAxisSpacing !== undefined) message += ` counterAxisSpacing=${counterAxisSpacing}`;

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting spacing: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);
*/

// ============================================================================
// OPTIONAL TOOLS - Commented out (prototyping & connections)
// ============================================================================

/*
// A tool to get Figma Prototyping Reactions from multiple nodes
server.tool(
  "get_reactions",
  "Get Figma Prototyping Reactions from multiple nodes. CRITICAL: The output MUST be processed using the 'reaction_to_connector_strategy' prompt IMMEDIATELY to generate parameters for connector lines via the 'create_connections' tool.",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to get reactions from"),
  },
  async ({ nodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("get_reactions", { nodeIds });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          },
          {
            type: "text",
            text: "IMPORTANT: You MUST now use the reaction data above and follow the `reaction_to_connector_strategy` prompt to prepare the parameters for the `create_connections` tool call. This is a required next step."
          }
        ],
        followUp: {
          type: "prompt",
          prompt: "reaction_to_connector_strategy",
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting reactions: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Create Connectors Tool
server.tool(
  "set_default_connector",
  "Set a copied connector node as the default connector",
  {
    connectorId: z.string().optional().describe("The ID of the connector node to set as default")
  },
  async ({ connectorId }: any) => {
    try {
      const result = await sendCommandToFigma("set_default_connector", {
        connectorId
      });

      return {
        content: [
          {
            type: "text",
            text: `Default connector set: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting default connector: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// ============================================================================
// OPTIONAL TOOLS - Commented out (prototyping & connections)
// ============================================================================

/*
// Set Variable Binding Tool
server.tool(
  "set_variable_binding",
  "Bind an existing Figma variable to a property on a node. Supported properties: Colors: 'fills', 'strokes' (bind color variables to paint colors). Layout & Sizing: 'width', 'height', 'cornerRadius', 'opacity'. Text: 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'lineHeight' (text nodes only). Auto-layout Padding: 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft' (auto-layout frames only). Auto-layout Spacing: 'itemSpacing' (space between children), 'counterAxisSpacing' (space between wrapped rows/columns, requires layoutWrap='WRAP'). You can provide either a variableId, or a variableName (optionally with collectionId).",
  {
    nodeId: z.string().describe("The ID of the node to bind the variable to"),
    propertyName: z
      .string()
      .describe("The property name to bind. Colors: 'fills', 'strokes'. Layout: 'width', 'height', 'cornerRadius', 'opacity'. Text: 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'lineHeight'. Auto-layout Padding: 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'. Auto-layout Spacing: 'itemSpacing', 'counterAxisSpacing'."),
    variableId: z
      .string()
      .optional()
      .describe("The ID of the Figma variable to bind. Optional if variableName is provided."),
    variableName: z
      .string()
      .optional()
      .describe("The name of the Figma variable to bind (e.g. 'color/surface/action/accent/default')."),
    collectionId: z
      .string()
      .optional()
      .describe("Optional Figma collection ID (VariableCollectionId:...) to disambiguate variableName lookups."),
  },
  async ({ nodeId, propertyName, variableId, variableName, collectionId }: any) => {
    try {
      const result = await sendCommandToFigma("set_variable_binding", {
        nodeId,
        propertyName,
        variableId,
        variableName,
        collectionId,
      });
      const typedResult = result as {
        success: boolean;
        nodeId: string;
        propertyName: string;
        variableId: string;
        variableName: string;
        collectionId?: string;
      };

      if (!typedResult || !typedResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to bind variable ${
                variableId || variableName || "<?>"
              } to ${propertyName} on node ${nodeId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Bound variable "${typedResult.variableName}" (${typedResult.variableId}) to property "${typedResult.propertyName}" on node ${typedResult.nodeId}${
              typedResult.collectionId ? ` in collection ${typedResult.collectionId}` : ""
            }`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting variable binding: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Auto-apply Tokens Tool (Reverse Tokenization)
server.tool(
  "auto_apply_tokens",
  "Automatically match and apply design tokens to a component that has no variables applied. Fetches actual values from Figma, matches them to the closest tokens based on value similarity and component description, then applies those tokens. This is useful for tokenizing existing components.",
  {
    componentDescription: z
      .string()
      .optional()
      .describe("Optional description of the component to help with semantic token matching (e.g. 'primary button', 'card container')"),
    nodeId: z
      .string()
      .optional()
      .describe("Optional specific node ID. If not provided, uses the current selection."),
    applyTokens: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to actually apply the matched tokens to Figma (default: true). If false, only returns matches without applying."),
    tolerance: z
      .number()
      .optional()
      .default(2)
      .describe("Tolerance for numeric value matching in pixels (default: 2px). Used for spacing, radius, etc."),
  },
  async ({ componentDescription, nodeId, applyTokens = true, tolerance = 2 }: any) => {
    try {
      // Get node data
      let nodeData: any;
      let targetNodeId: string;

      if (nodeId) {
        const result = await sendCommandToFigma("get_node_info", { nodeId });
        // get_node_info returns the node data directly (filterFigmaNode result)
        nodeData = result;
        targetNodeId = nodeId;
      } else {
        const selection = (await sendCommandToFigma("get_selection", {})) as {
          selectionCount: number;
          selection: { id: string; name: string; type: string; visible: boolean }[];
        };

        if (!selection.selectionCount || selection.selection.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No nodes selected in Figma. Please select a node to tokenize.",
              },
            ],
          };
        }

        const firstNode = selection.selection[0];
        targetNodeId = firstNode.id;
        const result = await sendCommandToFigma("get_node_info", { nodeId: targetNodeId });
        // get_node_info returns the node data directly (filterFigmaNode result)
        nodeData = result;
      }

      if (!nodeData || !nodeData.id) {
        return {
          content: [
            {
              type: "text",
              text: `Could not fetch node data for node ${targetNodeId}. NodeData type: ${typeof nodeData}, has id: ${nodeData?.id ? 'yes' : 'no'}`,
            },
          ],
        };
      }

      // Get available variables first (needed for matching)
      // export_variable_collections returns an array of collections directly
      const collectionsArray = (await sendCommandToFigma("export_variable_collections", {})) as Array<{
          id: string;
          name: string;
          modes: Array<{ modeId: string; name: string }>;
          variables: Array<{
            id: string;
            name: string;
            type: string;
            valuesByMode: Record<string, any>;
          }>;
        }>;

      // Flatten all variables into a single array for matching
      const allVariables = collectionsArray.flatMap((collection) =>
        collection.variables.map((variable) => ({
          ...variable,
          collectionId: collection.id,
        }))
      );

      // Extract collection info for filtering
      const collections = collectionsArray.map((collection) => ({
        id: collection.id,
        name: collection.name,
      }));

      // Extract actual values from node data
      const actualValues: any = {
        fills: nodeData.fills,
        strokes: nodeData.strokes,
        cornerRadius: nodeData.cornerRadius,
        paddingTop: nodeData.paddingTop,
        paddingRight: nodeData.paddingRight,
        paddingBottom: nodeData.paddingBottom,
        paddingLeft: nodeData.paddingLeft,
        itemSpacing: nodeData.itemSpacing,
        fontSize: nodeData.fontSize,
        fontWeight: nodeData.fontWeight,
        // Add more properties as needed
      };

      // Match values to tokens using Figma variables
      // NOTE: Only matches against theme tokens, never foundation tokens
      const matches = await matchComponentValuesToTokens(
        actualValues,
        allVariables,
        collections,
        componentDescription,
        tolerance
      );

      const appliedTokens: Array<{
        property: string;
        variableName: string;
        variableId: string;
        confidence: number;
      }> = [];
      const failedMatches: Array<{
        property: string;
        reason: string;
      }> = [];

      // Apply matched tokens
      if (applyTokens) {
        for (const { property, match } of matches) {
          if (!match) {
            failedMatches.push({
              property,
              reason: "No matching token found",
            });
            continue;
          }

          // Find the variable in Figma
          let variableId: string | undefined;
          let collectionId: string | undefined;

          for (const collection of collectionsArray) {
            const variable = collection.variables.find(
              (v) => v.name === match.variableName
            );
            if (variable) {
              variableId = variable.id;
              collectionId = collection.id;
              break;
            }
          }

          if (!variableId) {
            failedMatches.push({
              property,
              reason: `Variable "${match.variableName}" not found in Figma`,
            });
            continue;
          }

          // Apply the token
          try {
            const bindResult = await sendCommandToFigma("set_variable_binding", {
              nodeId: targetNodeId,
              propertyName: property,
              variableId,
              collectionId,
            });

            if ((bindResult as any).success) {
              appliedTokens.push({
                property,
                variableName: match.variableName,
                variableId,
                confidence: match.confidence,
              });
            } else {
              failedMatches.push({
                property,
                reason: "Failed to bind variable",
              });
            }
          } catch (error) {
            failedMatches.push({
              property,
              reason: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // Build response
      const response: string[] = [];
      response.push(`Token matching for node "${nodeData.name || targetNodeId}":`);
      response.push("");

      if (nodeMatchesById.size > 0) {
        response.push("Matches found:");
        for (const [nodeKey, nodeResult] of nodeMatchesById.entries()) {
          const { nodeName, matches } = nodeResult;
          response.push(`- Node "${nodeName || nodeKey}":`);
          matches.forEach(({ property, match }) => {
            if (match) {
              response.push(
                `    ${property}: ${match.variableName} (confidence: ${(match.confidence * 100).toFixed(
                  0
                )}%, type: ${match.matchType})`
              );
            } else {
              response.push(`    ${property}: No match found`);
            }
          });
          response.push("");
        }
      }

      if (applyTokens) {
        if (appliedTokens.length > 0) {
          response.push(`Successfully applied ${appliedTokens.length} tokens:`);
          appliedTokens.forEach(({ property, variableName, confidence }) => {
            response.push(
              `  ${property} → ${variableName} (${(confidence * 100).toFixed(0)}% confidence)`
            );
          });
          response.push("");
        }

        if (failedMatches.length > 0) {
          response.push(`Failed to apply ${failedMatches.length} tokens:`);
          failedMatches.forEach(({ property, reason }) => {
            response.push(`  ${property}: ${reason}`);
          });
        }
      } else {
        response.push("(Tokens not applied - set applyTokens=true to apply)");
      }

      return {
        content: [
          {
            type: "text",
            text: response.join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error auto-applying tokens: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);
*/

// ============================================================================
// CORE TOOLS - Variable Binding & Auto Tokenization
// ============================================================================

// Set Variable Binding Tool
server.tool(
  "set_variable_binding",
  "Bind an existing Figma variable to a property on a node. Supported properties: Colors: 'fills', 'strokes' (bind color variables to paint colors). Layout & Sizing: 'width', 'height', 'cornerRadius', 'opacity'. Text: 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'lineHeight' (text nodes only). Auto-layout Padding: 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft' (auto-layout frames only). Auto-layout Spacing: 'itemSpacing' (space between children), 'counterAxisSpacing' (space between wrapped rows/columns, requires layoutWrap='WRAP'). You can provide either a variableId, or a variableName (optionally with collectionId).",
  {
    nodeId: z.string().describe("The ID of the node to bind the variable to"),
    propertyName: z
      .string()
      .describe("The property name to bind. Colors: 'fills', 'strokes'. Layout: 'width', 'height', 'cornerRadius', 'opacity'. Text: 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'lineHeight'. Auto-layout Padding: 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'. Auto-layout Spacing: 'itemSpacing', 'counterAxisSpacing'."),
    variableId: z
      .string()
      .optional()
      .describe("The ID of the Figma variable to bind. Optional if variableName is provided."),
    variableName: z
      .string()
      .optional()
      .describe("The name of the Figma variable to bind (e.g. 'color/surface/action/accent/default')."),
    collectionId: z
      .string()
      .optional()
      .describe("Optional Figma collection ID (VariableCollectionId:...) to disambiguate variableName lookups."),
  },
  async ({ nodeId, propertyName, variableId, variableName, collectionId }: any) => {
    try {
      const result = await sendCommandToFigma("set_variable_binding", {
        nodeId,
        propertyName,
        variableId,
        variableName,
        collectionId,
      });
      const typedResult = result as {
        success: boolean;
        nodeId: string;
        propertyName: string;
        variableId: string;
        variableName: string;
        collectionId?: string;
      };

      if (!typedResult || !typedResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to bind variable ${
                variableId || variableName || "<?>"
              } to ${propertyName} on node ${nodeId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Bound variable "${typedResult.variableName}" (${typedResult.variableId}) to property "${typedResult.propertyName}" on node ${typedResult.nodeId}${
              typedResult.collectionId ? ` in collection ${typedResult.collectionId}` : ""
            }`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting variable binding: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Auto-apply Tokens Tool (Reverse Tokenization)
server.tool(
  "auto_apply_tokens",
  "Automatically match and apply design tokens to a component that has no variables applied. Fetches actual values from Figma, matches them to the closest tokens based on value similarity and component description, then applies those tokens. This is useful for tokenizing existing components.",
  {
    componentDescription: z
      .string()
      .optional()
      .describe("Optional description of the component to help with semantic token matching (e.g. 'primary button', 'card container')"),
    nodeId: z
      .string()
      .optional()
      .describe("Optional specific node ID. If not provided, uses the current selection."),
    applyTokens: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to actually apply the matched tokens to Figma (default: true). If false, only returns matches without applying."),
    tolerance: z
      .number()
      .optional()
      .default(2)
      .describe("Tolerance for numeric value matching in pixels (default: 2px). Used for spacing, radius, etc."),
  },
  async ({ componentDescription, nodeId, applyTokens = true, tolerance = 2 }: any) => {
    try {
      // Get node data
      let nodeData: any;
      let targetNodeId: string;

      if (nodeId) {
        const result = await sendCommandToFigma("get_node_info", { nodeId });
        // get_node_info returns the node data directly (filterFigmaNode result)
        nodeData = result;
        targetNodeId = nodeId;
      } else {
        const selection = (await sendCommandToFigma("get_selection", {})) as {
          selectionCount: number;
          selection: { id: string; name: string; type: string; visible: boolean }[];
        };

        if (!selection.selectionCount || selection.selection.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No nodes selected in Figma. Please select a node to tokenize.",
              },
            ],
          };
        }

        const firstNode = selection.selection[0];
        targetNodeId = firstNode.id;
        const result = await sendCommandToFigma("get_node_info", { nodeId: targetNodeId });
        // get_node_info returns the node data directly (filterFigmaNode result)
        nodeData = result;
      }

      if (!nodeData || !nodeData.id) {
        return {
          content: [
            {
              type: "text",
              text: `Could not fetch node data for node ${targetNodeId}. NodeData type: ${typeof nodeData}, has id: ${nodeData?.id ? 'yes' : 'no'}`,
            },
          ],
        };
      }

      // Helper to derive a more specific description per node, based on its name
      const buildNodeDescription = (baseDescription: string | undefined, nodeName: string): string => {
        const parts: string[] = [];
        if (baseDescription) parts.push(baseDescription);

        const lower = nodeName.toLowerCase();

        // Very small heuristic mapper from names to status kinds
        let statusKind: string | null = null;
        if (lower.includes("failed") || lower.includes("error")) statusKind = "danger";
        else if (lower.includes("tentative")) statusKind = "warning";
        else if (lower.includes("planned")) statusKind = "success";
        else if (lower.includes("reserved")) statusKind = "info";
        else if (lower.includes("unavailable")) statusKind = "neutral";
        else if (lower.includes("absence")) statusKind = "warning";
        else if (lower.includes("leave")) statusKind = "neutral";

        if (statusKind) {
          parts.push(`status ${statusKind}`);
        } else if (!baseDescription) {
          // Fall back to node name if no explicit description was provided
          parts.push(nodeName);
        }

        return parts.join(" ").trim();
      };

      /**
       * Build the list of nodes to process:
       * - If a COMPONENT_SET is selected, process all child COMPONENTs.
       * - Otherwise, just process the single target node.
       */
      const nodesToProcess: Array<{
        nodeId: string;
        nodeName: string;
        nodeData: any;
        description: string;
      }> = [];

      if (nodeData.type === "COMPONENT_SET" && Array.isArray(nodeData.children) && nodeData.children.length > 0) {
        for (const child of nodeData.children) {
          if (!child || child.type !== "COMPONENT" || !child.id) continue;

          const fullChildData = await sendCommandToFigma("get_node_info", { nodeId: child.id });
          const childName = child.name || nodeData.name || "";
          const descForChild = buildNodeDescription(componentDescription, childName);

          nodesToProcess.push({
            nodeId: child.id,
            nodeName: childName,
            nodeData: fullChildData,
            description: descForChild,
          });
        }
      } else {
        const nodeName = nodeData.name || "";
        const descForNode = buildNodeDescription(componentDescription, nodeName);
        nodesToProcess.push({
          nodeId: targetNodeId,
          nodeName,
          nodeData,
          description: descForNode,
        });
      }

      // Get available variables first (needed for matching)
      // export_variable_collections returns an array of collections directly
      const collectionsArray = (await sendCommandToFigma("export_variable_collections", {})) as Array<{
          id: string;
          name: string;
          modes: Array<{ modeId: string; name: string }>;
          variables: Array<{
            id: string;
            name: string;
            type: string;
            valuesByMode: Record<string, any>;
          }>;
        }>;

      // Flatten all variables into a single array for matching
      const allVariables = collectionsArray.flatMap((collection) =>
        collection.variables.map((variable) => ({
          ...variable,
          collectionId: collection.id,
        }))
      );

      // Extract collection info for filtering
      const collections = collectionsArray.map((collection) => ({
        id: collection.id,
        name: collection.name,
      }));

      // Extract actual values from node data
      const nodeMatchesById = new Map<
        string,
        {
          nodeName: string;
          description: string;
          matches: Array<{ property: string; match: any | null }>;
        }
      >();

      const appliedTokens: Array<{
        nodeId: string;
        nodeName: string;
        property: string;
        variableName: string;
        variableId: string;
        confidence: number;
      }> = [];
      const failedMatches: Array<{
        nodeId: string;
        nodeName: string;
        property: string;
        reason: string;
      }> = [];

      for (const { nodeId: nodeToTokenizeId, nodeName, nodeData: perNodeData, description } of nodesToProcess) {
        const hasFills =
          Array.isArray(perNodeData.fills) && perNodeData.fills.length > 0;
        const hasStrokes =
          Array.isArray(perNodeData.strokes) && perNodeData.strokes.length > 0;

        // If this node itself has no visual styling, but has children,
        // try to tokenize its nested instances instead (useful for button groups, etc.)
        if (!hasFills && !hasStrokes && Array.isArray(perNodeData.children) && perNodeData.children.length > 0) {
          for (const child of perNodeData.children) {
            if (!child || child.type !== "INSTANCE" || !child.id) continue;

            const fullChildData = await sendCommandToFigma("get_node_info", { nodeId: child.id });
            const childNode: any = fullChildData;
            const childName = child.name || nodeName;
            const childDescription = buildNodeDescription(description, childName);

            const childValues: any = {
              fills: childNode.fills,
              strokes: childNode.strokes,
              cornerRadius: childNode.cornerRadius,
              paddingTop: childNode.paddingTop,
              paddingRight: childNode.paddingRight,
              paddingBottom: childNode.paddingBottom,
              paddingLeft: childNode.paddingLeft,
              itemSpacing: childNode.itemSpacing,
              fontSize: childNode.fontSize,
              fontWeight: childNode.fontWeight,
              // Add more properties as needed
            };

            const childMatches = await matchComponentValuesToTokens(
              childValues,
              allVariables,
              collections,
              childDescription,
              tolerance
            );

            nodeMatchesById.set(child.id, {
              nodeName: childName,
              description: childDescription,
              matches: childMatches,
            });

            // --- Foreground (text/icon) handling for this instance ---
            // We treat this as an ACTION role if names hint at actions/buttons,
            // and choose foreground tokens accordingly.
            const lowerChildName = childName.toLowerCase();
            const isActionLike =
              lowerChildName.includes("button") ||
              lowerChildName.includes("primary") ||
              lowerChildName.includes("secondary") ||
              lowerChildName.includes("secundary") || // tolerate spelling used in this file
              lowerChildName.includes("action");

            if (isActionLike) {
              // Determine hierarchy: primary / secondary / accent (default to primary)
              let hierarchy: "primary" | "secondary" | "accent" = "primary";
              if (lowerChildName.includes("secondary") || lowerChildName.includes("secundary")) {
                hierarchy = "secondary";
              } else if (lowerChildName.includes("accent")) {
                hierarchy = "accent";
              }

              // Global secondary-action rule:
              // - Secondary actions invert primary: structural/light surface,
              //   but keep PRIMARY action color for text/icons.
              // - On light surfaces we must use the *inverse* primary foreground (blue on white),
              //   not the default primary foreground (white on blue).
              let foregroundTokenName: string;
              if (hierarchy === "secondary") {
                foregroundTokenName = "color/foreground/action/primary/inverse/default";
              } else {
                foregroundTokenName = `color/foreground/action/${hierarchy}/default`;
              }

              // Find the foreground variable once
              let fgVariableId: string | undefined;
              let fgCollectionId: string | undefined;
              for (const collection of collectionsArray) {
                const variable = collection.variables.find(
                  (v) => v.name === foregroundTokenName
                );
                if (variable) {
                  fgVariableId = variable.id;
                  fgCollectionId = collection.id;
                  break;
                }
              }

              if (fgVariableId && fgCollectionId) {
                // Collect TEXT children of this instance
                const textNodes: any[] = [];
                const collectTextNodes = (node: any) => {
                  if (!node || typeof node !== "object") return;
                  if (node.type === "TEXT" && node.id) {
                    textNodes.push(node);
                  }
                  if (Array.isArray(node.children)) {
                    node.children.forEach(collectTextNodes);
                  }
                };
                collectTextNodes(childNode);

                for (const textNode of textNodes) {
                  try {
                    const bindResult = await sendCommandToFigma("set_variable_binding", {
                      nodeId: textNode.id,
                      propertyName: "fills",
                      variableId: fgVariableId,
                      collectionId: fgCollectionId,
                    });

                    if ((bindResult as any).success) {
                      appliedTokens.push({
                        nodeId: textNode.id,
                        nodeName: textNode.name || childName,
                        property: "fills",
                        variableName: foregroundTokenName,
                        variableId: fgVariableId,
                        confidence: 1,
                      });
                    } else {
                      failedMatches.push({
                        nodeId: textNode.id,
                        nodeName: textNode.name || childName,
                        property: "fills",
                        reason: "Failed to bind foreground variable",
                      });
                    }
                  } catch (error) {
                    failedMatches.push({
                      nodeId: textNode.id,
                      nodeName: textNode.name || childName,
                      property: "fills",
                      reason: error instanceof Error ? error.message : String(error),
                    });
                  }
                }
              }
            }
          }

          // Skip matching the wrapper node itself in this case
          continue;
        }

        const actualValues: any = {
          fills: perNodeData.fills,
          strokes: perNodeData.strokes,
          cornerRadius: perNodeData.cornerRadius,
          paddingTop: perNodeData.paddingTop,
          paddingRight: perNodeData.paddingRight,
          paddingBottom: perNodeData.paddingBottom,
          paddingLeft: perNodeData.paddingLeft,
          itemSpacing: perNodeData.itemSpacing,
          fontSize: perNodeData.fontSize,
          fontWeight: perNodeData.fontWeight,
          // Add more properties as needed
        };

        // Match values to tokens using Figma variables
        // NOTE: Only matches against theme tokens, never foundation tokens
        const matches = await matchComponentValuesToTokens(
          actualValues,
          allVariables,
          collections,
          description,
          tolerance
        );

        nodeMatchesById.set(nodeToTokenizeId, {
          nodeName,
          description,
          matches,
        });
      }

      // Apply matched tokens
      if (applyTokens) {
        for (const [nodeKey, nodeResult] of nodeMatchesById.entries()) {
          const { nodeName, matches } = nodeResult;

          for (const { property, match } of matches) {
            // If we couldn't find a reasonable match, skip this property and move on
            if (!match) {
              failedMatches.push({
                nodeId: nodeKey,
                nodeName,
                property,
                reason: "No matching token found",
              });
              continue;
            }

            // Find the variable in Figma (by name within any collection)
            let variableId: string | undefined;
            let collectionId: string | undefined;

            for (const collection of collectionsArray) {
              const variable = collection.variables.find(
                (v) => v.name === match.variableName
              );
              if (variable) {
                variableId = variable.id;
                collectionId = collection.id;
                break;
              }
            }

            if (!variableId) {
              failedMatches.push({
                nodeId: nodeKey,
                nodeName,
                property,
                reason: `Variable "${match.variableName}" not found in Figma`,
              });
              continue;
            }

            // Apply the token
            try {
              const bindResult = await sendCommandToFigma("set_variable_binding", {
                nodeId: nodeKey,
                propertyName: property,
                variableId,
                collectionId,
              });

              if ((bindResult as any).success) {
                appliedTokens.push({
                  nodeId: nodeKey,
                  nodeName,
                  property,
                  variableName: match.variableName,
                  variableId,
                  confidence: match.confidence,
                });
              } else {
                failedMatches.push({
                  nodeId: nodeKey,
                  nodeName,
                  property,
                  reason: "Failed to bind variable",
                });
              }
            } catch (error) {
              failedMatches.push({
                nodeId: nodeKey,
                nodeName,
                property,
                reason: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }

      // Build response
      const response: string[] = [];
      response.push(`Token matching summary:`);
      response.push("");

      if (nodeMatchesById.size > 0) {
        response.push("Matches found:");
        for (const [nodeKey, nodeResult] of nodeMatchesById.entries()) {
          const { nodeName, matches } = nodeResult;
          response.push(`- Node "${nodeName || nodeKey}":`);
          matches.forEach(({ property, match }) => {
            if (match) {
              response.push(
                `    ${property}: ${match.variableName} (confidence: ${(match.confidence * 100).toFixed(
                  0
                )}%, type: ${match.matchType})`
              );
            } else {
              response.push(`    ${property}: No match found`);
            }
          });
          response.push("");
        }
      }

      if (applyTokens) {
        if (appliedTokens.length > 0) {
          response.push(`Successfully applied ${appliedTokens.length} tokens:`);
          appliedTokens.forEach(({ property, variableName, confidence }) => {
            response.push(
              `  ${property} → ${variableName} (${(confidence * 100).toFixed(0)}% confidence)`
            );
          });
          response.push("");
        }

        if (failedMatches.length > 0) {
          response.push(`Failed to apply ${failedMatches.length} tokens:`);
          failedMatches.forEach(({ property, reason }) => {
            response.push(`  ${property}: ${reason}`);
          });
        }
      } else {
        response.push("(Tokens not applied - set applyTokens=true to apply)");
      }

      return {
        content: [
          {
            type: "text",
            text: response.join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error auto-applying tokens: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ============================================================================
// OPTIONAL TOOLS - Commented out (prototyping & connections)
// ============================================================================

/*
// Connect Nodes Tool
server.tool(
  "create_connections",
  "Create connections between nodes using the default connector style",
  {
    connections: z.array(z.object({
      startNodeId: z.string().describe("ID of the starting node"),
      endNodeId: z.string().describe("ID of the ending node"),
      text: z.string().optional().describe("Optional text to display on the connector")
    })).describe("Array of node connections to create")
  },
  async ({ connections }: any) => {
    try {
      if (!connections || connections.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No connections provided"
            }
          ]
        };
      }

      const result = await sendCommandToFigma("create_connections", {
        connections
      });

      return {
        content: [
          {
            type: "text",
            text: `Created ${connections.length} connections: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating connections: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Focus Tool
server.tool(
  "set_focus",
  "Set focus on a specific node in Figma by selecting it and scrolling viewport to it",
  {
    nodeId: z.string().describe("The ID of the node to focus on"),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("set_focus", { nodeId });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Focused on node "${typedResult.name}" (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting focus: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Set Selections Tool
server.tool(
  "set_selections",
  "Set selection to multiple nodes in Figma and scroll viewport to show them",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to select"),
  },
  async ({ nodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("set_selections", { nodeIds });
      const typedResult = result as { selectedNodes: Array<{ name: string; id: string }>; count: number };
      return {
        content: [
          {
            type: "text",
            text: `Selected ${typedResult.count} nodes: ${typedResult.selectedNodes.map(node => `"${node.name}" (${node.id})`).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting selections: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);
*/

// ============================================================================
// CORE TOOLS - Variable Collections, Styles
// ============================================================================

// Export Variable Collections Tool
server.tool(
  "get_variable_collections",
  "Export Figma variable collections and their variables from the current document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("export_variable_collections", {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting variable collections: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Set Text Style Tool
server.tool(
  "set_text_style",
  "Apply a Figma text style (by styleId) to a node. If the node has children, the style will be applied to all descendant text nodes.",
  {
    nodeId: z.string().describe("The ID of the node (or container) to apply the text style to"),
    styleId: z.string().describe("The Figma text style ID to apply (e.g. from $figmaStyleReferences)"),
  },
  async ({ nodeId, styleId }: any) => {
    try {
      const result = await sendCommandToFigma("set_text_style", {
        nodeId,
        styleId,
      });
      const typedResult = result as { success: boolean; nodeId: string; styleId: string };

      if (!typedResult || !typedResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to apply text style ${styleId} to node ${nodeId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Applied text style ${typedResult.styleId} to node ${typedResult.nodeId} (all descendant text nodes).`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting text style: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Set Effect Style Tool
server.tool(
  "set_effect_style",
  "Apply a Figma effect style (by styleId) to a node. Effect styles include shadows, blurs, and other visual effects.",
  {
    nodeId: z.string().describe("The ID of the node to apply the effect style to"),
    styleId: z.string().describe("The Figma effect style ID to apply (e.g. from $figmaStyleReferences)"),
  },
  async ({ nodeId, styleId }: any) => {
    try {
      const result = await sendCommandToFigma("set_effect_style", {
        nodeId,
        styleId,
      });
      const typedResult = result as { success: boolean; nodeId: string; styleId: string };

      if (!typedResult || !typedResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to apply effect style ${styleId} to node ${nodeId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Applied effect style ${typedResult.styleId} to node ${typedResult.nodeId}.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting effect style: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ============================================================================
// OPTIONAL TOOLS - Commented out (continued)
// ============================================================================

/*
// Strategy for converting Figma prototype reactions to connector lines
server.prompt(
  "reaction_to_connector_strategy",
  "Strategy for converting Figma prototype reactions to connector lines using the output of 'get_reactions'",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Strategy: Convert Figma Prototype Reactions to Connector Lines

## Goal
Process the JSON output from the \`get_reactions\` tool to generate an array of connection objects suitable for the \`create_connections\` tool. This visually represents prototype flows as connector lines on the Figma canvas.

## Input Data
You will receive JSON data from the \`get_reactions\` tool. This data contains an array of nodes, each with potential reactions. A typical reaction object looks like this:
\`\`\`json
{
  "trigger": { "type": "ON_CLICK" },
  "action": {
    "type": "NAVIGATE",
    "destinationId": "destination-node-id",
    "navigationTransition": { ... },
    "preserveScrollPosition": false
  }
}
\`\`\`

## Step-by-Step Process

### 1. Preparation & Context Gathering
   - **Action:** Call \`read_my_design\` on the relevant node(s) to get context about the nodes involved (names, types, etc.). This helps in generating meaningful connector labels later.
   - **Action:** Call \`set_default_connector\` **without** the \`connectorId\` parameter.
   - **Check Result:** Analyze the response from \`set_default_connector\`.
     - If it confirms a default connector is already set (e.g., "Default connector is already set"), proceed to Step 2.
     - If it indicates no default connector is set (e.g., "No default connector set..."), you **cannot** proceed with \`create_connections\` yet. Inform the user they need to manually copy a connector from FigJam, paste it onto the current page, select it, and then you can run \`set_default_connector({ connectorId: "SELECTED_NODE_ID" })\` before attempting \`create_connections\`. **Do not proceed to Step 2 until a default connector is confirmed.**

### 2. Filter and Transform Reactions from \`get_reactions\` Output
   - **Iterate:** Go through the JSON array provided by \`get_reactions\`. For each node in the array:
     - Iterate through its \`reactions\` array.
   - **Filter:** Keep only reactions where the \`action\` meets these criteria:
     - Has a \`type\` that implies a connection (e.g., \`NAVIGATE\`, \`OPEN_OVERLAY\`, \`SWAP_OVERLAY\`). **Ignore** types like \`CHANGE_TO\`, \`CLOSE_OVERLAY\`, etc.
     - Has a valid \`destinationId\` property.
   - **Extract:** For each valid reaction, extract the following information:
     - \`sourceNodeId\`: The ID of the node the reaction belongs to (from the outer loop).
     - \`destinationNodeId\`: The value of \`action.destinationId\`.
     - \`actionType\`: The value of \`action.type\`.
     - \`triggerType\`: The value of \`trigger.type\`.

### 3. Generate Connector Text Labels
   - **For each extracted connection:** Create a concise, descriptive text label string.
   - **Combine Information:** Use the \`actionType\`, \`triggerType\`, and potentially the names of the source/destination nodes (obtained from Step 1's \`read_my_design\` or by calling \`get_node_info\` if necessary) to generate the label.
   - **Example Labels:**
     - If \`triggerType\` is "ON\_CLICK" and \`actionType\` is "NAVIGATE": "On click, navigate to [Destination Node Name]"
     - If \`triggerType\` is "ON\_DRAG" and \`actionType\` is "OPEN\_OVERLAY": "On drag, open [Destination Node Name] overlay"
   - **Keep it brief and informative.** Let this generated string be \`generatedText\`.

### 4. Prepare the \`connections\` Array for \`create_connections\`
   - **Structure:** Create a JSON array where each element is an object representing a connection.
   - **Format:** Each object in the array must have the following structure:
     \`\`\`json
     {
       "startNodeId": "sourceNodeId_from_step_2",
       "endNodeId": "destinationNodeId_from_step_2",
       "text": "generatedText_from_step_3"
     }
     \`\`\`
   - **Result:** This final array is the value you will pass to the \`connections\` parameter when calling the \`create_connections\` tool.

### 5. Execute Connection Creation
   - **Action:** Call the \`create_connections\` tool, passing the array generated in Step 4 as the \`connections\` argument.
   - **Verify:** Check the response from \`create_connections\` to confirm success or failure.

This detailed process ensures you correctly interpret the reaction data, prepare the necessary information, and use the appropriate tools to create the connector lines.`
          },
        },
      ],
      description: "Strategy for converting Figma prototype reactions to connector lines using the output of 'get_reactions'",
    };
  }
);
*/

// ============================================================================
// Type definitions (required for all tools, including commented ones)
// ============================================================================

// Define command types and parameters
type FigmaCommand =
  | "get_document_info"
  | "get_selection"
  | "get_selection_variables"
  | "describe_component"
  | "get_node_info"
  | "get_nodes_info"
  | "read_my_design"
  | "create_rectangle"
  | "create_frame"
  | "create_text"
  | "set_fill_color"
  | "set_stroke_color"
  | "move_node"
  | "resize_node"
  | "delete_node"
  | "delete_multiple_nodes"
  | "get_styles"
  | "get_local_components"
  | "create_component_instance"
  | "get_instance_overrides"
  | "set_instance_overrides"
  | "export_node_as_image"
  | "join"
  | "set_corner_radius"
  | "clone_node"
  | "set_text_content"
  | "scan_text_nodes"
  | "set_multiple_text_contents"
  | "get_annotations"
  | "set_annotation"
  | "set_multiple_annotations"
  | "scan_nodes_by_types"
  | "set_layout_mode"
  | "set_padding"
  | "set_axis_align"
  | "set_layout_sizing"
  | "set_item_spacing"
  | "get_reactions"
  | "set_default_connector"
  | "create_connections"
  | "set_focus"
  | "set_selections"
  | "set_variable_binding"
  | "set_text_style"
  | "set_effect_style"
  | "export_variable_collections";

type CommandParams = {
  get_document_info: Record<string, never>;
  get_selection: Record<string, never>;
  get_selection_variables: Record<string, never>;
  describe_component: { nodeId: string };
  get_node_info: { nodeId: string };
  get_nodes_info: { nodeIds: string[] };
  create_rectangle: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    parentId?: string;
  };
  create_frame: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    parentId?: string;
    fillColor?: { r: number; g: number; b: number; a?: number };
    strokeColor?: { r: number; g: number; b: number; a?: number };
    strokeWeight?: number;
  };
  create_text: {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontWeight?: number;
    fontColor?: { r: number; g: number; b: number; a?: number };
    name?: string;
    parentId?: string;
  };
  set_fill_color: {
    nodeId: string;
    r: number;
    g: number;
    b: number;
    a?: number;
  };
  set_stroke_color: {
    nodeId: string;
    r: number;
    g: number;
    b: number;
    a?: number;
    weight?: number;
  };
  move_node: {
    nodeId: string;
    x: number;
    y: number;
  };
  resize_node: {
    nodeId: string;
    width: number;
    height: number;
  };
  delete_node: {
    nodeId: string;
  };
  delete_multiple_nodes: {
    nodeIds: string[];
  };
  get_styles: Record<string, never>;
  get_local_components: Record<string, never>;
  get_team_components: Record<string, never>;
  create_component_instance: {
    componentKey: string;
    x: number;
    y: number;
  };
  get_instance_overrides: {
    instanceNodeId: string | null;
  };
  set_instance_overrides: {
    targetNodeIds: string[];
    sourceInstanceId: string;
  };
  export_node_as_image: {
    nodeId: string;
    format?: "PNG" | "JPG" | "SVG" | "PDF";
    scale?: number;
  };
  execute_code: {
    code: string;
  };
  join: {
    channel: string;
  };
  set_corner_radius: {
    nodeId: string;
    radius: number;
    corners?: boolean[];
  };
  clone_node: {
    nodeId: string;
    x?: number;
    y?: number;
  };
  set_text_content: {
    nodeId: string;
    text: string;
  };
  scan_text_nodes: {
    nodeId: string;
    useChunking: boolean;
    chunkSize: number;
  };
  set_multiple_text_contents: {
    nodeId: string;
    text: Array<{ nodeId: string; text: string }>;
  };
  get_annotations: {
    nodeId?: string;
    includeCategories?: boolean;
  };
  set_annotation: {
    nodeId: string;
    annotationId?: string;
    labelMarkdown: string;
    categoryId?: string;
    properties?: Array<{ type: string }>;
  };
  set_multiple_annotations: SetMultipleAnnotationsParams;
  scan_nodes_by_types: {
    nodeId: string;
    types: Array<string>;
  };
  get_reactions: { nodeIds: string[] };
  set_default_connector: {
    connectorId?: string | undefined;
  };
  create_connections: {
    connections: Array<{
      startNodeId: string;
      endNodeId: string;
      text?: string;
    }>;
  };
  set_focus: {
    nodeId: string;
  };
  set_selections: {
    nodeIds: string[];
  };
  set_variable_binding: {
    nodeId: string;
    propertyName: string;
    variableId?: string;
    variableName?: string;
    collectionId?: string;
  };
  set_text_style: {
    nodeId: string;
    styleId: string;
  };
  set_effect_style: {
    nodeId: string;
    styleId: string;
  };
  export_variable_collections: Record<string, never>;

};


// Helper function to process Figma node responses
function processFigmaNodeResponse(result: unknown): any {
  if (!result || typeof result !== "object") {
    return result;
  }

  // Check if this looks like a node response
  const resultObj = result as Record<string, unknown>;
  if ("id" in resultObj && typeof resultObj.id === "string") {
    // It appears to be a node response, log the details
    console.info(
      `Processed Figma node: ${resultObj.name || "Unknown"} (ID: ${resultObj.id
      })`
    );

    if ("x" in resultObj && "y" in resultObj) {
      console.debug(`Node position: (${resultObj.x}, ${resultObj.y})`);
    }

    if ("width" in resultObj && "height" in resultObj) {
      console.debug(`Node dimensions: ${resultObj.width}×${resultObj.height}`);
    }
  }

  return result;
}

// Update the connectToFigma function
function connectToFigma(port: number = 3055) {
  // If already connected, do nothing
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.info('Already connected to Figma');
    return;
  }

  const wsUrl = serverUrl === 'localhost' ? `${WS_URL}:${port}` : WS_URL;
  logger.info(`Connecting to Figma socket server at ${wsUrl}...`);
  ws = new WebSocket(wsUrl);

  ws.on('open', async () => {
    logger.info(`Connected to Figma socket server on port ${port}`);
    // Reset channel on new connection
    currentChannel = null;
    
    // Automatically join the default channel
    try {
      await joinChannel(DEFAULT_FIGMA_CHANNEL);
      logger.info(`Connected to server on port ${port} in channel: ${DEFAULT_FIGMA_CHANNEL}`);
    } catch (error) {
      logger.warn(`Failed to auto-join default channel "${DEFAULT_FIGMA_CHANNEL}": ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ws.on("message", (data: any) => {
    try {
      // Define a more specific type with an index signature to allow any property access
      interface ProgressMessage {
        message: FigmaResponse | any;
        type?: string;
        id?: string;
        [key: string]: any; // Allow any other properties
      }

      const json = JSON.parse(data) as ProgressMessage;

      // Handle progress updates
      if (json.type === 'progress_update') {
        const progressData = json.message.data as CommandProgressUpdate;
        const requestId = json.id || '';

        if (requestId && pendingRequests.has(requestId)) {
          const request = pendingRequests.get(requestId)!;

          // Update last activity timestamp
          request.lastActivity = Date.now();

          // Reset the timeout to prevent timeouts during long-running operations
          clearTimeout(request.timeout);

          // Create a new timeout
          request.timeout = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              logger.error(`Request ${requestId} timed out after extended period of inactivity`);
              pendingRequests.delete(requestId);
              request.reject(new Error('Request to Figma timed out'));
            }
          }, 60000); // 60 second timeout for inactivity

          // Log progress
          logger.info(`Progress update for ${progressData.commandType}: ${progressData.progress}% - ${progressData.message}`);

          // For completed updates, we could resolve the request early if desired
          if (progressData.status === 'completed' && progressData.progress === 100) {
            // Optionally resolve early with partial data
            // request.resolve(progressData.payload);
            // pendingRequests.delete(requestId);

            // Instead, just log the completion, wait for final result from Figma
            logger.info(`Operation ${progressData.commandType} completed, waiting for final result`);
          }
        }
        return;
      }

      // Handle regular responses
      const myResponse = json.message;
      logger.debug(`Received message: ${JSON.stringify(myResponse)}`);
      logger.log('myResponse' + JSON.stringify(myResponse));

      // Handle response to a request
      if (
        myResponse.id &&
        pendingRequests.has(myResponse.id) &&
        myResponse.result
      ) {
        const request = pendingRequests.get(myResponse.id)!;
        clearTimeout(request.timeout);

        if (myResponse.error) {
          logger.error(`Error from Figma: ${myResponse.error}`);
          request.reject(new Error(myResponse.error));
        } else {
          if (myResponse.result) {
            request.resolve(myResponse.result);
          }
        }

        pendingRequests.delete(myResponse.id);
      } else {
        // Handle broadcast messages or events
        logger.info(`Received broadcast message: ${JSON.stringify(myResponse)}`);
      }
    } catch (error) {
      logger.error(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ws.on('error', (error) => {
    logger.error(`Socket error: ${error}`);
  });

  ws.on('close', () => {
    logger.info('Disconnected from Figma socket server');
    ws = null;

    // Reject all pending requests
    for (const [id, request] of pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error("Connection closed"));
      pendingRequests.delete(id);
    }

    // Attempt to reconnect
    logger.info('Attempting to reconnect in 2 seconds...');
    setTimeout(() => connectToFigma(port), 2000);
  });
}

// Function to join a channel
async function joinChannel(channelName: string): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to Figma");
  }

  try {
    await sendCommandToFigma("join", { channel: channelName });
    currentChannel = channelName;
    logger.info(`Joined channel: ${channelName}`);
  } catch (error) {
    logger.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Function to send commands to Figma
function sendCommandToFigma(
  command: FigmaCommand,
  params: unknown = {},
  timeoutMs: number = 30000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // If not connected, try to connect first
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToFigma();
      reject(new Error("Not connected to Figma. Attempting to connect..."));
      return;
    }

    // Check if we need a channel for this command
    const requiresChannel = command !== "join";
    if (requiresChannel && !currentChannel) {
      reject(new Error("Must join a channel before sending commands"));
      return;
    }

    const id = uuidv4();
    const request = {
      id,
      type: command === "join" ? "join" : "message",
      ...(command === "join"
        ? { channel: (params as any).channel }
        : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as any),
          commandId: id, // Include the command ID in params
        },
      },
    };

    // Set timeout for request
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        logger.error(`Request ${id} to Figma timed out after ${timeoutMs / 1000} seconds`);
        reject(new Error('Request to Figma timed out'));
      }
    }, timeoutMs);

    // Store the promise callbacks to resolve/reject later
    pendingRequests.set(id, {
      resolve,
      reject,
      timeout,
      lastActivity: Date.now()
    });

    // Send the request
    logger.info(`Sending command to Figma: ${command}`);
    logger.debug(`Request details: ${JSON.stringify(request)}`);
    ws.send(JSON.stringify(request));
  });
}

// ============================================================================
// CORE TOOL - Channel connection (required for all operations)
// ============================================================================

// Update the join_channel tool
server.tool(
  "join_channel",
  "Join a specific channel to communicate with Figma",
  {
    channel: z.string().describe(`The name of the channel to join (default: "${DEFAULT_FIGMA_CHANNEL}")`).default(""),
  },
  async ({ channel }: any) => {
    try {
      // Use default channel if none provided
      const channelName = channel || DEFAULT_FIGMA_CHANNEL;

      await joinChannel(channelName);
      return {
        content: [
          {
            type: "text",
            text: `Connected to server on port 3055 in channel: ${channelName}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error joining channel: ${error instanceof Error ? error.message : String(error)
              }`,
          },
        ],
      };
    }
  }
);

// Start the server
async function main() {
  try {
    // Try to connect to Figma socket server
    connectToFigma();
  } catch (error) {
    logger.warn(`Could not connect to Figma initially: ${error instanceof Error ? error.message : String(error)}`);
    logger.warn('Will try to connect when the first command is sent');
  }

  // Start the MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('FigmaMCP server running on stdio');
}

// Run the server
main().catch(error => {
  logger.error(`Error starting FigmaMCP server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});



