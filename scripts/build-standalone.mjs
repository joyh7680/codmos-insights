import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, css, data, app, favicon] = await Promise.all([
  readFile(new URL('dist/index.html', root), 'utf8'),
  readFile(new URL('dist/styles.css', root), 'utf8'),
  readFile(new URL('dist/mock-data.js', root), 'utf8'),
  readFile(new URL('dist/app.js', root), 'utf8'),
  readFile(new URL('dist/favicon.svg', root), 'utf8'),
]);
const script = `${data.replace(/^export /gm, '')}\n${app.replace(/^import .*?;\r?\n/, '')}`;
const document = html
  .replace('href="./favicon.svg"', `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`)
  .replace('<link rel="stylesheet" href="./styles.css">', `<style>${css}</style>`)
  .replace('  <script type="module" src="./app.js"></script>\n', '')
  .replace('</body>', `<script type="module">\n${script}\n</script>\n</body>`);
await writeFile(new URL('standalone.html', root), document, 'utf8');
process.stdout.write('Created standalone.html\n');
