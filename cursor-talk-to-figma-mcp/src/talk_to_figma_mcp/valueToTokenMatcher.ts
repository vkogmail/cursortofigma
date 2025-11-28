/**
 * Value-to-Token Matcher
 * 
 * Matches actual Figma values (colors, spacing, etc.) to the closest design tokens.
 * Used for reverse tokenization - applying tokens to components that don't have them yet.
 */

import { loadTokensConfigFromEnv, TokensConfig } from "./tokensConfig.js";

export interface TokenValue {
  tokenPath: string;
  value: string | number;
  type: "color" | "spacing" | "typography" | "radius" | "other";
}

export interface ValueMatch {
  tokenPath: string;
  variableName: string;
  variableId?: string;
  collectionId?: string;
  confidence: number; // 0-1, 1 = exact match
  matchType: "exact" | "close" | "semantic";
  actualValue: string | number;
  tokenValue: string | number;
}

export interface MatchOptions {
  componentDescription?: string;
  propertyType?: "fill" | "stroke" | "spacing" | "typography" | "radius";
  tolerance?: number; // For numeric values (spacing, radius)
}

/**
 * Load token values from source JSON files
 */
async function loadTokenValues(
  config?: TokensConfig
): Promise<Map<string, TokenValue>> {
  const cfg = config || loadTokensConfigFromEnv();
  const themes = await loadThemes(cfg);
  
  const tokenMap = new Map<string, TokenValue>();
  
  // Load token files from remote or local
  const baseUrl = cfg.source === "remote" 
    ? (process.env.TOKENS_REMOTE_ROOT || "https://raw.githubusercontent.com/vkogmail/exact-tokens/main/tokens")
    : undefined;
  
  // For now, we'll need to fetch individual token files
  // This is a simplified version - you may need to adjust based on your token structure
  
  return tokenMap;
}

/**
 * Convert hex color to RGB for comparison
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate color distance (Euclidean distance in RGB space)
 */
function colorDistance(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Normalize rgba string to hex
 */
function rgbaToHex(rgba: string): string | null {
  // Handle rgba(r, g, b, a) format
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return null;
  
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Match a color value to the closest token
 */
export async function matchColorToToken(
  colorValue: string,
  options: MatchOptions = {}
): Promise<ValueMatch | null> {
  // Normalize color value
  let hex: string | null = null;
  if (colorValue.startsWith("#")) {
    hex = colorValue;
  } else if (colorValue.startsWith("rgba") || colorValue.startsWith("rgb")) {
    hex = rgbaToHex(colorValue);
  }
  
  if (!hex) return null;
  
  const targetRgb = hexToRgb(hex);
  if (!targetRgb) return null;
  
  // Load token values
  const config = loadTokensConfigFromEnv();
  const tokenMap = await loadTokenValues(config);
  
  // Find closest color match
  let bestMatch: ValueMatch | null = null;
  let bestDistance = Infinity;
  
  for (const [tokenPath, tokenValue] of tokenMap.entries()) {
    if (tokenValue.type !== "color") continue;
    
    const tokenHex = typeof tokenValue.value === "string" 
      ? (tokenValue.value.startsWith("#") ? tokenValue.value : null)
      : null;
    
    if (!tokenHex) continue;
    
    const tokenRgb = hexToRgb(tokenHex);
    if (!tokenRgb) continue;
    
    const distance = colorDistance(targetRgb, tokenRgb);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      
      // Convert token path to Figma variable name format
      const variableName = tokenPath.replace(/\./g, "/");
      
      // Determine confidence (exact = 1.0, close = 0.8-0.99, far = <0.8)
      let confidence = 1.0;
      let matchType: "exact" | "close" | "semantic" = "exact";
      
      if (distance === 0) {
        confidence = 1.0;
        matchType = "exact";
      } else if (distance < 10) {
        confidence = 0.95;
        matchType = "close";
      } else if (distance < 30) {
        confidence = 0.85;
        matchType = "close";
      } else {
        confidence = Math.max(0.5, 1 - distance / 255);
        matchType = "semantic";
      }
      
      bestMatch = {
        tokenPath,
        variableName,
        confidence,
        matchType,
        actualValue: hex,
        tokenValue: tokenHex,
      };
    }
  }
  
  return bestMatch;
}

/**
 * Match a spacing/numeric value to the closest token
 */
export async function matchSpacingToToken(
  value: number,
  options: MatchOptions = {}
): Promise<ValueMatch | null> {
  const tolerance = options.tolerance || 2; // Default 2px tolerance
  
  // Load token values
  const config = loadTokensConfigFromEnv();
  const tokenMap = await loadTokenValues(config);
  
  const propertyType = options.propertyType || "spacing";
  const tokenType = propertyType === "radius" ? "radius" : "spacing";
  
  // Find closest match
  let bestMatch: ValueMatch | null = null;
  let bestDistance = Infinity;
  
  for (const [tokenPath, tokenValue] of tokenMap.entries()) {
    if (tokenValue.type !== tokenType) continue;
    
    const tokenNum = typeof tokenValue.value === "number"
      ? tokenValue.value
      : typeof tokenValue.value === "string"
      ? parseFloat(tokenValue.value.replace("px", "").trim())
      : null;
    
    if (tokenNum === null || isNaN(tokenNum)) continue;
    
    const distance = Math.abs(value - tokenNum);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      
      // Convert token path to Figma variable name format
      const variableName = tokenPath.replace(/\./g, "/");
      
      // Determine confidence
      let confidence = 1.0;
      let matchType: "exact" | "close" | "semantic" = "exact";
      
      if (distance === 0) {
        confidence = 1.0;
        matchType = "exact";
      } else if (distance <= tolerance) {
        confidence = 0.95;
        matchType = "close";
      } else if (distance <= tolerance * 2) {
        confidence = 0.85;
        matchType = "close";
      } else {
        // Further away, lower confidence
        confidence = Math.max(0.5, 1 - distance / (tolerance * 10));
        matchType = "semantic";
      }
      
      bestMatch = {
        tokenPath,
        variableName,
        confidence,
        matchType,
        actualValue: value,
        tokenValue: tokenNum,
      };
    }
  }
  
  return bestMatch;
}

