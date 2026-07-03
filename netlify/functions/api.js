const serverless = require('serverless-http');
const app = require('../../olympus-lite-server/src/app');

module.exports.handler = serverless(app);
