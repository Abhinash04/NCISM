const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
