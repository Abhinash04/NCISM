const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const { auditRequests } = require('./middlewares/audit.middleware');

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(auditRequests); // append-only audit trail for every successful write

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
