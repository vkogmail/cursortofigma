import {
  type ThemesJsonTheme,
  type NodeTokenMapping,
  mapSelectionVariablesToTokensWithFallback,
} from "./figmaTokenMapping.js";
import {
  loadThemes,
  type TokensConfig,
  loadTokensConfigFromEnv,
} from "./tokensConfig.js";
import type {
  ComponentDescription,
  ComponentVariantRaw,
  SerializedNode,
} from "./componentDescription.js";

export interface TokenizedComponentVariant {
  id: string;
  name: string;
  props: ComponentVariantRaw["props"];
  tokens: NodeTokenMapping[];
  structure?: SerializedNode;
}

export interface TokenizedComponentDescription
  extends Omit<ComponentDescription, "variants"> {
  variants: TokenizedComponentVariant[];
}

export interface GeneratedReactProp {
  name: string;
  type: string;
  optional: boolean;
  defaultValueExpression?: string;
}

export interface ReactComponentGenerationOptions {
  componentName?: string;
  generatePropsInterface?: boolean;
  propsInterfaceName?: string;
  tokensConfig?: TokensConfig; // NEW: Pass config to include CSS import hints
}

export interface MapComponentOptions {
  themes?: ThemesJsonTheme[];
  tokensConfig?: TokensConfig;
}

export async function mapComponentDescriptionToTokenized(
  description: ComponentDescription,
  options: MapComponentOptions = {}
): Promise<TokenizedComponentDescription> {
  const cfg = options.tokensConfig || loadTokensConfigFromEnv();
  // Try to load themes, but do NOT fail hard if remote token loading breaks
  // (e.g. 404 for $themes.json, network issues, etc). When themes are missing
  // we fall back to name-based token mapping in mapSelectionVariablesToTokensWithFallback.
  let themes: ThemesJsonTheme[] | undefined = options.themes;
  if (!themes) {
    try {
      themes = await loadThemes(cfg);
    } catch (error) {
      // Log to stderr so it shows up in MCP logs, but keep going so that
      // React component generation can still succeed with best-effort tokens.
      const message =
        error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(
        `[mapComponentDescriptionToTokenized] Failed to load themes from remote/local tokens config: ${message}. ` +
          "Proceeding without themes; variable IDs will be mapped to token paths by name fallback only."
      );
      themes = undefined;
    }
  }

  const tokenizedVariants: TokenizedComponentVariant[] = description.variants.map(
    (variant) => {
      const nodeMappings: NodeTokenMapping[] =
        mapSelectionVariablesToTokensWithFallback(variant.variableUsage, themes);

      return {
        id: variant.id,
        name: variant.name,
        props: variant.props,
        tokens: nodeMappings,
        structure: variant.structure,
      };
    }
  );

  return {
    ...description,
    variants: tokenizedVariants,
  };
}

// ---------------------------------------------------------------------------
// React component code generation helpers
// ---------------------------------------------------------------------------

function toPascalCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function buildReactPropsFromComponent(
  description: TokenizedComponentDescription
): GeneratedReactProp[] {
  return description.props.map((prop) => {
    let type = "unknown";
    let optional = true;
    let defaultValueExpression: string | undefined;

    if (prop.kind === "boolean") {
      type = "boolean";
      optional = false;
      if (typeof prop.defaultValue === "boolean") {
        defaultValueExpression = String(prop.defaultValue);
      }
    } else if (prop.kind === "number") {
      type = "number";
      if (typeof prop.defaultValue === "number") {
        defaultValueExpression = String(prop.defaultValue);
      }
    } else if (prop.kind === "text") {
      type = "string";
      if (typeof prop.defaultValue === "string") {
        defaultValueExpression = JSON.stringify(prop.defaultValue);
      }
    } else if (prop.options && prop.options.length > 0) {
      const literals = Array.from(new Set(prop.options))
        .map((v) =>
          typeof v === "string" ? JSON.stringify(v) : v === null ? "null" : String(v)
        )
        .join(" | ");
      type = literals || "string";
      optional = false;
      if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
        defaultValueExpression =
          typeof prop.defaultValue === "string"
            ? JSON.stringify(prop.defaultValue)
            : String(prop.defaultValue);
      }
    } else {
      type = "any";
    }

    return {
      name: prop.name,
      type,
      optional,
      defaultValueExpression,
    };
  });
}

// Note: Helper functions for building styles are generated inline in the React component code
// These are not used here but kept for reference

