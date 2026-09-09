const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { attachSocket } = require('./socket');
const { ensureDefaultCategories } = require('./services/categoryService');

const start = async () => {
  try {
    await connectDB();
    await ensureDefaultCategories();

    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: env.corsOrigin === '*' ? { origin: '*' } : { origin: env.corsOrigin.split(',').map((o) => o.trim()) },
    });
    attachSocket(io);
    app.set('io', io);

    httpServer.listen(env.port, () => {
      console.log(`InquiryExperts backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