/**
 * Match a typography value to the closest token
 */
export async function matchTypographyToToken(
  property: "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing",
  value: string | number,
  options: MatchOptions = {}
): Promise<ValueMatch | null> {
  // TODO: Load typography tokens and match
  
  return null;
}

/**
 * Filter out foundation tokens - only use theme tokens for reverse tokenization
 * Foundation tokens (like Brand, Scale, Platform) are base values.
 * Theme tokens (like Theme) are semantic tokens that should be used in components.
 */
function filterThemeTokens(
  figmaVariables: Array<{
    id: string;
    name: string;
    collectionId: string;
    collectionName?: string;
    type: string;
    valuesByMode: Record<string, any>;
  }>,
  collections: Array<{
    id: string;
    name: string;
  }>
): Array<{
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  type: string;
  valuesByMode: Record<string, any>;
}> {
  // Create a map of collection IDs to names
  const collectionMap = new Map<string, string>();
  collections.forEach((col) => {
    collectionMap.set(col.id, col.name);
  });

  // Filter to only include tokens from theme collections
  // Exclude: Brand, Scale, Platform, Typography (foundation tokens)
  // Include: Theme (semantic/theme tokens)
  const foundationCollectionNames = [
    "Brand",
    "Scale",
    "Platform",
    "Typography",
    "Effect",
    "Foundation",
  ].map((name) => name.toLowerCase());

  return figmaVariables
    .map((variable) => ({
      ...variable,
      collectionName: collectionMap.get(variable.collectionId) || "Unknown",
    }))
    .filter((variable) => {
      const collectionName = variable.collectionName.toLowerCase();
      return !foundationCollectionNames.includes(collectionName);
    });
}

/**
 * Match component values to tokens using Figma variables directly
 * This is more reliable than loading from remote JSON
 * 
 * IMPORTANT: Only matches against theme tokens, never foundation tokens
 */
