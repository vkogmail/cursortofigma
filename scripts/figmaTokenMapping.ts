// Generic helpers for mapping Figma variable IDs (from the plugin/MCP)
// to token paths and themes defined in `$themes.json`.
//
// This file is intentionally generic:
// - It only assumes an array of theme objects, each with:
//     - name: string
//     - group?: string
//     - $figmaVariableReferences?: Record<string, string>
// - It does NOT assume a particular brand/theme naming scheme.
//
// You can import these helpers from any project and feed them:
// - The parsed contents of `tokens/$themes.json`
// - The JSON returned by the Figma MCP tool: `get_selection_variables`

// ----- Types mirrored from the Figma plugin/MCP side -----

export interface VariableInfo {
  id: string;
  name: string;
  collectionId: string;
  props: string[];
}

export interface NodeVariables {
  nodeId: string;
  nodeName: string;
  variables: VariableInfo[];
}

// ----- Theme + mapping types -----

export interface ThemesJsonTheme {
  id?: string;
  name: string;
  group?: string;
  $figmaCollectionId?: string;
  $figmaModeId?: string;
  $figmaVariableReferences?: Record<string, string>;
  $figmaStyleReferences?: Record<string, string>; // For text styles, effect styles, etc.
  // Anything else is ignored by the mapping functions
  [key: string]: unknown;
}

export interface TokenMatch {
  tokenPath: string;
  themeName?: string;
  themeGroup?: string;
  themeId?: string;
}

export interface VariableIdMappingResult extends TokenMatch {
  variableId: string;
}

export interface MappedTokenForNode extends VariableIdMappingResult {
  props: string[];
}

export interface NodeTokenMapping {
  nodeId: string;
  nodeName: string;
  tokens: MappedTokenForNode[];
}

// For reverse lookups (tokenPath -> variableId)
export interface TokenPathMappingResult extends TokenMatch {
  variableId: string;
}

// ----- Core mapping helpers -----

/**
 * Build an index from variableId → list of token matches across all themes.
 *
 * This is generic and makes no assumptions about theme names or groups,
 * other than the presence of `$figmaVariableReferences`.
 */
export function buildVariableIdIndex(
  themes: ThemesJsonTheme[]
): Map<string, TokenMatch[]> {
  const index = new Map<string, TokenMatch[]>();

  for (const theme of themes) {
    const refs = theme.$figmaVariableReferences;
    if (!refs) continue;

    for (const [tokenPath, variableId] of Object.entries(refs)) {
      if (!variableId) continue;

      const key = variableId;
      const entry: TokenMatch = {
        tokenPath,
        themeName: theme.name,
        themeGroup: theme.group,
        themeId: theme.id,
      };

      const existing = index.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        index.set(key, [entry]);
      }
    }
  }

  return index;
}

/**
 * Build an index from tokenPath → list of variableId matches across all themes.
 *
 * This is the "reverse" of `buildVariableIdIndex` and lets you start from a
 * design token path (e.g. "color.surface.action.accent.default") and find the
 * corresponding Figma variable ID(s) for a theme.
 */
export function buildTokenPathIndex(
  themes: ThemesJsonTheme[]
): Map<string, TokenPathMappingResult[]> {
  const index = new Map<string, TokenPathMappingResult[]>();

  for (const theme of themes) {
    const refs = theme.$figmaVariableReferences;
    if (!refs) continue;

    for (const [tokenPath, variableId] of Object.entries(refs)) {
      if (!variableId) continue;

      const key = tokenPath;
      const entry: TokenPathMappingResult = {
        tokenPath,
        variableId,
        themeName: theme.name,
        themeGroup: theme.group,
        themeId: theme.id,
      };

      const existing = index.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        index.set(key, [entry]);
      }
    }
  }

  return index;
}

/**
 * Look up one variable ID in the pre-built index.
 *
 * Returns all matching token paths + theme metadata. Callers can decide
 * whether to:
 * - take the first match
 * - or keep all matches if the same variableId appears in multiple themes.
 */
export function mapVariableIdToTokens(
  variableId: string,
  index: Map<string, TokenMatch[]>
): VariableIdMappingResult[] {
  const matches = index.get(variableId) ?? [];
  return matches.map((m) => ({
    variableId,
    ...m,
  }));
}

/**
 * Given a tokenPath (e.g. "color.surface.action.accent.default") and a
 * pre-built tokenPath index, return all matching variable IDs + theme metadata.
 *
 * Callers can filter by theme if desired.
 */
export function mapTokenPathToVariableIds(
  tokenPath: string,
  index: Map<string, TokenPathMappingResult[]>
): TokenPathMappingResult[] {
  return index.get(tokenPath) ?? [];
}

