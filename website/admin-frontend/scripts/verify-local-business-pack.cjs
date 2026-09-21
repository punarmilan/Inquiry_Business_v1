const fs = require('node:fs');
const path = require('node:path');
const { validatePack, artifactRoot } = require('./local-business-pack-tools.cjs');

async function main() {
  const { templates, counts } = validatePack();
  console.log('PASS: 36 templates, 6 categories, 6 each; admin JSON and backend validators; unchanged canvas bounds.');
  if (!process.argv.includes('--images')) return;
  fs.mkdirSync(path.join(artifactRoot, 'images'), { recursive: true });
  const urls = [...new Set(templates.flatMap((t) => t.canvas.elements.filter((e) => e.type === 'image').map((e) => e.src)))];
  const results = [];
  for (let i = 0; i < urls.length; i += 4) {
    const batch = await Promise.all(urls.slice(i, i + 4).map(async (url) => {
      const response = await fetch(url, { headers: { Accept: 'image/jpeg' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Artwork unavailable: ${new URL(url).pathname} (${response.status})`);
      const filename = `${new URL(url).pathname.slice(1)}.jpg`;
      const bytes = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(path.join(artifactRoot, 'images', filename), bytes);
      return { url, filename, contentType: response.headers.get('content-type'), bytes: bytes.length };
    }));
    results.push(...batch);
    console.log(`Artwork checked: ${results.length}/${urls.length}`);
  }
  fs.writeFileSync(path.join(artifactRoot, 'validation.json'), JSON.stringify({ checkedAt: new Date().toISOString(), count: templates.length, counts, validations: ['raw admin JSON', 'raw API Joi', 'admin normalization', 'normalized admin JSON', 'normalized API Joi', 'canvas bounds', 'HTTPS artwork'], images: results }, null, 2));
  console.log(`PASS: ${results.length} HTTPS artwork URLs return images.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