export async function matchComponentValuesToTokens(
  nodeData: {
    fills?: Array<{ color?: string | { r: number; g: number; b: number; a?: number } }>;
    strokes?: Array<{ color?: string | { r: number; g: number; b: number; a?: number } }>;
    cornerRadius?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    itemSpacing?: number;
    fontSize?: number;
    fontWeight?: number;
    // ... other properties
  },
  figmaVariables: Array<{
    id: string;
    name: string;
    collectionId: string;
    type: string;
    valuesByMode: Record<string, any>;
  }>,
  collections: Array<{
    id: string;
    name: string;
  }>,
  componentDescription?: string,
  tolerance: number = 2
): Promise<Array<{
  property: string;
  match: ValueMatch | null;
}>> {
  // Filter to only theme tokens (exclude foundation) for matching for colors/spacing/etc.
  // For radius, we may also use Scale collection tokens (as agreed: Scale is the top of the foundation chain for radius).
  const themeVariables = filterThemeTokens(figmaVariables, collections);

  // Build a quick lookup of collectionId -> name
  const collectionNameById = new Map<string, string>();
  collections.forEach((col) => {
    collectionNameById.set(col.id, col.name);
  });

  // Radius variables from the Scale collection (numeric radius tokens)
  const scaleRadiusVariables = figmaVariables.filter((variable) => {
    const colName = (collectionNameById.get(variable.collectionId) || "").toLowerCase();
    return (
      colName === "scale" &&
      variable.type === "FLOAT" &&
      typeof variable.name === "string" &&
      variable.name.startsWith("radius/")
    );
  });

  const matches: Array<{ property: string; match: ValueMatch | null }> = [];
  
  // Helper to extract color from fill/stroke
  const extractColor = (color: string | { r: number; g: number; b: number; a?: number } | undefined): string | null => {
    if (!color) return null;
    if (typeof color === "string") {
      return color.startsWith("#") ? color : rgbaToHex(color) || color;
    }
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  };
  
  // Match fills
  if (nodeData.fills && nodeData.fills.length > 0) {
    const fill = nodeData.fills[0];
    const actualColor = extractColor(fill.color);
    if (actualColor) {
      const match = await matchValueToFigmaVariable(
        actualColor,
        "COLOR",
        themeVariables,
        { componentDescription, propertyType: "fill", tolerance },
        figmaVariables // Pass all variables for alias resolution
      );
      matches.push({ property: "fills", match });
    }
  }
  
  // Match strokes
  if (nodeData.strokes && nodeData.strokes.length > 0) {
    const stroke = nodeData.strokes[0];
    const actualColor = extractColor(stroke.color);
    if (actualColor) {
      const match = await matchValueToFigmaVariable(
        actualColor,
        "COLOR",
        themeVariables,
        { componentDescription, propertyType: "stroke", tolerance },
        figmaVariables // Pass all variables for alias resolution
      );
      matches.push({ property: "strokes", match });
    }
  }
  
  // Match corner radius
  if (nodeData.cornerRadius !== undefined) {
      const match = await matchValueToFigmaVariable(
        nodeData.cornerRadius,
        "FLOAT",
        // For radius, allow both theme-level radius (if any) and Scale radius tokens
        [...themeVariables, ...scaleRadiusVariables],
        { componentDescription, propertyType: "radius", tolerance },
        figmaVariables // Pass all variables for alias resolution
      );
    matches.push({ property: "cornerRadius", match });
  }
  
  // Match padding values
  for (const prop of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) {
    const value = (nodeData as any)[prop];
    if (value !== undefined) {
      const match = await matchValueToFigmaVariable(
        value,
        "FLOAT",
        themeVariables,
        { componentDescription, propertyType: "spacing", tolerance },
        figmaVariables // Pass all variables for alias resolution
      );
      matches.push({ property: prop, match });
    }
  }
  
  // Match item spacing
  if (nodeData.itemSpacing !== undefined) {
    const match = await matchValueToFigmaVariable(
      nodeData.itemSpacing,
      "FLOAT",
      themeVariables,
      { componentDescription, propertyType: "spacing", tolerance },
      figmaVariables // Pass all variables for alias resolution
    );
    matches.push({ property: "itemSpacing", match });
  }
  
  // Match typography
  if (nodeData.fontSize !== undefined) {
    const match = await matchValueToFigmaVariable(
      nodeData.fontSize,
      "FLOAT",
      themeVariables,
      { componentDescription, propertyType: "typography", tolerance },
      figmaVariables // Pass all variables for alias resolution
    );
    matches.push({ property: "fontSize", match });
  }
  
  return matches;
}

