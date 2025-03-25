// This is the main code file for the Cursor MCP Figma plugin
// It handles Figma API commands

/**
 * CHANGES FROM ORIGINAL PROJECT
 * This version adds complete support for Figma variables through the following additions:
 * 1. Variable-related command handlers in handleCommand()
 * 2. New functions for managing variables:
 *    - getLocalVariables: Get all local variables with optional type filtering
 *    - getVariableCollections: Get all variable collections
 *    - getVariableById: Get a specific variable by ID
 *    - createVariableCollection: Create a new variable collection
 *    - createVariable: Create a new variable in a collection
 *    - setBoundVariable: Bind a variable to a node property
 * 
 * These changes enable full variable support while maintaining all original functionality.
 */

/**
 * Enhanced version of the original plugin with complete variable support.
 * Successfully tested features include:
 * - Getting local variables and collections
 * - Binding variables to node properties
 * - Changing existing variable bindings (e.g., changing fill colors)
 * 
 * Key improvements:
 * - Proper handling of paint properties (fills/strokes)
 * - Support for effects and layout grid variables
 * - Robust error handling and state management
 */

// Plugin state
const state = {
  serverPort: 3055, // Default port
};

// Show UI
figma.showUI(__html__, { width: 350, height: 450 });

// Plugin commands from UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "update-settings":
      updateSettings(msg);
      break;
    case "notify":
      figma.notify(msg.message);
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    case "execute-command":
      // Execute commands received from UI (which gets them from WebSocket)
      try {
        const result = await handleCommand(msg.command, msg.params);
        // Send result back to UI
        figma.ui.postMessage({
          type: "command-result",
          id: msg.id,
          result,
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "command-error",
          id: msg.id,
          error: error.message || "Error executing command",
        });
      }
      break;
  }
};

// Listen for plugin commands from menu
figma.on("run", ({ command }) => {
  figma.ui.postMessage({ type: "auto-connect" });
});

// Update plugin settings
function updateSettings(settings) {
  if (settings.serverPort) {
    state.serverPort = settings.serverPort;
  }

  figma.clientStorage.setAsync("settings", {
    serverPort: state.serverPort,
  });
}

// Handle commands from UI
async function handleCommand(command, params) {
  switch (command) {
    case "get_document_info":
      return await getDocumentInfo();
    case "get_selection":
      return await getSelection();
    case "get_node_info":
      if (!params || !params.nodeId) {
        throw new Error("Missing nodeId parameter");
      }
      return await getNodeInfo(params.nodeId);
    case "create_rectangle":
      return await createRectangle(params);
    case "create_frame":
      return await createFrame(params);
    case "create_text":
      return await createText(params);
    case "set_fill_color":
      return await setFillColor(params);
    case "set_stroke_color":
      return await setStrokeColor(params);
    case "move_node":
      return await moveNode(params);
    case "resize_node":
      return await resizeNode(params);
    case "delete_node":
      return await deleteNode(params);
    case "get_styles":
      return await getStyles();
    case "get_local_components":
      return await getLocalComponents();
    case "get_team_components":
      return await getTeamComponents();
    case "create_component_instance":
      return await createComponentInstance(params);
    case "export_node_as_image":
      return await exportNodeAsImage(params);
    case "execute_code":
      return await executeCode(params);
    case "set_corner_radius":
      return await setCornerRadius(params);
    case "set_text_content":
      return await setTextContent(params);
    case "get_local_variables":
      return await getLocalVariables(params);
    case "get_variable_collections":
      return await getVariableCollections();
    case "get_variable_by_id":
      return await getVariableById(params);
    case "create_variable_collection":
      return await createVariableCollection(params);
    case "create_variable":
      return await createVariable(params);
    case "set_bound_variable":
      return await setBoundVariable(params);
    case "set_instance_properties":
      return await setInstanceProperties(params);
    case "mcp_TalkToFigma_set_instance_properties":
      return await setInstanceProperties(params);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Command implementations

async function getDocumentInfo() {
  await figma.currentPage.loadAsync();
  const page = figma.currentPage;
  return {
    name: page.name,
    id: page.id,
    type: page.type,
    children: page.children.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
    currentPage: {
      id: page.id,
      name: page.name,
      childCount: page.children.length,
    },
    pages: [
      {
        id: page.id,
        name: page.name,
        childCount: page.children.length,
      },
    ],
  };
}

async function getSelection() {
  return {
    selectionCount: figma.currentPage.selection.length,
    selection: figma.currentPage.selection.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
    })),
  };
}

