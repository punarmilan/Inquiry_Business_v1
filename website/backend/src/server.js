const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const Worker = require('./models/Worker');

const start = async () => {
  try {
    await connectDB();
    // Existing deployments may still have the old non-sparse unique user index.
    // Directory providers do not have a user account, so make that index sparse.
    await Worker.collection.dropIndex('user_1').catch(() => undefined);
    await Worker.syncIndexes();
    app.listen(env.port, () => {
      console.log(`InquiryExperts web-backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
