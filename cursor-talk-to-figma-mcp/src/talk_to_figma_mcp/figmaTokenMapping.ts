// Generic helpers for mapping Figma variable IDs (from the plugin/MCP)
// to token paths and themes defined in `$themes.json`.
//
// This file is intentionally generic:
// - It only assumes an array of theme objects, each with:
//     - name: string
//     - group?: string
//     - $figmaVariableReferences?: Record<string, string>
// - It does NOT assume a particular brand/theme naming scheme.

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

export interface ThemesJsonTheme {
  id?: string;
  name: string;
  group?: string;
  $figmaCollectionId?: string;
  $figmaModeId?: string;
  $figmaVariableReferences?: Record<string, string>;
  $figmaStyleReferences?: Record<string, string>;
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

export function normalizeFigmaVariableName(name: string): string {
  return name.replace(/\//g, ".").trim();
}

/**
 * Map selection variables to tokens with a **name-based fallback** when
 * there is no `$themes.json` at all, or when a particular variableId is
 * not present in `$figmaVariableReferences`.
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

const DEFAULT_THEMES_URL =
  process.env.TOKENS_THEMES_URL ??
  "https://raw.githubusercontent.com/vkogmail/exact-tokens/main/tokens/%24themes.json";

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
  if (!Array.isArray(json)) {
    throw new Error(
      `Unexpected $themes.json shape from ${url}: expected an array, got ${typeof json}`
    );
  }

  return json as ThemesJsonTheme[];
}