async function getNodeInfo(nodeId) {
  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Base node information
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  // Add position and size for SceneNode
  if ("x" in node && "y" in node) {
    nodeInfo.x = node.x;
    nodeInfo.y = node.y;
  }

  if ("width" in node && "height" in node) {
    nodeInfo.width = node.width;
    nodeInfo.height = node.height;
  }

  // Add fills for nodes with fills
  if ("fills" in node) {
    nodeInfo.fills = node.fills;
  }

  // Add strokes for nodes with strokes
  if ("strokes" in node) {
    nodeInfo.strokes = node.strokes;
    if ("strokeWeight" in node) {
      nodeInfo.strokeWeight = node.strokeWeight;
    }
  }

  // Add children for parent nodes
  if ("children" in node) {
    nodeInfo.children = node.children.map((child) => ({
      id: child.id,
      name: child.name,
      type: child.type,
    }));
  }

  // Add text-specific properties
  if (node.type === "TEXT") {
    nodeInfo.characters = node.characters;
    nodeInfo.fontSize = node.fontSize;
    nodeInfo.fontName = node.fontName;
  }

  return nodeInfo;
}

async function createRectangle(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Rectangle",
    parentId,
  } = params || {};

  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.name = name;

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(rect);
  } else {
    figma.currentPage.appendChild(rect);
  }

  return {
    id: rect.id,
    name: rect.name,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    parentId: rect.parent ? rect.parent.id : undefined,
  };
}

async function createFrame(params) {
  const { x = 0, y = 0, width = 100, height = 100, name, parentId, autoLayout, fillColor, strokeColor, strokeWeight } = params || {};

  console.log("[createFrame] Starting with params:", { x, y, width, height, name, parentId, autoLayout });

  const frame = figma.createFrame();
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.name = name || "Frame";

  console.log("[createFrame] Frame created with initial ID:", frame.id);
  console.log("[createFrame] Initial parent:", frame.parent ? { id: frame.parent.id, name: frame.parent.name, type: frame.parent.type } : "none");

  if (parentId) {
    console.log("[createFrame] Attempting to get parent node:", parentId);
    const parentNode = await figma.getNodeByIdAsync(parentId);
    console.log("[createFrame] Parent node found:", parentNode ? {
      id: parentNode.id,
      name: parentNode.name,
      type: parentNode.type,
      children: parentNode.children ? parentNode.children.length : "N/A"
    } : "null");

    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }

    console.log("[createFrame] Before appendChild - frame parent:", frame.parent ? { id: frame.parent.id, name: frame.parent.name } : "none");
    parentNode.appendChild(frame);
    console.log("[createFrame] After appendChild - frame parent:", frame.parent ? { id: frame.parent.id, name: frame.parent.name } : "none");
    console.log("[createFrame] Parent's children after append:", parentNode.children.map(child => ({ id: child.id, name: child.name, type: child.type })));
  } else {
    console.log("[createFrame] No parent ID provided, adding to current page");
    figma.currentPage.appendChild(frame);
  }

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    frame.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    frame.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    frame.strokeWeight = strokeWeight;
  }

  // Set auto-layout if provided
  if (autoLayout) {
    frame.layoutMode = autoLayout.direction;
    frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = autoLayout.padding;
    frame.itemSpacing = autoLayout.spacing;
    frame.primaryAxisAlignItems = autoLayout.alignment;
    frame.counterAxisAlignItems = autoLayout.alignment === "SPACE_BETWEEN" ? "CENTER" : autoLayout.alignment;
  }

  const result = {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    parentId: frame.parent ? frame.parent.id : undefined
  };

  console.log("[createFrame] Final frame state:", {
    id: frame.id,
    parentId: frame.parent ? frame.parent.id : undefined,
    x: frame.x,
    y: frame.y,
    parent: frame.parent ? { id: frame.parent.id, name: frame.parent.name, type: frame.parent.type } : "none"
  });

  return result;
}

// Helper function to calculate the next position in an auto-layout frame
async function calculateNextPosition(parentId) {
  if (!parentId) return { x: 0, y: 0 };

  const parent = await figma.getNodeByIdAsync(parentId);
  if (!parent || !("children" in parent)) {
    return { x: 0, y: 0 };
  }

  // If parent has auto-layout
  if ("layoutMode" in parent && parent.layoutMode !== "NONE") {
    // Auto-layout handles positioning automatically
    return { x: 0, y: 0 };
  }

  // For non-auto-layout frames, calculate next position
  const children = parent.children;
  if (children.length === 0) {
    // First child - use parent's padding if available
    return {
      x: "paddingLeft" in parent ? parent.paddingLeft : 0,
      y: "paddingTop" in parent ? parent.paddingTop : 0
    };
  }

  // Get the last child's position and dimensions
  const lastChild = children[children.length - 1];
  if (!("x" in lastChild) || !("y" in lastChild)) {
    return { x: 0, y: 0 };
  }

  // Calculate next position based on the last child
  if (parent.layoutMode === "HORIZONTAL") {
    return {
      x: lastChild.x + lastChild.width + (parent.itemSpacing || 0),
      y: lastChild.y
    };
  } else if (parent.layoutMode === "VERTICAL") {
    return {
      x: lastChild.x,
      y: lastChild.y + lastChild.height + (parent.itemSpacing || 0)
    };
  }

  // Default positioning for non-auto-layout
  return {
    x: lastChild.x,
    y: lastChild.y + lastChild.height + 10 // Default spacing
  };
}

