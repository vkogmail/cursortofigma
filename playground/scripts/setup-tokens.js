#!/usr/bin/env node
/**
 * Reads TOKENS_CSS_URLS or TOKENS_CSS_BASE_URL from .env.local
 * and updates globals.css with @import statements for token CSS files
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env.local not found, skipping token CSS setup');
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

function getCssUrls(env) {
  // Option 1: Explicit URLs
  if (env.TOKENS_CSS_URLS) {
    return env.TOKENS_CSS_URLS.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Option 2: Base URL
  if (env.TOKENS_CSS_BASE_URL) {
    const baseUrl = env.TOKENS_CSS_BASE_URL.trim();
    return [
      `${baseUrl}/tokens-base.css`,
      `${baseUrl}/tokens-themes.css`,
    ];
  }
  
  return [];
}

function updateGlobalsCss(cssUrls) {
  const globalsPath = path.join(__dirname, '../src/app/globals.css');
  let content = fs.readFileSync(globalsPath, 'utf8');
  
  // Remove existing token imports block (comment + imports)
  // Match the comment block and all following @import url(...tokens...) lines
  content = content.replace(/\/\* Design tokens[^*]*\*\/\s*\n(@import\s+url\([^)]*tokens[^)]*\);\s*\n?)*/gi, '');
  // Also remove any standalone token imports that might remain
  content = content.replace(/@import\s+url\([^)]*tokens[^)]*\);\s*\n?/gi, '');
  
  // Build new import statements
  const imports = cssUrls.map(url => `@import url("${url}");`).join('\n');
  
  // Find the first @import or :root and insert before it
  // @import rules must come first in CSS
  if (cssUrls.length > 0) {
    const importBlock = `/* Design tokens - loaded from remote repo (configured via TOKENS_CSS_URLS env var) */\n${imports}\n\n`;
    
    // Insert at the very beginning, before any other @import or rules
    if (content.trim().startsWith('@import')) {
      // Already has imports, add before them
      content = importBlock + content;
    } else {
      // No imports yet, add at start
      content = importBlock + content;
    }
  }
  
  fs.writeFileSync(globalsPath, content, 'utf8');
  console.log(`✅ Updated globals.css with ${cssUrls.length} token CSS imports`);
}

function main() {
  const env = loadEnvFile();
  const cssUrls = getCssUrls(env);
  
  if (cssUrls.length === 0) {
    console.log('ℹ️  No CSS token URLs configured (TOKENS_CSS_URLS or TOKENS_CSS_BASE_URL)');
    return;
  }
  
  console.log(`📦 Found ${cssUrls.length} CSS token file(s):`);
  cssUrls.forEach(url => console.log(`   - ${url}`));
  
  updateGlobalsCss(cssUrls);
}

main();

