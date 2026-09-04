const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OfferTemplate = require('../models/OfferTemplate');

const packPath = path.resolve(__dirname, '../../../admin-frontend/src/data/food-offer-template-pack.json');
const pack = require(packPath);

const run = async () => {
  if (!Array.isArray(pack) || pack.length !== 10) {
    throw new Error(`Food template pack must contain exactly 10 templates (found ${Array.isArray(pack) ? pack.length : 0}).`);
  }

  const slugs = pack.map((template) => template.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Food template pack contains duplicate slugs.');

  await connectDB();
  for (const template of pack) {
    const existing = await OfferTemplate.exists({ slug: template.slug });
    const update = {
      $set: { ...template, isActive: true },
      ...(existing ? { $inc: { version: 1 } } : { $setOnInsert: { version: 1 } }),
    };
    const saved = await OfferTemplate.findOneAndUpdate({ slug: template.slug }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).select('_id name slug version isActive canvas editableFields');
    console.log(`${existing ? 'Updated' : 'Created'} ${saved.name} (${saved.slug}) — ${saved.canvas?.elements?.length || 0} layers, v${saved.version}`);
  }
  console.log('Food offer template pack is active and published.');
};

run()
  .catch((error) => {
    console.error('Failed to seed Food offer template pack:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