async function createText(params) {
  const {
    x = 0,
    y = 0,
    text = "Text",
    fontSize = 14,
    fontWeight = 400,
    fontColor = { r: 0, g: 0, b: 0, a: 1 },
    name = "Text",
    parentId,
  } = params || {};

  // Calculate position if parent is provided
  const position = parentId ? await calculateNextPosition(parentId) : { x, y };

  // Map common font weights to Figma font styles
  const getFontStyle = (weight) => {
    switch (weight) {
      case 100: return "Thin";
      case 200: return "Extra Light";
      case 300: return "Light";
      case 400: return "Regular";
      case 500: return "Medium";
      case 600: return "Semi Bold";
      case 700: return "Bold";
      case 800: return "Extra Bold";
      case 900: return "Black";
      default: return "Regular";
    }
  };

  const textNode = figma.createText();
  textNode.x = position.x;
  textNode.y = position.y;
  textNode.name = name;

  try {
    await figma.loadFontAsync({
      family: "Inter",
      style: getFontStyle(fontWeight),
    });
    textNode.fontName = { family: "Inter", style: getFontStyle(fontWeight) };
    textNode.fontSize = parseInt(fontSize);
  } catch (error) {
    console.error("Error setting font size", error);
  }

  setCharacters(textNode, text);

  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(fontColor.r) || 0,
      g: parseFloat(fontColor.g) || 0,
      b: parseFloat(fontColor.b) || 0,
    },
    opacity: parseFloat(fontColor.a) || 1,
  };
  textNode.fills = [paintStyle];

  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(textNode);
  } else {
    figma.currentPage.appendChild(textNode);
  }

  return {
    id: textNode.id,
    name: textNode.name,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    characters: textNode.characters,
    fontSize: textNode.fontSize,
    fontWeight: fontWeight,
    fontColor: fontColor,
    fontName: textNode.fontName,
    fills: textNode.fills,
    parentId: textNode.parent ? textNode.parent.id : undefined,
  };
}

async function setFillColor(params) {
  console.log("setFillColor", params);
  const {
    nodeId,
    color: { r, g, b, a },
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("fills" in node)) {
    throw new Error(`Node does not support fills: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: parseFloat(r) || 0,
    g: parseFloat(g) || 0,
    b: parseFloat(b) || 0,
    a: parseFloat(a) || 1,
  };

  // Set fill
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(rgbColor.r),
      g: parseFloat(rgbColor.g),
      b: parseFloat(rgbColor.b),
    },
    opacity: parseFloat(rgbColor.a),
  };

  console.log("paintStyle", paintStyle);

  node.fills = [paintStyle];

  return {
    id: node.id,
    name: node.name,
    fills: [paintStyle],
  };
}

async function setStrokeColor(params) {
  const {
    nodeId,
    color: { r, g, b, a },
    weight = 1,
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("strokes" in node)) {
    throw new Error(`Node does not support strokes: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: r !== undefined ? r : 0,
    g: g !== undefined ? g : 0,
    b: b !== undefined ? b : 0,
    a: a !== undefined ? a : 1,
  };

  // Set stroke
  const paintStyle = {
    type: "SOLID",
    color: {
      r: rgbColor.r,
      g: rgbColor.g,
      b: rgbColor.b,
    },
    opacity: rgbColor.a,
  };

  node.strokes = [paintStyle];

  // Set stroke weight if available
  if ("strokeWeight" in node) {
    node.strokeWeight = weight;
  }

  return {
    id: node.id,
    name: node.name,
    strokes: node.strokes,
    strokeWeight: "strokeWeight" in node ? node.strokeWeight : undefined,
  };
}

async function moveNode(params) {
  const { nodeId, x, y, parentId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Update position if provided
  if (x !== undefined && y !== undefined) {
    if (!("x" in node) || !("y" in node)) {
      throw new Error(`Node does not support position: ${nodeId}`);
    }
    node.x = x;
    node.y = y;
  }

  // Update parent if provided
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(node);
  }

  return {
    id: node.id,
    name: node.name,
    x: "x" in node ? node.x : undefined,
    y: "y" in node ? node.y : undefined,
    parentId: node.parent ? node.parent.id : undefined
  };
}

async function resizeNode(params) {
  const { nodeId, width, height } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (width === undefined || height === undefined) {
    throw new Error("Missing width or height parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("resize" in node)) {
    throw new Error(`Node does not support resizing: ${nodeId}`);
  }

  node.resize(width, height);

  return {
    id: node.id,
    name: node.name,
    width: node.width,
    height: node.height,
  };
}

async function deleteNode(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Save node info before deleting
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  node.remove();

  return nodeInfo;
}

async function getStyles() {
  const styles = {
    colors: await figma.getLocalPaintStylesAsync(),
    texts: await figma.getLocalTextStylesAsync(),
    effects: await figma.getLocalEffectStylesAsync(),
    grids: await figma.getLocalGridStylesAsync(),
  };

  return {
    colors: styles.colors.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      paint: style.paints[0],
    })),
    texts: styles.texts.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      fontSize: style.fontSize,
      fontName: style.fontName,
    })),
    effects: styles.effects.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
    grids: styles.grids.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
  };
}

