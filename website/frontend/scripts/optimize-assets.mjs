import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assets = new URL('../assets/', import.meta.url);
const output = new URL('optimized/', assets);
await mkdir(output, { recursive: true });
const images = ['electrician-worker.jpg', 'home-hero-worker.png', 'hero-woman.png', 'infinity-logo-transparent.png', 'services/plumber.jpg', 'services/carpenter.jpg', 'services/painter.jpg', 'services/teacher.jpg', 'services/driver.jpg', 'services/loading.jpg'];
for (const name of images) {
  const source = fileURLToPath(new URL(name, assets));
  const stem = name.split('/').at(-1).replace(/\.[^.]+$/, '');
  const widths = stem.includes('logo') ? [160] : stem === 'hero-woman' ? [320] : [480, 960];
  for (const width of widths) {
    const target = fileURLToPath(new URL(`${stem}-${width}.webp`, output));
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
    console.log(`${stem}-${width}.webp: ${Math.round((await stat(target)).size / 1024)} KB`);
  }
}
// Home hero: the teal environment and the teal-hoodie portrait poses (transparent cutouts).
const teal = fileURLToPath(new URL('teal-background.png', assets));
await sharp(teal).webp({ quality: 84 }).toFile(fileURLToPath(new URL('teal-background-1024.webp', output)));
const poses = new URL('../public/hero-motion/', import.meta.url);
for (const name of (await readdir(poses)).filter(file => file.endsWith('.png'))) {
  const stem = name.replace(/.png$/, '');
  for (const width of [640, 1024]) {
    const target = fileURLToPath(new URL(`pose-${stem}-${width}.webp`, output));
    await sharp(fileURLToPath(new URL(name, poses))).resize({ width, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(target);
    console.log(`pose-${stem}-${width}.webp: ${Math.round((await stat(target)).size / 1024)} KB`);
  }
}
await sharp(fileURLToPath(new URL('favicon.png', assets))).resize(48, 48).png().toFile(fileURLToPath(new URL('favicon-48.png', output)));
