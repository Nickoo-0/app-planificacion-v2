'use strict';
const fs = require('fs');
const path = require('path');
const { authorized, challenge } = require('../lib/auth');
module.exports = function handler(req, res) {
  if (!authorized(req)) return challenge(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8'));
};