async function getLocalComponents() {
  console.log("[getLocalComponents] Getting local components...");
  
  try {
    await figma.loadAllPagesAsync();
    console.log("[getLocalComponents] All pages loaded");

    const components = figma.root.findAllWithCriteria({
      types: ["COMPONENT"],
    });

    console.log(`[getLocalComponents] Found ${components.length} local components`);

    return {
      count: components.length,
      components: components.map((component) => ({
        id: component.id,
        name: component.name,
        key: "key" in component ? component.key : null,
        description: component.description || "",
        remote: false,
        libraryName: "Local",
        documentationLinks: component.documentationLinks || [],
        width: component.width,
        height: component.height,
        type: component.type
      })),
    };
  } catch (error) {
    console.error("[getLocalComponents] Error:", error);
    throw new Error(`Error getting local components: ${error.message}`);
  }
}

async function getTeamComponents() {
  console.log("[getTeamComponents] Getting team library components...");
  
  try {
    // Get all available components from team libraries
    const components = await figma.teamLibrary.getAvailableComponentsAsync();
    
    // Map components to our expected format
    const mappedComponents = components.map(component => ({
      key: component.key,
      name: component.name,
      description: component.description || "",
      remote: true,
      libraryName: component.libraryName || "Team Library",
      documentationLinks: [],
      type: "COMPONENT",
      fileKey: component.fileKey
    }));

    console.log(`[getTeamComponents] Found ${mappedComponents.length} team components`);

    return {
      count: mappedComponents.length,
      components: mappedComponents
    };
  } catch (error) {
    console.error("[getTeamComponents] Error:", error);
    throw new Error(`Error getting team components: ${error.message}`);
  }
}

async function getAllComponents() {
  console.log("[getAllComponents] Getting all components (local + team)...");
  
  try {
    const [localResult, teamResult] = await Promise.all([
      getLocalComponents(),
      getTeamComponents()
    ]);

    const allComponents = {
      count: localResult.count + teamResult.count,
      components: [
        ...localResult.components,
        ...teamResult.components
      ]
    };

    console.log(`[getAllComponents] Found total ${allComponents.count} components`);
    console.log(`[getAllComponents] - ${localResult.count} local components`);
    console.log(`[getAllComponents] - ${teamResult.count} team components`);

    return allComponents;
  } catch (error) {
    console.error("[getAllComponents] Error:", error);
    throw new Error(`Error getting all components: ${error.message}`);
  }
}

/**
 * Creates an instance of a component and optionally moves it to a parent node.
 * 
 * Note: Due to how Figma handles component instances, we can't directly create an instance
 * inside a parent frame like we can with other elements (rectangles, frames, text, etc.).
 * Instead, we use a two-step process:
 * 1. Create the instance on the current page
 * 2. Move it to the desired parent frame if specified
 * 
 * This approach is more reliable than trying to parent during creation, which can lead
 * to "node does not exist" errors.
 */
