const mongoose = require('mongoose');
const connectDB = require('../config/db');
const TemplateSticker = require('../models/TemplateSticker');

const stickers = [
  ['star', 'Star', '⭐'], ['sparkles', 'Sparkles', '✨'], ['heart', 'Heart', '❤️'],
  ['fire', 'Hot', '🔥'], ['party', 'Party', '🎉'], ['thumbs-up', 'Thumbs up', '👍'],
  ['new', 'New', '🆕'], ['sale', 'Sale', '🏷️'],
];

const run = async () => {
  await connectDB();
  for (const [slug, name, emoji] of stickers) {
    await TemplateSticker.findOneAndUpdate({ slug }, { $set: { name, emoji, kind: 'emoji', isActive: true, sortOrder: stickers.findIndex((item) => item[0] === slug) } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`Seeded ${stickers.length} admin stickers.`);
};

run().catch((error) => { console.error('Failed to seed stickers:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
