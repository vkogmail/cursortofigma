// Generate CSS variables from design token JSON files
const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKENS_URL = 'https://raw.githubusercontent.com/vkogmail/exact-tokens/main/tokens';
const OUTPUT_DIR = path.join(__dirname, '../public/tokens');

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function flattenTokens(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && 'value' in value) {
      result[path] = value.value;
    } else if (value && typeof value === 'object') {
      Object.assign(result, flattenTokens(value, path));
    }
  }
  return result;
}

function tokenPathToCssVar(path) {
  return `--${path.replace(/\./g, '-')}`;
}

async function generate() {
  try {
    console.log('Downloading token files...');
    const colorTokens = await download(`${TOKENS_URL}/color.json`);
    
    console.log('Flattening tokens...');
    const flattened = flattenTokens(colorTokens);
    
    console.log('Generating CSS...');
    const cssVars = Object.entries(flattened)
      .map(([path, value]) => `  ${tokenPathToCssVar(path)}: ${value};`)
      .join('\n');
    
    const css = `:root {\n${cssVars}\n}\n`;
    
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens-base.css'), css);
    
    console.log(`✅ Generated ${Object.keys(flattened).length} CSS variables`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generate();