async function createComponentInstance(params) {
  const { componentKey, x = 0, y = 0, parentId } = params || {};

  console.log("[createComponentInstance] Starting with params:", { componentKey, x, y, parentId });

  if (!componentKey) {
    throw new Error("Missing componentKey parameter");
  }

  try {
    console.log("[createComponentInstance] Loading all pages...");
    await figma.loadAllPagesAsync();

    // First try to find the component locally
    console.log("[createComponentInstance] Searching for local components...");
    const components = figma.root.findAllWithCriteria({
      types: ["COMPONENT"]
    });
    
    // Find the component with matching key
    const localComponent = components.find(comp => comp.key === componentKey);
    
    let component;
    if (localComponent) {
      console.log("[createComponentInstance] Found local component:", { 
        name: localComponent.name, 
        id: localComponent.id,
        key: localComponent.key,
        source: "local"
      });
      component = localComponent;
    } else {
      console.log("[createComponentInstance] Component not found locally, trying to import from library...");
      try {
        component = await figma.importComponentByKeyAsync(componentKey);
        console.log("[createComponentInstance] Import successful:", { 
          name: component.name, 
          id: component.id,
          key: component.key,
          source: "library"
        });
      } catch (importError) {
        console.error("[createComponentInstance] Import failed:", importError);
        throw importError;
      }
    }

    if (!component) {
      throw new Error("Component not found locally or in libraries");
    }

    // Step 1: Create the instance on the current page
    console.log("[createComponentInstance] Creating instance from component:", { 
      name: component.name, 
      id: component.id,
      source: localComponent ? "local" : "library"
    });
    const instance = component.createInstance();
    console.log("[createComponentInstance] Instance created:", { 
      id: instance.id, 
      name: instance.name,
      initialParent: instance.parent ? { id: instance.parent.id, name: instance.parent.name, type: instance.parent.type } : "none"
    });

    // Set initial position
    instance.x = x;
    instance.y = y;

    // Ensure instance is on the current page
    figma.currentPage.appendChild(instance);

    // Step 2: If a parent is specified, move the instance to it
    if (parentId) {
      console.log("[createComponentInstance] Moving instance to parent:", parentId);
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (!parentNode) {
        throw new Error(`Parent node not found with ID: ${parentId}`);
      }
      if (!("appendChild" in parentNode)) {
        throw new Error(`Parent node does not support children: ${parentId}`);
      }

      // Move the instance to the parent
      // Note: For auto-layout frames, x/y coordinates will be ignored
      parentNode.appendChild(instance);
      console.log("[createComponentInstance] Instance moved to parent successfully");
    }

    const result = {
      id: instance.id,
      name: instance.name,
      x: instance.x,
      y: instance.y,
      width: instance.width,
      height: instance.height,
      componentId: instance.componentId,
      source: localComponent ? "local" : "library",
      libraryName: localComponent ? "Local" : component.description,
      parentId: instance.parent ? instance.parent.id : undefined
    };
    
    console.log("[createComponentInstance] Final instance state:", {
      id: instance.id,
      parentId: instance.parent ? instance.parent.id : undefined,
      x: instance.x,
      y: instance.y,
      parent: instance.parent ? { id: instance.parent.id, name: instance.parent.name, type: instance.parent.type } : "none"
    });
    return result;
  } catch (error) {
    console.error("[createComponentInstance] Error:", error);
    throw new Error(`Error creating component instance: ${error.message}`);
  }
}

async function exportNodeAsImage(params) {
  const { nodeId, format = "PNG", scale = 1 } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("exportAsync" in node)) {
    throw new Error(`Node does not support exporting: ${nodeId}`);
  }

  try {
    const settings = {
      format: format,
      constraint: { type: "SCALE", value: scale },
    };

    const bytes = await node.exportAsync(settings);

    let mimeType;
    switch (format) {
      case "PNG":
        mimeType = "image/png";
        break;
      case "JPG":
        mimeType = "image/jpeg";
        break;
      case "SVG":
        mimeType = "image/svg+xml";
        break;
      case "PDF":
        mimeType = "application/pdf";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    // Convert to base64
    const uint8Array = new Uint8Array(bytes);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const imageData = `data:${mimeType};base64,${base64}`;

    return {
      nodeId,
      format,
      scale,
      mimeType,
      imageData,
    };
  } catch (error) {
    throw new Error(`Error exporting node as image: ${error.message}`);
  }
}

async function executeCode(params) {
  const { code } = params || {};

  if (!code) {
    throw new Error("Missing code parameter");
  }

  try {
    // Execute the provided code
    // Note: This is potentially unsafe, but matches the Blender MCP functionality
    const executeFn = new Function(
      "figma",
      "selection",
      `
      try {
        const result = (async () => {
          ${code}
        })();
        return result;
      } catch (error) {
        throw new Error('Error executing code: ' + error.message);
      }
    `
    );

    const result = await executeFn(figma, figma.currentPage.selection);
    return { result };
  } catch (error) {
    throw new Error(`Error executing code: ${error.message}`);
  }
}

