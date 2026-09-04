/*
 * Safe, non-destructive migration: keeps all legacy job/chat data and only
 * replaces the old chat uniqueness index with partial indexes so booking
 * conversations can coexist with job conversations during rollout.
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const Chat = require('../models/Chat');

const run = async () => {
  await mongoose.connect(env.mongoUri);
  const indexes = await Chat.collection.indexes();
  const oldIndex = indexes.find((index) => index.name === 'job_1_applicant_1' && !index.partialFilterExpression);
  if (oldIndex) await Chat.collection.dropIndex(oldIndex.name);
  await Chat.syncIndexes();
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
