#!/usr/bin/env node
/**
 * Downloads CSS token files from the remote repository
 * and saves them to the public/tokens directory
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Use the GitHub blob URL converted to raw format
const TOKENS_BASE_URL = 'https://raw.githubusercontent.com/vkogmail/exact-tokens/main/demo/public/tokens';
const OUTPUT_DIR = path.join(__dirname, '../public/tokens');

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/css,text/plain,*/*'
      }
    };
    
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        // Try following redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            return downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
          }
        }
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, data, 'utf8');
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('📥 Downloading CSS token files...');
    console.log(`   From: ${TOKENS_BASE_URL}`);
    
    await downloadFile(
      `${TOKENS_BASE_URL}/tokens-base.css`,
      path.join(OUTPUT_DIR, 'tokens-base.css')
    );
    console.log('✅ Downloaded tokens-base.css');
    
    await downloadFile(
      `${TOKENS_BASE_URL}/tokens-themes.css`,
      path.join(OUTPUT_DIR, 'tokens-themes.css')
    );
    console.log('✅ Downloaded tokens-themes.css');
    
    console.log(`✅ All CSS token files saved to ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Error downloading CSS files:', error.message);
    console.error('\n💡 The CSS files might not exist yet at that path.');
    console.error('   You may need to generate them in the exact-tokens repository first.');
    console.error('   Or check if the path is correct in the GitHub repo.');
    process.exit(1);
  }
}

main();