async function setCornerRadius(params) {
  const { nodeId, radius, corners } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (radius === undefined) {
    throw new Error("Missing radius parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Check if node supports corner radius
  if (!("cornerRadius" in node)) {
    throw new Error(`Node does not support corner radius: ${nodeId}`);
  }

  // If corners array is provided, set individual corner radii
  if (corners && Array.isArray(corners) && corners.length === 4) {
    if ("topLeftRadius" in node) {
      // Node supports individual corner radii
      if (corners[0]) node.topLeftRadius = radius;
      if (corners[1]) node.topRightRadius = radius;
      if (corners[2]) node.bottomRightRadius = radius;
      if (corners[3]) node.bottomLeftRadius = radius;
    } else {
      // Node only supports uniform corner radius
      node.cornerRadius = radius;
    }
  } else {
    // Set uniform corner radius
    node.cornerRadius = radius;
  }

  return {
    id: node.id,
    name: node.name,
    cornerRadius: "cornerRadius" in node ? node.cornerRadius : undefined,
    topLeftRadius: "topLeftRadius" in node ? node.topLeftRadius : undefined,
    topRightRadius: "topRightRadius" in node ? node.topRightRadius : undefined,
    bottomRightRadius:
      "bottomRightRadius" in node ? node.bottomRightRadius : undefined,
    bottomLeftRadius:
      "bottomLeftRadius" in node ? node.bottomLeftRadius : undefined,
  };
}

async function setTextContent(params) {
  const { nodeId, text } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (text === undefined) {
    throw new Error("Missing text parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    
    await setCharacters(node, text);

    return {
      id: node.id,
      name: node.name,
      characters: node.characters,
      fontName: node.fontName
    };
  } catch (error) {
    throw new Error(`Error setting text content: ${error.message}`);
  }
}

// Initialize settings on load
(async function initializePlugin() {
  try {
    const savedSettings = await figma.clientStorage.getAsync("settings");
    if (savedSettings) {
      if (savedSettings.serverPort) {
        state.serverPort = savedSettings.serverPort;
      }
    }

    // Send initial settings to UI
    figma.ui.postMessage({
      type: "init-settings",
      settings: {
        serverPort: state.serverPort,
      },
    });
  } catch (error) {
    console.error("Error loading settings:", error);
  }
})();

function uniqBy(arr, predicate) {
  const cb = typeof predicate === "function" ? predicate : (o) => o[predicate];
  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
}
const setCharacters = async (node, characters, options) => {
  const fallbackFont = (options && options.fallbackFont) || {
    family: "Inter",
    style: "Regular",
  };
  try {
    if (node.fontName === figma.mixed) {
      if (options && options.smartStrategy === "prevail") {
        const fontHashTree = {};
        for (let i = 1; i < node.characters.length; i++) {
          const charFont = node.getRangeFontName(i - 1, i);
          const key = `${charFont.family}::${charFont.style}`;
          fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
        }
        const prevailedTreeItem = Object.entries(fontHashTree).sort(
          (a, b) => b[1] - a[1]
        )[0];
        const [family, style] = prevailedTreeItem[0].split("::");
        const prevailedFont = {
          family,
          style,
        };
        await figma.loadFontAsync(prevailedFont);
        node.fontName = prevailedFont;
      } else if (options && options.smartStrategy === "strict") {
        return setCharactersWithStrictMatchFont(node, characters, fallbackFont);
      } else if (options && options.smartStrategy === "experimental") {
        return setCharactersWithSmartMatchFont(node, characters, fallbackFont);
      } else {
        const firstCharFont = node.getRangeFontName(0, 1);
        await figma.loadFontAsync(firstCharFont);
        node.fontName = firstCharFont;
      }
    } else {
      await figma.loadFontAsync({
        family: node.fontName.family,
        style: node.fontName.style,
      });
    }
  } catch (err) {
    console.warn(
      `Failed to load "${node.fontName["family"]} ${node.fontName["style"]}" font and replaced with fallback "${fallbackFont.family} ${fallbackFont.style}"`,
      err
    );
    await figma.loadFontAsync(fallbackFont);
    node.fontName = fallbackFont;
  }
  try {
    node.characters = characters;
    return true;
  } catch (err) {
    console.warn(`Failed to set characters. Skipped.`, err);
    return false;
  }
};

const setCharactersWithStrictMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const fontHashTree = {};
  for (let i = 1; i < node.characters.length; i++) {
    const startIdx = i - 1;
    const startCharFont = node.getRangeFontName(startIdx, i);
    const startCharFontVal = `${startCharFont.family}::${startCharFont.style}`;
    while (i < node.characters.length) {
      i++;
      const charFont = node.getRangeFontName(i - 1, i);
      if (startCharFontVal !== `${charFont.family}::${charFont.style}`) {
        break;
      }
    }
    fontHashTree[`${startIdx}_${i}`] = startCharFontVal;
  }
  await figma.loadFontAsync(fallbackFont);
  node.fontName = fallbackFont;
  node.characters = characters;
  console.log(fontHashTree);
  await Promise.all(
    Object.keys(fontHashTree).map(async (range) => {
      console.log(range, fontHashTree[range]);
      const [start, end] = range.split("_");
      const [family, style] = fontHashTree[range].split("::");
      const matchedFont = {
        family,
        style,
      };
      await figma.loadFontAsync(matchedFont);
      return node.setRangeFontName(Number(start), Number(end), matchedFont);
    })
  );
  return true;
};

const getDelimiterPos = (str, delimiter, startIdx = 0, endIdx = str.length) => {
  const indices = [];
  let temp = startIdx;
  for (let i = startIdx; i < endIdx; i++) {
    if (
      str[i] === delimiter &&
      i + startIdx !== endIdx &&
      temp !== i + startIdx
    ) {
      indices.push([temp, i + startIdx]);
      temp = i + startIdx + 1;
    }
  }
  temp !== endIdx && indices.push([temp, endIdx]);
  return indices.filter(Boolean);
};

const buildLinearOrder = (node) => {
  const fontTree = [];
  const newLinesPos = getDelimiterPos(node.characters, "\n");
  newLinesPos.forEach(([newLinesRangeStart, newLinesRangeEnd], n) => {
    const newLinesRangeFont = node.getRangeFontName(
      newLinesRangeStart,
      newLinesRangeEnd
    );
    if (newLinesRangeFont === figma.mixed) {
      const spacesPos = getDelimiterPos(
        node.characters,
        " ",
        newLinesRangeStart,
        newLinesRangeEnd
      );
      spacesPos.forEach(([spacesRangeStart, spacesRangeEnd], s) => {
        const spacesRangeFont = node.getRangeFontName(
          spacesRangeStart,
          spacesRangeEnd
        );
        if (spacesRangeFont === figma.mixed) {
          const spacesRangeFont = node.getRangeFontName(
            spacesRangeStart,
            spacesRangeStart[0]
          );
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        } else {
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        }
      });
    } else {
      fontTree.push({
        start: newLinesRangeStart,
        delimiter: "\n",
        family: newLinesRangeFont.family,
        style: newLinesRangeFont.style,
      });
    }
  });
  return fontTree
    .sort((a, b) => +a.start - +b.start)
    .map(({ family, style, delimiter }) => ({ family, style, delimiter }));
};

const setCharactersWithSmartMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const rangeTree = buildLinearOrder(node);
  const fontsToLoad = uniqBy(
    rangeTree,
    ({ family, style }) => `${family}::${style}`
  ).map(({ family, style }) => ({
    family,
    style,
  }));

  await Promise.all([...fontsToLoad, fallbackFont].map(figma.loadFontAsync));

  node.fontName = fallbackFont;
  node.characters = characters;

  let prevPos = 0;
  rangeTree.forEach(({ family, style, delimiter }) => {
    if (prevPos < node.characters.length) {
      const delimeterPos = node.characters.indexOf(delimiter, prevPos);
      const endPos =
        delimeterPos > prevPos ? delimeterPos : node.characters.length;
      const matchedFont = {
        family,
        style,
      };
      node.setRangeFontName(prevPos, endPos, matchedFont);
      prevPos = endPos + 1;
    }
  });
  return true;
};

// Variable-related functions

async function getLocalVariables(params) {
  const variables = await figma.variables.getLocalVariablesAsync();
  return variables.map(variable => ({
    id: variable.id,
    name: variable.name,
    key: variable.key,
    resolvedType: variable.resolvedType,
    description: variable.description,
    hiddenFromPublishing: variable.hiddenFromPublishing,
    scopes: variable.scopes,
    codeSyntax: variable.codeSyntax,
    remote: variable.remote,
    variableCollectionId: variable.variableCollectionId
  }));
}

async function getVariableCollections() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  return collections.map(collection => ({
    id: collection.id,
    name: collection.name,
    key: collection.key,
    modes: collection.modes.map(mode => ({
      modeId: mode.modeId,
      name: mode.name
    })),
    defaultModeId: collection.defaultModeId,
    remote: collection.remote,
    hiddenFromPublishing: collection.hiddenFromPublishing
  }));
}

