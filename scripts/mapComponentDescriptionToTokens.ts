// Generic host-side mapper:
// Turn the raw ComponentDescription (from the Figma plugin's
// `describe_component` command) into a tokenized description
// using the existing helpers in `figmaTokenMapping.ts`.
//
// This stays completely generic – it does not know about any
// particular component type. It simply maps:
//   variable IDs + names → token paths (via $themes.json)

import {
  type ThemesJsonTheme,
  type NodeTokenMapping,
  mapSelectionVariablesToTokensWithFallback,
} from "./figmaTokenMapping";
import { loadThemes, type TokensConfig, loadTokensConfigFromEnv } from "./tokensConfig";
import type {
  ComponentDescription,
  ComponentVariantRaw,
  ComponentProp,
} from "./componentDescription";

export interface TokenizedComponentVariant {
  id: string;
  name: string;
  /** Raw variant props such as { Size: "md", State: "hover" } */
  props: ComponentVariantRaw["props"];
  /**
   * Tokens mapped from the variant's variableUsage, using the
   * shared NodeTokenMapping shape:
   *   {
   *     nodeId, nodeName,
   *     tokens: [{ variableId, tokenPath, themeName, themeGroup, themeId, props }]
   *   }[]
   */
  tokens: NodeTokenMapping[];
}

export interface TokenizedComponentDescription
  extends Omit<ComponentDescription, "variants"> {
  variants: TokenizedComponentVariant[];
}

/**
 * Minimal shape for a React prop generated from a generic component prop.
 * This stays generic so consumers can adapt it to their own design system.
 */
export interface GeneratedReactProp {
  name: string;
  /** TypeScript type string, e.g. `"boolean"`, `"\"sm\" | \"md\" | \"lg\""` */
  type: string;
  optional: boolean;
  defaultValueExpression?: string;
}

export interface ReactComponentGenerationOptions {
  /**
   * Optional explicit React component name.
   * If omitted, we'll derive it from the Figma component name.
   */
  componentName?: string;
  /**
   * When true (default), generate a simple `Props` interface.
   */
  generatePropsInterface?: boolean;
  /**
   * Name of the props interface (defaults to `<ComponentName>Props`).
   */
  propsInterfaceName?: string;
}

export interface MapComponentOptions {
  /**
   * Optional pre-loaded themes. If omitted, we will load them
   * using the same config/env logic as the rest of the scripts.
   */
  themes?: ThemesJsonTheme[];
  /**
   * Optional explicit tokens config. If omitted, the mapper will
   * fall back to `loadTokensConfigFromEnv()`.
   */
  tokensConfig?: TokensConfig;
}

/**
 * Map a raw `ComponentDescription` (as returned by the plugin)
 * into a tokenized description using `$themes.json`.
 *
 * This is the main bridge between:
 *   - Figmas's variable IDs in `variableUsage`, and
 *   - your Exact design tokens (via $themes.json + metadata).
 */
export async function mapComponentDescriptionToTokenized(
  description: ComponentDescription,
  options: MapComponentOptions = {}
): Promise<TokenizedComponentDescription> {
  const cfg = options.tokensConfig || loadTokensConfigFromEnv();
  const themes =
    options.themes ||
    (await loadThemes(cfg)); // uses remote or local depending on env

  const tokenizedVariants: TokenizedComponentVariant[] = description.variants.map(
    (variant) => {
      const nodeMappings: NodeTokenMapping[] =
        mapSelectionVariablesToTokensWithFallback(variant.variableUsage, themes);

      return {
        id: variant.id,
        name: variant.name,
        props: variant.props,
        tokens: nodeMappings,
      };
    }
  );

  return {
    ...description,
    variants: tokenizedVariants,
  };
}

// -----------------------------------------------------------------------------
// React component code generation helpers
// -----------------------------------------------------------------------------

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
      // Variant-like/enum props: build a union of literal types
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
      // Fallback
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

/**
 * Generate a **React component source string** from a tokenized component
 * description. This is intentionally generic:
 * - It does NOT assume a specific component library or tokens runtime.
 * - It simply exposes token paths so you can wire them to your own token API.
 *
 * Typical usage:
 *   1) Call the MCP tool `describe_selection_component` to get the raw description.
 *   2) Map that description with `mapComponentDescriptionToTokenized`.
 *   3) Pass the result into `generateReactComponentFromTokenized` to get a React
 *      component skeleton you can paste into your codebase.
 */
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

  // Build a simple map of variant key → list of token paths.
  // The variant key is derived from the raw Figma variant props, e.g.
  //   { Size: "md", State: "hover" } → "Size=md,State=hover".
  const variantEntries = description.variants.map((variant) => {
    const variantKey =
      Object.keys(variant.props).length === 0
        ? "default"
        : Object.entries(variant.props)
            .map(([k, v]) => `${k}=${v}`)
            .join(",");

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
  reactComponentLines.push(`import React from "react";`);
  reactComponentLines.push("");
  reactComponentLines.push(
    "// Token references discovered from the Figma component. " +
      "Wire these up to your design-system tokens runtime."
  );
  reactComponentLines.push(
    "const VARIANT_TOKENS: Record<string, { figmaVariantName: string; tokenPaths: string[] }> = {"
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
      )}, tokenPaths: ${tokenArrayLiteral} },`
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
    '  const variantConfig = VARIANT_TOKENS[variantKey] || VARIANT_TOKENS["default"];'
  );
  reactComponentLines.push("");
  reactComponentLines.push(
    "  // TODO: map `variantConfig.tokenPaths` to actual styles using your token runtime."
  );
  reactComponentLines.push(
    "  // For example, if you have a `useToken` hook, you could resolve them here."
  );
  reactComponentLines.push("");
  reactComponentLines.push("  return (");
  reactComponentLines.push("    <div");
  reactComponentLines.push("      data-figma-component={variantConfig?.figmaVariantName}");
  reactComponentLines.push("      // style={resolvedStyles}");
  reactComponentLines.push("    >");
  reactComponentLines.push("      {/* TODO: structure the JSX based on your design system */}");
  reactComponentLines.push("      {/* This is a starting point based on Figma tokens only. */}");
  reactComponentLines.push("    </div>");
  reactComponentLines.push("  );");
  reactComponentLines.push("};");
  reactComponentLines.push("");

  reactComponentLines.push(
    `export default ${componentName};`
  );

  return reactComponentLines.join("\n");
}



