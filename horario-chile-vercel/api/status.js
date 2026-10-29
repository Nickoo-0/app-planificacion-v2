'use strict';

const { getConfig, getGroupByCaseId } = require('../lib/storage');
const { evaluate } = require('../lib/schedule');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const caseId = req.query.caseId;

    let config;

    if (caseId) {
      config = await getGroupByCaseId(caseId);

      if (!config) {
        return res.status(404).json({
          error: 'CASE_NOT_FOUND',
          caseId: String(caseId)
        });
      }
    } else {
      // Compatibilidad con el flujo actual
      config = await getConfig();
    }

    const instant = req.query.at
      ? new Date(req.query.at)
      : new Date();

    res.setHeader('Cache-Control', 'no-store');

    const result = evaluate(config, instant);

    if (caseId) {
      result.caseId = String(caseId);
      result.scheduleName = config.name;
      result.intentId = config.intentId || null;
    }

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