async function getVariableById(params) {
  const { variableId } = params;
  if (!variableId) {
    throw new Error("Missing variableId parameter");
  }

  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error(`Variable not found with ID: ${variableId}`);
  }

  return {
    id: variable.id,
    name: variable.name,
    key: variable.key,
    resolvedType: variable.resolvedType,
    description: variable.description,
    hiddenFromPublishing: variable.hiddenFromPublishing,
    scopes: variable.scopes,
    codeSyntax: variable.codeSyntax,
    remote: variable.remote,
    variableCollectionId: variable.variableCollectionId
  };
}

async function createVariableCollection(params) {
  const { name, modes = [] } = params;
  if (!name) {
    throw new Error("Missing name parameter");
  }

  const collection = await figma.variables.createVariableCollectionAsync({
    name,
    modes: modes.map(modeName => ({ name: modeName }))
  });

  return {
    id: collection.id,
    name: collection.name,
    key: collection.key,
    modes: collection.modes.map(mode => ({
      modeId: mode.modeId,
      name: mode.name
    })),
    defaultModeId: collection.defaultModeId
  };
}

async function createVariable(params) {
  const { name, collectionId, type, description, value } = params;
  if (!name || !collectionId || !type) {
    throw new Error("Missing required parameters: name, collectionId, or type");
  }

  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error(`Variable collection not found with ID: ${collectionId}`);
  }

  const variable = await figma.variables.createVariableAsync({
    name,
    type,
    variableCollectionId: collectionId,
    description,
    value
  });

  return {
    id: variable.id,
    name: variable.name,
    key: variable.key,
    resolvedType: variable.resolvedType,
    description: variable.description,
    variableCollectionId: variable.variableCollectionId
  };
}

