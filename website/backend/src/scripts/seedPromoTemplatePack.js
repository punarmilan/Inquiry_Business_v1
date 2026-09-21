/**
 * Publishes the promo offer template pack (admin-frontend/src/data/promo-offer-template-pack.json).
 * Re-runnable: a template is matched by slug, so running this again updates the
 * published copy and bumps its version instead of creating duplicates.
 *
 *   npm run seed:promo-pack
 */
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OfferTemplate = require('../models/OfferTemplate');

const packPath = path.resolve(__dirname, '../../../admin-frontend/src/data/promo-offer-template-pack.json');
const pack = require(packPath);

const run = async () => {
  if (!Array.isArray(pack) || !pack.length) throw new Error('Promo template pack is empty.');
  const slugs = pack.map((template) => template.slug);
  if (slugs.some((slug) => !slug)) throw new Error('Every template in the pack needs a slug.');
  if (new Set(slugs).size !== slugs.length) throw new Error('Promo template pack contains duplicate slugs.');

  await connectDB();
  for (const template of pack) {
    const existing = await OfferTemplate.exists({ slug: template.slug });
    const saved = await OfferTemplate.findOneAndUpdate(
      { slug: template.slug },
      {
        $set: { ...template, isActive: true },
        ...(existing ? { $inc: { version: 1 } } : { $setOnInsert: { version: 1 } }),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).select('_id name slug version canvas');
    console.log(`${existing ? 'Updated' : 'Created'} ${saved.name} (${saved.slug}) — ${saved.canvas?.elements?.length || 0} layers, v${saved.version}`);
  }
  console.log('Promo offer template pack is active and published.');
};

run()
  .catch((error) => {
    console.error('Failed to seed the promo template pack:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
