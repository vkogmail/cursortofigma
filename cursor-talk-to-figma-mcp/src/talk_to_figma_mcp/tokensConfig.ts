import fs from "fs";
import path from "path";
import { ThemesJsonTheme, loadThemesJsonFromRemote } from "./figmaTokenMapping.js";

export interface TokensConfig {
  source: "remote" | "local";
  themesUrl?: string;
  localTokensPath?: string;
  // CSS token files URLs (for React apps to import)
  cssUrls?: string[];
}

const DEFAULT_REMOTE_TOKENS_ROOT =
  "https://raw.githubusercontent.com/vkogmail/exact-tokens/main/tokens";

export function loadTokensConfigFromEnv(): TokensConfig {
  const source =
    (process.env.TOKENS_SOURCE as TokensConfig["source"]) || "remote";

  if (source === "local") {
    const localTokensPath =
      process.env.TOKENS_PATH ||
      path.resolve(process.cwd(), "tokens");
    return {
      source: "local",
      localTokensPath,
    };
  }

  const root =
    process.env.TOKENS_REMOTE_ROOT || DEFAULT_REMOTE_TOKENS_ROOT;

  const themesUrl =
    process.env.TOKENS_THEMES_URL ||
    `${root}/%24themes.json`;

  // Load CSS URLs from environment variables
  const cssUrls: string[] = [];
  
  // Option 1: Explicit list of CSS URLs (comma-separated)
  if (process.env.TOKENS_CSS_URLS) {
    cssUrls.push(...process.env.TOKENS_CSS_URLS.split(",").map(s => s.trim()).filter(Boolean));
  }
  // Option 2: Base URL - auto-construct common paths
  else if (process.env.TOKENS_CSS_BASE_URL) {
    const baseUrl = process.env.TOKENS_CSS_BASE_URL.trim();
    // Common token CSS file names
    cssUrls.push(`${baseUrl}/tokens-base.css`);
    cssUrls.push(`${baseUrl}/tokens-themes.css`);
  }

  return {
    source: "remote",
    themesUrl,
    cssUrls: cssUrls.length > 0 ? cssUrls : undefined,
  };
}

export async function loadThemes(config?: TokensConfig): Promise<ThemesJsonTheme[]> {
  const cfg = config || loadTokensConfigFromEnv();

  if (cfg.source === "local") {
    const themesPath = path.join(cfg.localTokensPath || "tokens", "$themes.json");
    const raw = fs.readFileSync(themesPath, "utf8");
    return JSON.parse(raw) as ThemesJsonTheme[];
  }

  return loadThemesJsonFromRemote(cfg.themesUrl);
}


