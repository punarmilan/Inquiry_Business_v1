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

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
// Image bytes are stored in TemplateAsset, while templates only keep a URL reference.
// The request still carries a short-lived data URL for the upload itself.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Website backend is live',
    service: 'InquiryExperts Website Backend',
    status: 'ok',
  });
});

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
