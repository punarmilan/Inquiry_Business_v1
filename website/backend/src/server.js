const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

const start = async () => {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`InquiryExperts web-backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