/**
 * Sets or changes a bound variable on a node.
 * Successfully tested with:
 * - Changing fill colors on frames (e.g., from Surface/Main to Foreground/Inverted)
 * - Changing fill colors on components (e.g., from Surface/Main to Foreground/Default)
 * 
 * @param {Object} params - The parameters for binding a variable
 * @param {string} params.nodeId - The ID of the node to modify
 * @param {string} params.property - The property to bind (e.g., 'fills', 'strokes')
 * @param {string} params.variableId - The ID of the variable to bind
 * @returns {Object} Result object with success status and details
 */
async function setBoundVariable(params) {
  const { nodeId, property, variableId } = params;
  if (!nodeId || !property || !variableId) {
    throw new Error("Missing required parameters: nodeId, property, or variableId");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error(`Variable not found with ID: ${variableId}`);
  }

  try {
    // Handle different property types according to the API
    if (property === "fills" || property === "strokes") {
      // For paint properties, we need to handle the array of paints
      const currentPaints = node[property];
      if (Array.isArray(currentPaints) && currentPaints.length > 0) {
        // Get the first paint as a base (or create a new one if none exists)
        const basePaint = currentPaints[0] || { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
        
        // Create a new paint with the variable bound to it
        const boundPaint = figma.variables.setBoundVariableForPaint(
          basePaint,
          "color", // We're binding to the color property of the paint
          variable
        );
        
        // Update the node's paints array
        node[property] = [boundPaint];
      } else {
        // If no paints exist, create a new one
        const newPaint = figma.variables.setBoundVariableForPaint(
          { type: "SOLID", color: { r: 0, g: 0, b: 0 } },
          "color",
          variable
        );
        node[property] = [newPaint];
      }
    } else if (property === "effects") {
      // For effects, use setBoundVariableForEffect
      const currentEffects = node[property];
      if (Array.isArray(currentEffects) && currentEffects.length > 0) {
        const baseEffect = currentEffects[0];
        const boundEffect = figma.variables.setBoundVariableForEffect(
          baseEffect,
          "radius", // or other effect property
          variable
        );
        node[property] = [boundEffect];
      }
    } else if (property === "layoutGrids") {
      // For layout grids, use setBoundVariableForLayoutGrid
      const currentGrids = node[property];
      if (Array.isArray(currentGrids) && currentGrids.length > 0) {
        const baseGrid = currentGrids[0];
        const boundGrid = figma.variables.setBoundVariableForLayoutGrid(
          baseGrid,
          "count", // or other grid property
          variable
        );
        node[property] = [boundGrid];
      }
    } else {
      // For simple properties (width, height, opacity, etc.)
      node.setBoundVariable(property, variable);
    }

    // Return success result with bound variable info
    return {
      id: node.id,
      name: node.name,
      property,
      variableId: variable.id,
      variableName: variable.name,
      success: true
    };
  } catch (error) {
    console.error("Error setting bound variable:", error);
    return {
      id: node.id,
      name: node.name,
      property,
      variableId: variable.id,
      success: false,
      error: error.message
    };
  }
}

/**
 * Sets properties on a component instance, including variants.
 * @param {Object} params - The parameters for setting instance properties
 * @param {string} params.nodeId - The ID of the instance to modify
 * @param {Object} params.properties - Properties to set on the instance
 * @returns {Object} Result object with success status and details
 */
async function setInstanceProperties(params) {
  const { nodeId, properties } = params;
  if (!nodeId || !properties) {
    throw new Error("Missing required parameters: nodeId or properties");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "INSTANCE") {
    throw new Error(`Node is not a component instance: ${nodeId}`);
  }

  try {
    // Get the main component
    const mainComponent = await node.getMainComponentAsync();
    if (!mainComponent) {
      throw new Error("Could not find main component");
    }

    // Get the component set
    const componentSet = mainComponent.parent;
    if (!componentSet || componentSet.type !== "COMPONENT_SET") {
      throw new Error("Component is not part of a component set");
    }

    // Get all variants in this component set
    const variants = componentSet.children;
    
    // Build a map of valid properties and their possible values
    const validProperties = {};
    variants.forEach(variant => {
      if (variant.type === "COMPONENT") {
        const variantProperties = variant.name.split(", ");
        variantProperties.forEach(prop => {
          const [key, value] = prop.split("=");
          if (!validProperties[key]) {
            validProperties[key] = new Set();
          }
          validProperties[key].add(value);
        });
      }
    });

    console.log("Available properties:", validProperties);

    // Set the properties directly
    await node.setProperties(properties);

    return {
      success: true,
      message: `Updated instance "${node.name}" with properties: ${JSON.stringify(properties)}`,
      availableProperties: Object.fromEntries(
        Object.entries(validProperties).map(([key, values]) => [key, Array.from(values)])
      )
    };
  } catch (error) {
    console.error('Error setting instance properties:', error);
    throw error;
  }
}
