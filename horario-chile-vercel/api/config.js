'use strict';

const { authorized, challenge } = require('../lib/auth');
const {
  getConfig,
  setConfig,
  getGroups,
  setGroups
} = require('../lib/storage');
const { validate } = require('../lib/schedule');

module.exports = async function handler(req, res) {
  if (!authorized(req)) return challenge(res);

  try {
    res.setHeader('Cache-Control', 'no-store');

    const caseId = req.query.caseId;

    // Compatibilidad con la configuración original
    if (!caseId) {
      if (req.method === 'GET') {
        return res.status(200).json(await getConfig());
      }

      if (req.method === 'PUT') {
        const error = validate(req.body);

        if (error) {
          return res.status(400).json({ error });
        }

        await setConfig(req.body);

        return res.status(200).json({
          ok: true,
          config: req.body
        });
      }

      return res.status(405).json({
        error: 'Método no permitido'
      });
    }

    // Administración por Case ID
    const groups = await getGroups();

    const index = groups.findIndex(
      group => String(group.caseId) === String(caseId)
    );

    if (req.method === 'GET') {
      if (index === -1) {
        return res.status(404).json({
          error: 'CASE_NOT_FOUND',
          caseId: String(caseId)
        });
      }

      return res.status(200).json(groups[index]);
    }

    if (req.method === 'PUT') {
      if (index === -1) {
        return res.status(404).json({
          error: 'CASE_NOT_FOUND',
          caseId: String(caseId)
        });
      }

      const updated = {
        ...groups[index],
        ...req.body,
        caseId: String(caseId)
      };

      const error = validate(updated);

      if (error) {
        return res.status(400).json({ error });
      }

      groups[index] = updated;

      await setGroups(groups);

      return res.status(200).json({
        ok: true,
        config: updated
      });
    }

    return res.status(405).json({
      error: 'Método no permitido'
    });

  } catch (error) {
    const message =
      error.message === 'STORAGE_NOT_CONFIGURED'
        ? 'Configura UPSTASH_REDIS_REST_KV_REST_API_URL y UPSTASH_REDIS_REST_KV_REST_API_TOKEN en Vercel'
        : error.message;

    return res.status(500).json({ error: message });
  }
};
