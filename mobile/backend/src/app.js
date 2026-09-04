const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const routes = require('./routes');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const corsOptions =
  env.corsOrigin === '*'
    ? { origin: '*' }
    : {
        origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
        credentials: true,
      };

app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
// Profile/KYC photos are submitted as base64 data URIs (no separate upload endpoint),
// and a single KYC submission can bundle several images (Aadhaar + selfie + category docs).
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// clientIp echoes back whatever Express resolved the caller to. If it shows a
// loopback or proxy address instead of your real one, TRUST_PROXY is wrong and
// every client is sharing a single rate-limit bucket.
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'App backend is live',
    service: 'InquiryExperts App Backend',
    status: 'ok',
    clientIp: req.ip,
  });
});

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
