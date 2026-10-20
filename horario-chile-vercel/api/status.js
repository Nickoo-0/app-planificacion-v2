'use strict';
const { getConfig } = require('../lib/storage');
const { evaluate } = require('../lib/schedule');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const config = await getConfig();
    const instant = req.query.at ? new Date(req.query.at) : new Date();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(evaluate(config, instant));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