/**
 * Convenience helper:
 * Given the raw themes array and a variableId, perform a one-off lookup
 * without manually building an index. For repeated lookups, prefer
 * `buildVariableIdIndex` + `mapVariableIdToTokens` for performance.
 */
export function mapVariableIdToTokensOnce(
  variableId: string,
  themes: ThemesJsonTheme[]
): VariableIdMappingResult[] {
  const index = buildVariableIdIndex(themes);
  return mapVariableIdToTokens(variableId, index);
}

/**
 * Convenience helper:
 * Given the raw themes array and a tokenPath, perform a one-off lookup
 * from tokenPath → variableId(s) without manually building an index.
 */
export function mapTokenPathToVariableIdsOnce(
  tokenPath: string,
  themes: ThemesJsonTheme[]
): TokenPathMappingResult[] {
  const index = buildTokenPathIndex(themes);
  return mapTokenPathToVariableIds(tokenPath, index);
}

// ----- Remote loading helper for $themes.json -----

const DEFAULT_THEMES_URL =
  process.env.TOKENS_THEMES_URL ??
  "https://raw.githubusercontent.com/vkogmail/exact-tokens/main/tokens/%24themes.json";

/**
 * Load `tokens/$themes.json` from a remote source of truth (e.g. GitHub).
 *
 * By default it uses the public Exact tokens repo:
 *   https://github.com/vkogmail/exact-tokens/tree/main/tokens
 *
 * You can override the source by setting the environment variable
 * `TOKENS_THEMES_URL` to any compatible JSON endpoint.
 */
