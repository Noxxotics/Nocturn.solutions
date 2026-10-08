/**
 * Nocturn — KeyAuth proxy worker
 * Deploy to Cloudflare Workers. Set these as Worker secrets (not env vars):
 *   KEYAUTH_NAME    = Vanta
 *   KEYAUTH_OWNERID = htid7JIX5o
 *   KEYAUTH_VER     = 1.0
 *
 * wrangler secret put KEYAUTH_NAME
 * wrangler secret put KEYAUTH_OWNERID
 * wrangler secret put KEYAUTH_VER
 *
 * Then update PROXY_URL in main.js to your worker's URL.
 */

const KEYAUTH_API = 'https://keyauth.win/api/1.3/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Only these action types are forwarded — prevents the proxy from
// being used as a general-purpose KeyAuth relay.
const ALLOWED_ACTIONS = new Set(['login', 'register', 'info', 'resetuser']);

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return json({ success: false, message: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: 'Invalid request body' }, 400);
    }

    const { type } = body;

    if (!ALLOWED_ACTIONS.has(type)) {
      return json({ success: false, message: 'Action not permitted' }, 403);
    }

    // Build the KeyAuth payload — credentials injected here, never in the browser
    const params = new URLSearchParams({
      type,
      name:    env.KEYAUTH_NAME,
      ownerid: env.KEYAUTH_OWNERID,
      ver:     env.KEYAUTH_VER,
    });

    if (type === 'login') {
      if (!body.username || !body.pass || !body.hwid) {
        return json({ success: false, message: 'Missing login fields' }, 400);
      }
      params.set('username', body.username);
      params.set('pass',     body.pass);
      params.set('hwid',     body.hwid);
    }

    if (type === 'register') {
      if (!body.username || !body.pass) {
        return json({ success: false, message: 'Missing register fields' }, 400);
      }
      params.set('username', body.username);
      params.set('pass',     body.pass);
      params.set('key',      '');
      if (body.email) params.set('email', body.email);
    }

    if (type === 'info') {
      if (!body.username || !body.pass || !body.hwid) {
        return json({ success: false, message: 'Missing info fields' }, 400);
      }
      params.set('username', body.username);
      params.set('pass',     body.pass);
      params.set('hwid',     body.hwid);
    }

    if (type === 'resetuser') {
      if (!body.username) {
        return json({ success: false, message: 'Missing username' }, 400);
      }
      params.set('username', body.username);
    }

    let upstream;
    try {
      upstream = await fetch(KEYAUTH_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      });
    } catch (err) {
      return json({ success: false, message: 'Could not reach auth server' }, 502);
    }

    const data = await upstream.json();
    return json(data, upstream.ok ? 200 : upstream.status);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