/**
 * Resolve a variable alias to its actual value
 */
function resolveVariableAlias(
  aliasValue: { type: string; id: string },
  figmaVariables: Array<{
    id: string;
    name: string;
    type: string;
    valuesByMode: Record<string, any>;
  }>,
  visited: Set<string> = new Set()
): any {
  if (aliasValue.type !== "VARIABLE_ALIAS") {
    return aliasValue;
  }
  
  // Prevent infinite loops
  if (visited.has(aliasValue.id)) {
    return null;
  }
  visited.add(aliasValue.id);
  
  // Find the referenced variable
  const referencedVar = figmaVariables.find(v => v.id === aliasValue.id);
  if (!referencedVar) {
    return null;
  }
  
  // Get the first mode's value
  const modeValues = Object.values(referencedVar.valuesByMode);
  if (modeValues.length === 0) {
    return null;
  }
  
  const value = modeValues[0];
  
  // If it's another alias, resolve recursively
  if (typeof value === "object" && value !== null && value.type === "VARIABLE_ALIAS") {
    return resolveVariableAlias(value, figmaVariables, visited);
  }
  
  return value;
}

/**
 * Match a value to the closest Figma variable
 * Only matches against theme tokens (foundation tokens are filtered out before this)
 */
async function matchValueToFigmaVariable(
  actualValue: string | number,
  variableType: "COLOR" | "FLOAT" | "STRING",
  figmaVariables: Array<{
    id: string;
    name: string;
    collectionId: string;
    collectionName?: string;
    type: string;
    valuesByMode: Record<string, any>;
  }>,
  options: MatchOptions = {},
  allVariables?: Array<{
    id: string;
    name: string;
    type: string;
    valuesByMode: Record<string, any>;
  }> // All variables (including foundation) for alias resolution
): Promise<ValueMatch | null> {
  // Use all variables for alias resolution if provided, otherwise use figmaVariables
  const variablesForAliasResolution = allVariables || figmaVariables;
  let bestMatch: ValueMatch | null = null;
  let bestDistance = Infinity;
  
  for (const variable of figmaVariables) {
    // Filter by type
    if (variable.type !== variableType) continue;
    
    // Get the first mode's value (or iterate through all modes)
    const modeValues = Object.values(variable.valuesByMode);
    if (modeValues.length === 0) continue;
    
    let variableValue = modeValues[0];
    
    // Resolve aliases
    if (typeof variableValue === "object" && variableValue !== null && variableValue.type === "VARIABLE_ALIAS") {
      variableValue = resolveVariableAlias(variableValue, variablesForAliasResolution);
      if (!variableValue) continue;
    }
    
    let distance: number;
    let confidence: number;
    let matchType: "exact" | "close" | "semantic";
    let adjustedDistance: number | undefined;
    
    if (variableType === "COLOR") {
      // Color matching
      const actualHex = typeof actualValue === "string" 
        ? (actualValue.startsWith("#") ? actualValue : rgbaToHex(actualValue))
        : null;
      
      if (!actualHex) continue;
      
      const actualRgb = hexToRgb(actualHex);
      if (!actualRgb) continue;
      
      // Convert variable value to hex
      let varHex: string | null = null;
      if (typeof variableValue === "string" && variableValue.startsWith("#")) {
        varHex = variableValue;
      } else if (typeof variableValue === "object" && variableValue.r !== undefined) {
        const r = Math.round(variableValue.r * 255);
        const g = Math.round(variableValue.g * 255);
        const b = Math.round(variableValue.b * 255);
        varHex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      }
      
      if (!varHex) continue;
      
      const varRgb = hexToRgb(varHex);
      if (!varRgb) continue;
      
      distance = colorDistance(actualRgb, varRgb);
      
      // Semantic matching: boost confidence if component description matches token name
      let semanticBoost = 0;
      let isSemanticMatch = false;
      if (options.componentDescription) {
        const desc = options.componentDescription.toLowerCase();
        const varName = variable.name.toLowerCase();
        
        // Check for status-related keywords
        if (desc.includes("status") || desc.includes("success") || desc.includes("planned")) {
          if (varName.includes("status") || varName.includes("success")) {
            semanticBoost = 0.5; // Strong boost for status tokens
            isSemanticMatch = true;
          }
        }
        if (desc.includes("warning") && varName.includes("warning")) {
          semanticBoost = 0.5;
          isSemanticMatch = true;
        }
        if (desc.includes("danger") || desc.includes("error") || desc.includes("failed")) {
          if (varName.includes("danger") || varName.includes("error")) {
            semanticBoost = 0.5;
            isSemanticMatch = true;
          }
        }
        if (desc.includes("info") && varName.includes("info")) {
          semanticBoost = 0.5;
          isSemanticMatch = true;
        }
        
        // Check for property type hints - these are critical for correct matching
        if (options.propertyType === "fill" && varName.includes("surface")) {
          semanticBoost += 0.5; // Strong boost for surface tokens on fills
          isSemanticMatch = true;
        }
        if (options.propertyType === "stroke" && varName.includes("border")) {
          semanticBoost += 0.5; // Strong boost for border tokens on strokes
          isSemanticMatch = true;
        }
        // Penalize mismatched property types
        if (options.propertyType === "stroke" && varName.includes("foreground")) {
          semanticBoost -= 0.3; // Penalize foreground tokens for strokes
        }
        if (options.propertyType === "fill" && varName.includes("foreground")) {
          semanticBoost -= 0.3; // Penalize foreground tokens for fills
        }
      }
      
      if (distance === 0) {
        confidence = 1.0;
        matchType = isSemanticMatch ? "semantic" : "exact";
      } else if (distance < 10) {
        confidence = Math.min(1.0, 0.95 + semanticBoost);
        matchType = isSemanticMatch ? "semantic" : "close";
      } else if (distance < 30) {
        confidence = Math.min(1.0, 0.85 + semanticBoost);
        matchType = isSemanticMatch ? "semantic" : "close";
      } else {
        confidence = Math.min(1.0, Math.max(0.5, 1 - distance / 255) + semanticBoost);
        matchType = "semantic";
      }
      
      // Adjust distance for semantic matches (lower is better, so subtract boost)
      // Give semantic matches a huge advantage - subtract 1000 from distance
      // This ensures semantic matches always win over non-semantic matches
      adjustedDistance = isSemanticMatch ? distance - 1000 : distance;
    } else {
      // Numeric matching (FLOAT)
      const actualNum = typeof actualValue === "number" ? actualValue : parseFloat(String(actualValue));
      const varNum = typeof variableValue === "number" ? variableValue : parseFloat(String(variableValue));
      
      if (isNaN(actualNum) || isNaN(varNum)) continue;
      
      distance = Math.abs(actualNum - varNum);
      const tolerance = options.tolerance || 2;
      
      if (distance === 0) {
        confidence = 1.0;
        matchType = "exact";
      } else if (distance <= tolerance) {
        confidence = 0.95;
        matchType = "close";
      } else if (distance <= tolerance * 2) {
        confidence = 0.85;
        matchType = "close";
      } else {
        confidence = Math.max(0.5, 1 - distance / (tolerance * 10));
        matchType = "semantic";
      }
      
      // For numeric values, adjustedDistance is the same as distance
      adjustedDistance = distance;
    }
    
    // Use adjusted distance for comparison if it exists, otherwise use original distance
    const comparisonDistance = typeof adjustedDistance !== 'undefined' ? adjustedDistance : distance;
    
    if (comparisonDistance < bestDistance) {
      bestDistance = comparisonDistance;
      bestMatch = {
        tokenPath: variable.name.replace(/\//g, "."),
        variableName: variable.name,
        variableId: variable.id,
        collectionId: variable.collectionId,
        confidence,
        matchType,
        actualValue,
        tokenValue: variableValue,
      };
    }
  }
  
  return bestMatch;
}

