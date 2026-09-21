/**
 * Finds and repairs offer templates that render broken on a phone.
 *
 * Three faults are covered, all of which have reached production before:
 *  1. An image layer bound to a {{token}} nothing fills in — the layer simply
 *     disappears, leaving a hole in the poster. Repaired by binding it to the
 *     offer's own photo (`imageUrls`), which is what every healthy template does.
 *  2. An image pointing at a development address (localhost, 127.0.0.1, a LAN IP).
 *     The phone resolves that to itself, so the layer can never load — and while it
 *     fails it still covers whatever sits beneath it. Repaired by dropping the layer.
 *  3. A template with no artwork at all. Reported only: deleting or redesigning it
 *     is a decision for whoever made it.
 *
 * Read-only by default. Pass --apply to write the repairs.
 *   node src/scripts/repairOfferTemplates.js            # report
 *   node src/scripts/repairOfferTemplates.js --apply    # repair
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OfferTemplate = require('../models/OfferTemplate');

const apply = process.argv.includes('--apply');

// Kept in step with the mobile app (OfferCard) and the admin validator.
const RUNTIME_FIELDS = new Set([
  'title', 'description', 'category', 'terms', 'imageUrls', 'business', 'businessName', 'businessLogo',
  'buttonText', 'discount', 'discountPercentage', 'offerPrice', 'originalPrice', 'startsAt', 'expiresAt',
]);
const DEV_ONLY_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?(\/|$)/i;
const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]{0,59})\s*\}\}/;

// Shown in the library before any offer exists, then replaced by the owner's photo.
const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1000&q=85';

const suppliedFields = (template) => new Set([
  ...RUNTIME_FIELDS,
  ...Object.keys(template.dynamicFields || {}),
  ...(template.editableFields || []).map((field) => field.key).filter(Boolean),
]);

const imageSource = (element) => element.imageUrl || element.src || '';

const repairTemplate = (template) => {
  const elements = template.canvas?.elements;
  if (!Array.isArray(elements)) return null;
  const supplied = suppliedFields(template);
  const notes = [];
  const kept = [];

  for (const element of elements) {
    const source = imageSource(element);
    if (element.type === 'image' && DEV_ONLY_HOST.test(source)) {
      notes.push(`dropped layer "${element.id}" — ${source.slice(0, 60)} only resolves on a developer machine`);
      continue;
    }
    const token = element.type === 'image' ? TOKEN.exec(source)?.[1] : undefined;
    if (token && !supplied.has(token)) {
      notes.push(`layer "${element.id}" bound {{${token}}}, which nothing fills in — now uses the offer's own photo`);
      kept.push({
        ...element,
        field: 'imageUrls',
        key: 'imageUrls',
        // The stock photo keeps the library thumbnail honest; a posted offer replaces it.
        imageUrl: FALLBACK_PHOTO,
        src: FALLBACK_PHOTO,
      });
      continue;
    }
    kept.push(element);
  }

  return notes.length ? { notes, elements: kept } : null;
};

const isBlank = (template) =>
  !template.previewUrl?.trim()
  && !template.canvas?.backgroundImageUrl?.trim()
  && !(template.canvas?.elements || []).length;

const run = async () => {
  await connectDB();
  const templates = await OfferTemplate.find({}).lean();
  let repaired = 0;
  const blanks = [];

  for (const template of templates) {
    if (isBlank(template)) {
      blanks.push(template);
      continue;
    }
    const repair = repairTemplate(template);
    if (!repair) continue;
    repaired += 1;
    console.log(`\n${template.name} (${template.slug})${template.isActive ? '' : ' [inactive]'}`);
    repair.notes.forEach((note) => console.log(`  - ${note}`));
    if (apply) {
      await OfferTemplate.updateOne(
        { _id: template._id },
        { $set: { 'canvas.elements': repair.elements }, $inc: { version: 1 } }
      );
      console.log('  => saved');
    }
  }

  if (blanks.length) {
    console.log(`\nBlank templates (no elements, no background, no preview) — nothing to repair automatically:`);
    blanks.forEach((template) => console.log(`  - ${template.name} (${template.slug})${template.isActive ? ' [ACTIVE — hides an empty card in the app]' : ' [inactive]'}`));
    console.log('  Delete them from Admin > Offer Templates, or give them artwork.');
  }

  console.log(
    `\n${repaired} template(s) ${apply ? 'repaired' : 'need repair'}, ${blanks.length} blank, ${templates.length} checked.`
    + (repaired && !apply ? '\nRe-run with --apply to save these repairs.' : '')
  );
};

run()
  .catch((error) => {
    console.error('Failed to repair offer templates:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
