const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const AdminUser = require('../models/AdminUser');

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  });
  return args;
};

const isEnabled = (value) => value === true || value === 'true' || value === '1';

const run = async () => {
  const args = parseArgs();
  const { email, password, name } = args;

  if (!email || !password || !name || !String(name).trim()) {
    console.error('Usage: node src/scripts/seedAdmin.js --email=admin@kaamsaathi.com --password=ChangeMe123! --name="Root Admin" [--update=true] [--current-email=old@email.com]');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const normalizedEmail = String(email).trim().toLowerCase();
  const lookupEmail = String(args['current-email'] || normalizedEmail).trim().toLowerCase();
  const existing = await AdminUser.findOne({ email: lookupEmail });
  if (existing) {
    if (!isEnabled(args.update)) {
      console.error(`An admin with email ${lookupEmail} already exists. Re-run with --update=true to update it.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    existing.email = normalizedEmail;
    existing.name = String(name).trim();
    existing.passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
    existing.isActive = true;
    await existing.save();
    console.log(`Admin credentials updated for ${normalizedEmail}.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const admin = await AdminUser.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'super-admin',
  });

  console.log(`Admin created: ${admin.email} (id: ${admin._id})`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed admin:', error);
  process.exit(1);
});
