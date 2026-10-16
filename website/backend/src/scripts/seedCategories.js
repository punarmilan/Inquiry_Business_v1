const mongoose = require('mongoose');
const env = require('../config/env');
const Category = require('../models/Category');

const DEFAULT_CATEGORIES = [
  { name: 'Helper', key: 'helper', groupKey: 'labor', groupName: 'Labor', icon: 'account-hard-hat-outline', color: '#F45B18', kycDocumentLabel: 'Helper Work ID', sortOrder: 0 },
  { name: 'Construction', key: 'construction', groupKey: 'labor', groupName: 'Labor', icon: 'hard-hat', color: '#E0A030', kycDocumentLabel: 'Construction Safety Card', sortOrder: 1 },
  { name: 'Loading', key: 'loading', groupKey: 'labor', groupName: 'Labor', icon: 'package-variant-closed', color: '#A45E2D', kycDocumentLabel: 'Loading Work ID', sortOrder: 2 },
  { name: 'Cleaning', key: 'cleaning', groupKey: 'labor', groupName: 'Labor', icon: 'spray-bottle', color: '#E8632F', kycDocumentLabel: 'Cleaning Work Certificate', sortOrder: 3 },
  { name: 'Electrician', key: 'electrician', groupKey: 'skilled-workers', groupName: 'Skilled Workers', icon: 'power-plug', color: '#7C5BE0', kycDocumentLabel: 'Electrician License', sortOrder: 100 },
  { name: 'Plumber', key: 'plumber', groupKey: 'skilled-workers', groupName: 'Skilled Workers', icon: 'pipe-wrench', color: '#2F7FD4', kycDocumentLabel: 'Plumbing Certificate', sortOrder: 101 },
  { name: 'Carpenter', key: 'carpenter', groupKey: 'skilled-workers', groupName: 'Skilled Workers', icon: 'hammer-screwdriver', color: '#8B5E34', kycDocumentLabel: 'Carpentry Work Certificate', sortOrder: 102 },
  { name: 'Painter', key: 'painter', groupKey: 'skilled-workers', groupName: 'Skilled Workers', icon: 'format-paint', color: '#2E9E8B', kycDocumentLabel: 'Painting Work Certificate', sortOrder: 103 },
  { name: 'Graphic Designer', key: 'graphic-designer', groupKey: 'professional', groupName: 'Professional', icon: 'palette-outline', color: '#D946EF', kycDocumentLabel: 'Design Portfolio or Certificate', sortOrder: 200 },
  { name: 'Video Editor', key: 'video-editor', groupKey: 'professional', groupName: 'Professional', icon: 'video-outline', color: '#EF4444', kycDocumentLabel: 'Editing Portfolio or Certificate', sortOrder: 201 },
  { name: 'Developer', key: 'developer', groupKey: 'professional', groupName: 'Professional', icon: 'code-tags', color: '#2563EB', kycDocumentLabel: 'Developer Portfolio or Certificate', sortOrder: 202 },
  { name: 'Accountant', key: 'accountant', groupKey: 'professional', groupName: 'Professional', icon: 'calculator-variant-outline', color: '#0F766E', kycDocumentLabel: 'Accounting Certificate', sortOrder: 203 },
  { name: 'Teacher', key: 'teacher', groupKey: 'professional', groupName: 'Professional', icon: 'school-outline', color: '#C97700', kycDocumentLabel: 'Teaching Certificate', sortOrder: 204 },
  { name: 'Lawyer', key: 'lawyer', groupKey: 'professional', groupName: 'Professional', icon: 'scale-balance', color: '#4B5563', kycDocumentLabel: 'Bar Council ID', sortOrder: 205 },
  { name: 'Photographer', key: 'photographer', groupKey: 'professional', groupName: 'Professional', icon: 'camera-outline', color: '#7C3AED', kycDocumentLabel: 'Photography Portfolio or ID', sortOrder: 206 },
  { name: 'Maid', key: 'maid', groupKey: 'home-services', groupName: 'Home Services', icon: 'broom', color: '#E8632F', kycDocumentLabel: 'Maid Work ID', sortOrder: 300 },
  { name: 'Cook', key: 'cook', groupKey: 'home-services', groupName: 'Home Services', icon: 'chef-hat', color: '#F97316', kycDocumentLabel: 'Cooking Work Certificate', sortOrder: 301 },
  { name: 'Driver', key: 'driver', groupKey: 'home-services', groupName: 'Home Services', icon: 'card-account-details-star-outline', color: '#2E9E5B', kycDocumentLabel: 'Driving License', sortOrder: 302 },
  { name: 'Baby Sitter', key: 'baby-sitter', groupKey: 'home-services', groupName: 'Home Services', icon: 'baby-face-outline', color: '#EC4899', kycDocumentLabel: 'Baby Sitter ID or Reference', sortOrder: 303 },
];

const run = async () => {
  await mongoose.connect(env.mongoUri);

  for (const cat of DEFAULT_CATEGORIES) {
    await Category.findOneAndUpdate({ key: cat.key }, { $setOnInsert: cat }, { upsert: true });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories (existing ones left untouched).`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed categories:', error);
  process.exit(1);
});
