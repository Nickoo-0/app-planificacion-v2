'use strict';
const { DEFAULT_CONFIG } = require('./schedule');
const KEY = 'horario-chile:config';

async function command(args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('STORAGE_NOT_CONFIGURED');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error(`STORAGE_ERROR_${response.status}`);
  return response.json();
}

async function getConfig() {
  try {
    const data = await command(['GET', KEY]);
    if (!data.result) return structuredClone(DEFAULT_CONFIG);
    return JSON.parse(data.result);
  } catch (error) {
    if (error.message === 'STORAGE_NOT_CONFIGURED') return structuredClone(DEFAULT_CONFIG);
    throw error;
  }
}

async function setConfig(config) {
  await command(['SET', KEY, JSON.stringify(config)]);
}

module.exports = { getConfig, setConfig };
