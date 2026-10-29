'use strict';

const { DEFAULT_CONFIG } = require('./schedule');

const KEY = 'horario-chile:config';
const GROUPS_KEY = 'horario-chile:groups';

async function command(args) {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error('STORAGE_NOT_CONFIGURED');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`STORAGE_ERROR_${response.status}`);
  }

  return response.json();
}

async function getConfig() {
  try {
    const data = await command(['GET', KEY]);

    if (!data.result) {
      return structuredClone(DEFAULT_CONFIG);
    }

    return JSON.parse(data.result);
  } catch (error) {
    if (error.message === 'STORAGE_NOT_CONFIGURED') {
      return structuredClone(DEFAULT_CONFIG);
    }

    throw error;
  }
}

async function setConfig(config) {
  await command(['SET', KEY, JSON.stringify(config)]);
}

async function getGroups() {
  try {
    const data = await command(['GET', GROUPS_KEY]);

    if (data.result) {
      return JSON.parse(data.result);
    }

    const currentConfig = await getConfig();

    return [
      {
        id: '245999',
        name: currentConfig.name || 'Horario atención Chile',
        intentId: '242480',
        caseId: '245999',
        timeZone: currentConfig.timeZone || 'America/Santiago',
        weekly: currentConfig.weekly || structuredClone(DEFAULT_CONFIG.weekly),
        holidays: currentConfig.holidays || [],
        exceptions: currentConfig.exceptions || []
      }
    ];
  } catch (error) {
    if (error.message === 'STORAGE_NOT_CONFIGURED') {
      return [
        {
          id: '245999',
          name: DEFAULT_CONFIG.name,
          intentId: '242480',
          caseId: '245999',
          timeZone: DEFAULT_CONFIG.timeZone,
          weekly: structuredClone(DEFAULT_CONFIG.weekly),
          holidays: [],
          exceptions: []
        }
      ];
    }

    throw error;
  }
}

async function getGroupByCaseId(caseId) {
  const groups = await getGroups();

  return groups.find(
    group => String(group.caseId) === String(caseId)
  ) || null;
}

async function setGroups(groups) {
  await command([
    'SET',
    GROUPS_KEY,
    JSON.stringify(groups)
  ]);
}

module.exports = {
  getConfig,
  setConfig,
  getGroups,
  getGroupByCaseId,
  setGroups
};