export function generateReactComponentFromTokenized(
  description: TokenizedComponentDescription,
  options: ReactComponentGenerationOptions = {}
): string {
  const componentName =
    options.componentName || toPascalCase(description.name || "FigmaComponent");
  const propsInterfaceName =
    options.propsInterfaceName || `${componentName}Props`;
  const generatePropsInterface =
    options.generatePropsInterface !== false;

  const generatedProps = buildReactPropsFromComponent(description);

  const variantEntries = description.variants.map((variant) => {
    const variantKey =
      Object.keys(variant.props).length === 0
        ? "default"
        : Object.entries(variant.props)
            .map(([k, v]) => `${k}=${v}`)
            .join(",");

    // Build node ID -> token mappings as object (for JSON serialization)
    const nodeTokenMapObj: Record<string, NodeTokenMapping[]> = {};
    for (const nodeMapping of variant.tokens) {
      if (!nodeTokenMapObj[nodeMapping.nodeId]) {
        nodeTokenMapObj[nodeMapping.nodeId] = [];
      }
      nodeTokenMapObj[nodeMapping.nodeId].push(nodeMapping);
    }

    const tokenPaths = new Set<string>();
    for (const nodeMapping of variant.tokens) {
      for (const t of nodeMapping.tokens) {
        if (t.tokenPath) {
          tokenPaths.add(t.tokenPath);
        }
      }
    }

    return {
      key: variantKey,
      variantName: variant.name,
      tokenPaths: Array.from(tokenPaths),
      structure: variant.structure,
      nodeTokenMapObj,
    };
  });

  const propsInterfaceLines: string[] = [];
  if (generatePropsInterface) {
    propsInterfaceLines.push(`export interface ${propsInterfaceName} {`);
    for (const prop of generatedProps) {
      const optionalFlag = prop.optional ? "?" : "";
      propsInterfaceLines.push(
        `  ${prop.name}${optionalFlag}: ${prop.type};`
      );
    }
    propsInterfaceLines.push("}");
  }

  const reactComponentLines: string[] = [];
  
  // NEW: Add CSS import instructions if CSS URLs are configured
  if (options.tokensConfig?.cssUrls && options.tokensConfig.cssUrls.length > 0) {
    reactComponentLines.push("// ============================================================================");
    reactComponentLines.push("// DESIGN TOKEN CSS IMPORTS");
    reactComponentLines.push("// ============================================================================");
    reactComponentLines.push("// Add these @import statements to your app's globals.css or main CSS file:");
    reactComponentLines.push("// (These CSS files contain the actual token values as CSS variables)");
    reactComponentLines.push("");
    for (const cssUrl of options.tokensConfig.cssUrls) {
      reactComponentLines.push(`// @import url("${cssUrl}");`);
    }
    reactComponentLines.push("");
    reactComponentLines.push("// ============================================================================");
    reactComponentLines.push("");
  }
  
  reactComponentLines.push(`import React from "react";`);
  reactComponentLines.push("");
  reactComponentLines.push(
    "// Token references discovered from the Figma component. " +
      "Wire these up to your design-system tokens runtime."
  );
  reactComponentLines.push(
    "const VARIANT_DATA: Record<string, { figmaVariantName: string; tokenPaths: string[]; structure: any; nodeTokenMapObj: Record<string, any[]> }> = {"
  );
  for (const variant of variantEntries) {
    const keyLiteral = JSON.stringify(variant.key);
    const tokenArrayLiteral =
      variant.tokenPaths.length > 0
        ? `[${variant.tokenPaths.map((t) => JSON.stringify(t)).join(", ")}]`
        : "[]";
    reactComponentLines.push(
      `  ${keyLiteral}: { figmaVariantName: ${JSON.stringify(
        variant.variantName
      )}, tokenPaths: ${tokenArrayLiteral}, structure: ${JSON.stringify(variant.structure, null, 2)}, nodeTokenMapObj: ${JSON.stringify(variant.nodeTokenMapObj, null, 2)} },`
    );
  }
  reactComponentLines.push("};");
  reactComponentLines.push("");
  reactComponentLines.push(
    "// Helper: convert a props object into a variant key that matches VARIANT_TOKENS."
  );
  reactComponentLines.push(
    "function getVariantKeyFromProps(props: Record<string, any>): string {"
  );
  reactComponentLines.push(
    "  const entries = Object.entries(props).filter(([, v]) => v !== undefined);"
  );
  reactComponentLines.push(
    '  if (entries.length === 0) return "default";'
  );
  reactComponentLines.push(
    '  return entries.map(([k, v]) => `${k}=${v}`).join(",");'
  );
  reactComponentLines.push("}");
  reactComponentLines.push("");

  // Add helper functions for building styles
  reactComponentLines.push("function buildTokenPathToCssVar(tokenPath: string): string {");
  reactComponentLines.push('  return `var(--${tokenPath.replace(/\\./g, "-")})`;');
  reactComponentLines.push("}");
  reactComponentLines.push("");

  reactComponentLines.push("function buildStyleFromNode(node: any, nodeTokenMappings: Map<string, any>): React.CSSProperties {");
  reactComponentLines.push("  const style: React.CSSProperties = {};");
  reactComponentLines.push("  if (node.width !== undefined) style.width = `${node.width}px`;");
  reactComponentLines.push("  if (node.height !== undefined) style.height = `${node.height}px`;");
  reactComponentLines.push("  if (node.opacity !== undefined) style.opacity = node.opacity;");
  reactComponentLines.push("  if (typeof node.cornerRadius === 'number') style.borderRadius = `${node.cornerRadius}px`;");
  reactComponentLines.push("  if (node.fills && node.fills[0]?.type === 'SOLID' && node.fills[0]?.color) {");
  reactComponentLines.push("    const mappings = nodeTokenMappings.get(node.id) || [];");
  reactComponentLines.push("    const fillToken = mappings.find((m: any) => m.tokens?.some((t: any) => t.props?.includes('fills')));");
  reactComponentLines.push("    if (fillToken?.tokens?.[0]?.tokenPath) {");
  reactComponentLines.push("      style.backgroundColor = buildTokenPathToCssVar(fillToken.tokens[0].tokenPath);");
  reactComponentLines.push("    } else {");
  reactComponentLines.push("      const { r, g, b, a = 1 } = node.fills[0].color;");
  reactComponentLines.push("      style.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;");
  reactComponentLines.push("    }");
  reactComponentLines.push("  }");
  reactComponentLines.push("  if (node.strokes && node.strokes[0]?.type === 'SOLID' && node.strokes[0]?.color) {");
  reactComponentLines.push("    const mappings = nodeTokenMappings.get(node.id) || [];");
  reactComponentLines.push("    const strokeToken = mappings.find((m: any) => m.tokens?.some((t: any) => t.props?.includes('strokes')));");
  reactComponentLines.push("    if (strokeToken?.tokens?.[0]?.tokenPath) {");
  reactComponentLines.push("      style.borderColor = buildTokenPathToCssVar(strokeToken.tokens[0].tokenPath);");
  reactComponentLines.push("    } else {");
  reactComponentLines.push("      const { r, g, b, a = 1 } = node.strokes[0].color;");
  reactComponentLines.push("      style.borderColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;");
  reactComponentLines.push("    }");
  reactComponentLines.push("  }");
  reactComponentLines.push("  if (node.strokeWeight !== undefined) {");
  reactComponentLines.push("    style.borderWidth = `${node.strokeWeight}px`;");
  reactComponentLines.push("    style.borderStyle = 'solid';");
  reactComponentLines.push("  }");
  reactComponentLines.push("  if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {");
  reactComponentLines.push("    style.display = 'flex';");
  reactComponentLines.push("    style.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';");
  reactComponentLines.push("    if (node.primaryAxisAlignItems === 'CENTER') style.justifyContent = 'center';");
  reactComponentLines.push("    else if (node.primaryAxisAlignItems === 'MAX') style.justifyContent = 'flex-end';");
  reactComponentLines.push("    else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') style.justifyContent = 'space-between';");
  reactComponentLines.push("    else style.justifyContent = 'flex-start';");
  reactComponentLines.push("    if (node.counterAxisAlignItems === 'CENTER') style.alignItems = 'center';");
  reactComponentLines.push("    else if (node.counterAxisAlignItems === 'MAX') style.alignItems = 'flex-end';");
  reactComponentLines.push("    else style.alignItems = 'flex-start';");
  reactComponentLines.push("    if (node.itemSpacing !== undefined) style.gap = `${node.itemSpacing}px`;");
  reactComponentLines.push("    if (node.paddingLeft !== undefined) style.paddingLeft = `${node.paddingLeft}px`;");
  reactComponentLines.push("    if (node.paddingRight !== undefined) style.paddingRight = `${node.paddingRight}px`;");
  reactComponentLines.push("    if (node.paddingTop !== undefined) style.paddingTop = `${node.paddingTop}px`;");
  reactComponentLines.push("    if (node.paddingBottom !== undefined) style.paddingBottom = `${node.paddingBottom}px`;");
  reactComponentLines.push("  }");
  reactComponentLines.push("  if (node.fontSize !== undefined) style.fontSize = `${node.fontSize}px`;");
  reactComponentLines.push("  if (node.fontFamily !== undefined) style.fontFamily = node.fontFamily;");
  reactComponentLines.push("  if (node.fontWeight !== undefined) style.fontWeight = node.fontWeight;");
  reactComponentLines.push("  if (node.textAlignHorizontal) style.textAlign = node.textAlignHorizontal.toLowerCase();");
  reactComponentLines.push("  if (node.x !== undefined || node.y !== undefined) style.position = 'absolute';");
  reactComponentLines.push("  return style;");
  reactComponentLines.push("}");
  reactComponentLines.push("");

  reactComponentLines.push("function nodeToJSX(node: any, nodeTokenMappings: Map<string, any>): React.ReactElement {");
  reactComponentLines.push("  const style = buildStyleFromNode(node, nodeTokenMappings);");
  reactComponentLines.push("  const props: any = {");
  reactComponentLines.push("    'data-figma-node-id': node.id,");
  reactComponentLines.push("    'data-figma-node-name': node.name,");
  reactComponentLines.push("    style,");
  reactComponentLines.push("  };");
  reactComponentLines.push("");
  reactComponentLines.push("  // Handle text nodes");
  reactComponentLines.push("  if (node.type === 'TEXT') {");
  reactComponentLines.push("    return React.createElement('span', props, node.characters || '');");
  reactComponentLines.push("  }");
  reactComponentLines.push("");
  reactComponentLines.push("  // Handle vector/path nodes");
  reactComponentLines.push("  if ((node.type === 'VECTOR' || node.type === 'ELLIPSE' || node.type === 'LINE') && node.vectorPaths && node.vectorPaths.length > 0) {");
  reactComponentLines.push("    const viewBox = `0 0 ${node.width || 0} ${node.height || 0}`;");
  reactComponentLines.push("    return React.createElement('svg', {");
  reactComponentLines.push("      ...props,");
  reactComponentLines.push("      width: node.width,");
  reactComponentLines.push("      height: node.height,");
  reactComponentLines.push("      viewBox,");
  reactComponentLines.push("      style: { ...style, position: 'absolute' },");
  reactComponentLines.push("    }, node.vectorPaths.map((path: any, i: number) =>");
  reactComponentLines.push("      React.createElement('path', {");
  reactComponentLines.push("        key: i,");
  reactComponentLines.push("        d: path.data,");
  reactComponentLines.push("        fill: 'currentColor',");
  reactComponentLines.push("      })");
  reactComponentLines.push("    ));");
  reactComponentLines.push("  }");
  reactComponentLines.push("");
  reactComponentLines.push("  // Handle nodes with children");
  reactComponentLines.push("  if (node.children && node.children.length > 0) {");
  reactComponentLines.push("    return React.createElement('div', props,");
  reactComponentLines.push("      ...node.children.map((child: any) => nodeToJSX(child, nodeTokenMappings))");
  reactComponentLines.push("    );");
  reactComponentLines.push("  }");
  reactComponentLines.push("");
  reactComponentLines.push("  // Empty node");
  reactComponentLines.push("  return React.createElement('div', props);");
  reactComponentLines.push("}");
  reactComponentLines.push("");

  if (generatePropsInterface) {
    reactComponentLines.push(...propsInterfaceLines);
    reactComponentLines.push("");
  }

  reactComponentLines.push(
    `export const ${componentName}: React.FC<${generatePropsInterface ? propsInterfaceName : "any"}> = (props) => {`
  );
  reactComponentLines.push(
    "  const variantKey = getVariantKeyFromProps(props);"
  );
  reactComponentLines.push(
    '  const variantData = VARIANT_DATA[variantKey];'
  );
  reactComponentLines.push("  if (!variantData || !variantData.structure) return null;");
  reactComponentLines.push("");
  reactComponentLines.push("  // Build node token mappings map from object");
  reactComponentLines.push("  const nodeTokenMap = new Map<string, any>();");
  reactComponentLines.push("  for (const [nodeId, mappings] of Object.entries(variantData.nodeTokenMapObj)) {");
  reactComponentLines.push("    nodeTokenMap.set(nodeId, mappings);");
  reactComponentLines.push("  }");
  reactComponentLines.push("");
  reactComponentLines.push("  return nodeToJSX(variantData.structure, nodeTokenMap);");
  reactComponentLines.push("};");
  reactComponentLines.push("");
  reactComponentLines.push(
    `export default ${componentName};`
  );

  return reactComponentLines.join("\n");
}


