/*
 * Safe, non-destructive migration: keeps all legacy job/chat data and only
 * replaces the old chat uniqueness index with partial indexes so booking
 * conversations can coexist with job conversations during rollout.
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const { ensureChatIndexes } = require('../services/chatService');

const run = async () => {
  await mongoose.connect(env.mongoUri);
  await ensureChatIndexes();
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