export async function loadThemesJsonFromRemote(
  url: string = DEFAULT_THEMES_URL
): Promise<ThemesJsonTheme[]> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Failed to load $themes.json from ${url}: ${res.status} ${res.statusText}`
    );
  }

  const json = await res.json();

  // We expect an array of theme objects, but keep this generic and trust the data.
  if (!Array.isArray(json)) {
    throw new Error(
      `Unexpected $themes.json shape from ${url}: expected an array, got ${typeof json}`
    );
  }

  return json as ThemesJsonTheme[];
}

/**
 * Map a full `NodeVariables[]` payload (from the Figma MCP tool) to
 * `NodeTokenMapping[]` using a pre-built index from `$themes.json`.
 *
 * This sticks to ID-based mapping only. If you also want name-based
 * fallback, use `mapSelectionVariablesToTokensWithFallback`.
 */
export function mapSelectionVariablesToTokens(
  selection: NodeVariables[],
  index: Map<string, TokenMatch[]>
): NodeTokenMapping[] {
  return selection.map((node) => {
    const tokens: MappedTokenForNode[] = [];

    for (const variable of node.variables) {
      const matches = mapVariableIdToTokens(variable.id, index);
      if (matches.length === 0) continue;

      // For now we take the first match per variableId. If you want
      // to keep all matches, you can push one entry per match instead.
      const primary = matches[0]!;

      tokens.push({
        variableId: primary.variableId,
        tokenPath: primary.tokenPath,
        themeName: primary.themeName,
        themeGroup: primary.themeGroup,
        themeId: primary.themeId,
        props: variable.props,
      });
    }

    return {
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      tokens,
    };
  });
}

// ----- Optional: simple normalization helper for name-based fallback -----

/**
 * Normalize a Figma variable name such as:
 *   "color/surface/action/primary/default"
 *   "Roundings (corners)/Small (Default)"
 * into a token-path-like string:
 *   "color.surface.action.primary.default"
 *   "Roundings (corners).Small (Default)"
 *
 * This is intentionally very conservative and generic. Projects
 * can override or extend this to handle their own naming quirks.
 */
export function normalizeFigmaVariableName(name: string): string {
  return name.replace(/\//g, ".").trim();
}

/**
 * Map selection variables to tokens with a **name-based fallback** when
 * there is no `$themes.json` at all, or when a particular variableId is
 * not present in `$figmaVariableReferences`.
 *
 * Behaviour:
 * - If `themes` is provided and a variableId is found in the index:
 *     → use the ID-based match (tokenPath + theme metadata).
 * - Otherwise:
 *     → fall back to `normalizeFigmaVariableName(variable.name)` as
 *        the `tokenPath`, with no theme metadata.
 *
 * This keeps the plugin/MCP side generic while still giving consumers a
 * useful token-path-like string even without theme data.
 */
export function mapSelectionVariablesToTokensWithFallback(
  selection: NodeVariables[],
  themes?: ThemesJsonTheme[]
): NodeTokenMapping[] {
  const index = themes ? buildVariableIdIndex(themes) : undefined;

  return selection.map((node) => {
    const tokens: MappedTokenForNode[] = [];

    for (const variable of node.variables) {
      let mapped: MappedTokenForNode | null = null;

      if (index) {
        const matches = mapVariableIdToTokens(variable.id, index);
        if (matches.length > 0) {
          const primary = matches[0]!;
          mapped = {
            variableId: primary.variableId,
            tokenPath: primary.tokenPath,
            themeName: primary.themeName,
            themeGroup: primary.themeGroup,
            themeId: primary.themeId,
            props: variable.props,
          };
        }
      }

      // If no ID-based match, fall back to normalized name
      if (!mapped) {
        const fallbackTokenPath = normalizeFigmaVariableName(variable.name);
        mapped = {
          variableId: variable.id,
          tokenPath: fallbackTokenPath,
          themeName: undefined,
          themeGroup: undefined,
          themeId: undefined,
          props: variable.props,
        };
      }

      tokens.push(mapped);
    }

    return {
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      tokens,
    };
  });
}
// ----- Phrase -> token/variable resolution helpers -----

export interface VariableCollectionSummary {
  id: string;
  name: string;
  defaultModeId: string;
  modes: { id: string; name: string }[];
  variables: { id: string; name: string; variableCollectionId: string }[];
}

export interface DesignSystemContext {
  themes: ThemesJsonTheme[];
  tokenPathIndex: Map<string, TokenPathMappingResult[]>;
  collections: VariableCollectionSummary[];
}

export interface ResolvedPhraseResult {
  phrase: string;
  tokenPath: string;
  variableName?: string;
  collectionId?: string;
  styleId?: string; // For text styles, effect styles
  styleType?: "text" | "effect"; // Type of style if resolved
  propertyName?: string; // Suggested property name (e.g., "fills", "paddingTop", "effectStyleId")
}

// Very small, generic scoring based on shared words between phrase and token path.
function scorePhraseMatch(phrase: string, tokenPath: string): number {
  const words = phrase
    .toLowerCase()
    .replace(/[^a-z0-9/.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const segments = tokenPath.toLowerCase().split(/[./]/);

  let score = 0;
  for (const w of words) {
    if (segments.includes(w)) score += 2;
  }

  // slight preference for "color.surface" tokens when phrase includes "surface"
  if (phrase.toLowerCase().includes("surface") && tokenPath.startsWith("color.surface")) {
    score += 1;
  }

  // Boost score for style-related phrases matching style tokens
  const phraseLower = phrase.toLowerCase();
  if ((phraseLower.includes("style") || phraseLower.includes("text") || phraseLower.includes("typography")) && 
      (tokenPath.includes("style") || tokenPath.includes("text") || tokenPath.includes("typography"))) {
    score += 2;
  }

  // Boost score for effect-related phrases matching effect tokens
  if ((phraseLower.includes("shadow") || phraseLower.includes("blur") || phraseLower.includes("effect")) && 
      (tokenPath.includes("shadow") || tokenPath.includes("blur") || tokenPath.includes("effect"))) {
    score += 2;
  }

  return score;
}

// Detect property type from phrase to suggest appropriate propertyName
function detectPropertyType(phrase: string): string | undefined {
  const phraseLower = phrase.toLowerCase();
  
  // Color properties
  if (phraseLower.includes("fill") || phraseLower.includes("background") || phraseLower.includes("color")) {
    return "fills";
  }
  if (phraseLower.includes("stroke") || phraseLower.includes("border")) {
    return "strokes";
  }
  
  // Text properties
  if (phraseLower.includes("font size") || phraseLower.includes("fontsize")) {
    return "fontSize";
  }
  if (phraseLower.includes("font family") || phraseLower.includes("fontfamily")) {
    return "fontFamily";
  }
  if (phraseLower.includes("font weight") || phraseLower.includes("fontweight")) {
    return "fontWeight";
  }
  if (phraseLower.includes("letter spacing") || phraseLower.includes("letterspacing")) {
    return "letterSpacing";
  }
  if (phraseLower.includes("line height") || phraseLower.includes("lineheight")) {
    return "lineHeight";
  }
  
  // Layout properties
  if (phraseLower.includes("padding")) {
    if (phraseLower.includes("top")) return "paddingTop";
    if (phraseLower.includes("right")) return "paddingRight";
    if (phraseLower.includes("bottom")) return "paddingBottom";
    if (phraseLower.includes("left")) return "paddingLeft";
    return "paddingTop"; // Default to paddingTop if just "padding"
  }
  if (phraseLower.includes("spacing") || phraseLower.includes("gap")) {
    if (phraseLower.includes("item") || phraseLower.includes("between")) {
      return "itemSpacing";
    }
    if (phraseLower.includes("counter") || phraseLower.includes("wrap")) {
      return "counterAxisSpacing";
    }
    return "itemSpacing"; // Default
  }
  if (phraseLower.includes("width")) {
    return "width";
  }
  if (phraseLower.includes("height")) {
    return "height";
  }
  if (phraseLower.includes("corner") || phraseLower.includes("radius") || phraseLower.includes("round")) {
    return "cornerRadius";
  }
  if (phraseLower.includes("opacity")) {
    return "opacity";
  }
  
  // Style properties
  if (phraseLower.includes("text style") || phraseLower.includes("typography") || 
      (phraseLower.includes("style") && (phraseLower.includes("button") || phraseLower.includes("heading") || phraseLower.includes("body")))) {
    return "textStyleId";
  }
  if (phraseLower.includes("effect") || phraseLower.includes("shadow") || phraseLower.includes("blur")) {
    return "effectStyleId";
  }
  
  return undefined;
}

/**
 * Build a minimal design-system context that can later be used to resolve
 * natural language phrases like "surface accent color" into:
 *  - a token path (from $themes.json)
 *  - a variable name + collectionId (from Figma variable collections)
 */
export function buildDesignSystemContext(
  themes: ThemesJsonTheme[],
  collections: VariableCollectionSummary[]
): DesignSystemContext {
  const tokenPathIndex = buildTokenPathIndex(themes);
  return {
    themes,
    tokenPathIndex,
    collections,
  };
}

/**
 * Resolve a phrase such as "surface accent color" or "button md text style" into a best-guess tokenPath
 * and Figma variable name + collectionId, or styleId for styles.
 *
 * Strategy:
 *  1) Check if phrase is about styles (text styles, effect styles) - look in $figmaStyleReferences
 *  2) Otherwise, score all token paths from $themes.json by phrase similarity.
 *  3) Take the highest scoring path above a small threshold.
 *  4) Convert token path "color.surface.action.accent.default"
 *     into Figma variable name "color/surface/action/accent/default".
 *  5) Try to find a matching variable name in the Figma collections.
 *  6) Detect property type from phrase to suggest appropriate propertyName.
 */
export function resolvePhraseToVariable(
  phrase: string,
  ctx: DesignSystemContext
): ResolvedPhraseResult | null {
  const phraseLower = phrase.toLowerCase();
  
  // First, check if this is a style reference (text style or effect style)
  const isTextStyle = phraseLower.includes("text style") || phraseLower.includes("typography") || 
                      (phraseLower.includes("style") && (phraseLower.includes("button") || phraseLower.includes("heading") || phraseLower.includes("body")));
  const isEffectStyle = phraseLower.includes("effect") || phraseLower.includes("shadow") || phraseLower.includes("blur");
  
  if (isTextStyle || isEffectStyle) {
    // Look for style references in themes
    for (const theme of ctx.themes) {
      const styleRefs = theme.$figmaStyleReferences;
      if (!styleRefs) continue;
      
      // Score style token paths
      let bestStylePath: string | null = null;
      let bestStyleScore = 0;
      
      for (const [styleTokenPath, styleId] of Object.entries(styleRefs)) {
        const score = scorePhraseMatch(phrase, styleTokenPath);
        if (score > bestStyleScore) {
          bestStyleScore = score;
          bestStylePath = styleTokenPath;
        }
      }
      
      if (bestStylePath && bestStyleScore >= 2) {
        const styleId = styleRefs[bestStylePath];
        return {
          phrase,
          tokenPath: bestStylePath,
          styleId,
          styleType: isTextStyle ? "text" : "effect",
          propertyName: isTextStyle ? "textStyleId" : "effectStyleId",
        };
      }
    }
  }
  
  // Otherwise, treat as variable reference
  const allTokenPaths = Array.from(ctx.tokenPathIndex.keys());

  let bestPath: string | null = null;
  let bestScore = 0;

  for (const path of allTokenPaths) {
    const s = scorePhraseMatch(phrase, path);
    if (s > bestScore) {
      bestScore = s;
      bestPath = path;
    }
  }

  // Require at least a minimal score to avoid wild guesses
  if (!bestPath || bestScore < 2) return null;

  const variableName = bestPath.replace(/\./g, "/");
  const propertyName = detectPropertyType(phrase);

  // Try to locate this variable name in the provided collections
  for (const col of ctx.collections) {
    const match = col.variables.find((v) => v.name === variableName);
    if (match) {
      return {
        phrase,
        tokenPath: bestPath,
        variableName,
        collectionId: col.id,
        propertyName,
      };
    }
  }

  // Fall back to just returning the token + variableName (caller may still bind by name only)
  return {
    phrase,
    tokenPath: bestPath,
    variableName,
    collectionId: undefined,
    propertyName,
  };
}

