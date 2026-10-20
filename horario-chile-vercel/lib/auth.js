'use strict';
function authorized(req) {
  const user = process.env.ADMIN_USER || '';
  const password = process.env.ADMIN_PASSWORD || '';
  if (!user || !password) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const credentials = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = credentials.indexOf(':');
    return separator >= 0 && credentials.slice(0, separator) === user && credentials.slice(separator + 1) === password;
  } catch { return false; }
}
function challenge(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Administracion Horarios"');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
}
module.exports = { authorized, challenge };
