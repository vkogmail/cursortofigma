// Configuration + loading helpers for token metadata and themes.
// This centralises how the MCP host decides where to load tokens from
// (remote GitHub raw URLs vs local filesystem paths).

import fs from "fs";
import path from "path";
import { ThemesJsonTheme, loadThemesJsonFromRemote } from "./figmaTokenMapping";

export interface TokensConfig {
  source: "remote" | "local";
  themesUrl?: string;
  metadataUrl?: string;
  localTokensPath?: string;
}

const DEFAULT_REMOTE_TOKENS_ROOT =
  "https://raw.githubusercontent.com/vkogmail/exact-tokens/main/tokens";

export function loadTokensConfigFromEnv(): TokensConfig {
  const source =
    (process.env.TOKENS_SOURCE as TokensConfig["source"]) || "remote";

  if (source === "local") {
    const localTokensPath =
      process.env.TOKENS_PATH ||
      path.resolve(process.cwd(), "tokens"); // fallback to ./tokens
    return {
      source: "local",
      localTokensPath,
    };
  }

  // Remote (default) – allow overrides per-file
  const root =
    process.env.TOKENS_REMOTE_ROOT || DEFAULT_REMOTE_TOKENS_ROOT;

  const themesUrl =
    process.env.TOKENS_THEMES_URL ||
    `${root}/%24themes.json`;

  const metadataUrl =
    process.env.TOKENS_METADATA_URL ||
    `${root}/%24metadata.json`;

  return {
    source: "remote",
    themesUrl,
    metadataUrl,
  };
}

export async function loadThemes(config?: TokensConfig): Promise<ThemesJsonTheme[]> {
  const cfg = config || loadTokensConfigFromEnv();

  if (cfg.source === "local") {
    const themesPath = path.join(cfg.localTokensPath || "tokens", "$themes.json");
    const raw = fs.readFileSync(themesPath, "utf8");
    return JSON.parse(raw) as ThemesJsonTheme[];
  }

  // Remote
  return loadThemesJsonFromRemote(cfg.themesUrl);
}

export async function loadMetadata(config?: TokensConfig): Promise<any> {
  const cfg = config || loadTokensConfigFromEnv();

  if (cfg.source === "local") {
    const metaPath = path.join(cfg.localTokensPath || "tokens", "$metadata.json");
    const raw = fs.readFileSync(metaPath, "utf8");
    return JSON.parse(raw);
  }

  // Remote
  const url =
    cfg.metadataUrl ||
    `${DEFAULT_REMOTE_TOKENS_ROOT}/%24metadata.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load $metadata.json from ${url}: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}


