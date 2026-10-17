// Render build step: copies the site into dist/ and writes js/config.js from environment variables.
// Render > Static Site > Build Command: node build.js   Publish Directory: dist
const fs = require('fs'), path = require('path');
const url = process.env.WEB_APP_URL;
if (!url) { console.error('Missing environment variable WEB_APP_URL'); process.exit(1); }
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['index.html', 'css', 'js', 'assets']) fs.cpSync(item, path.join(out, item), { recursive: true });
fs.writeFileSync(path.join(out, 'js', 'config.js'),
  `window.APP_CONFIG = ${JSON.stringify({ WEB_APP_URL: url, REFRESH_SECONDS: +process.env.REFRESH_SECONDS || 30 })};\n`);
console.log('Build complete.');
