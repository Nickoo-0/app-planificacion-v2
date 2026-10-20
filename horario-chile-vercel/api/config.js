'use strict';
const { authorized, challenge } = require('../lib/auth');
const { getConfig, setConfig } = require('../lib/storage');
const { validate } = require('../lib/schedule');
module.exports = async function handler(req, res) {
  if (!authorized(req)) return challenge(res);
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') return res.status(200).json(await getConfig());
    if (req.method === 'PUT') {
      const error = validate(req.body);
      if (error) return res.status(400).json({ error });
      await setConfig(req.body);
      return res.status(200).json({ ok: true, config: req.body });
    }
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    const message = error.message === 'STORAGE_NOT_CONFIGURED' ? 'Configura KV_REST_API_URL y KV_REST_API_TOKEN en Vercel' : error.message;
    return res.status(500).json({ error: message });
  }
};
