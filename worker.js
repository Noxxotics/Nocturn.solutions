/**
 * Nocturn — KeyAuth proxy worker
 * Deploy to Cloudflare Workers. Set these as Worker secrets:
 *   KEYAUTH_NAME    = Vanta
 *   KEYAUTH_OWNERID = htid7JIX5o
 *   KEYAUTH_VER     = 1.0
 */

const KEYAUTH_API = 'https://keyauth.win/api/1.3/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_ACTIONS = new Set(['login', 'register', 'info', 'resetuser']);

async function keyauthGet(params) {
  const res = await fetch(`${KEYAUTH_API}?${params.toString()}`, { method: 'GET' });
  return res.json();
}

async function getSessionId(env) {
  const params = new URLSearchParams({
    type:    'init',
    ver:     env.KEYAUTH_VER,
    name:    env.KEYAUTH_NAME,
    ownerid: env.KEYAUTH_OWNERID,
  });
  const data = await keyauthGet(params);
  if (!data.sessionid) throw new Error('Init failed: ' + (data.message || 'no sessionid'));
  return data.sessionid;
}

export default {
  async fetch(request, env) {
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

    // Step 1: init to get sessionid
    let sessionid;
    try {
      sessionid = await getSessionId(env);
    } catch (err) {
      return json({ success: false, message: 'Auth init failed: ' + err.message }, 502);
    }

    // Step 2: build the action request with sessionid
    const params = new URLSearchParams({
      type,
      sessionid,
      name:    env.KEYAUTH_NAME,
      ownerid: env.KEYAUTH_OWNERID,
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
      params.set('key',      body.key || '');
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
      if (!body.username || !body.pass) {
        return json({ success: false, message: 'Missing credentials' }, 400);
      }
      params.set('username', body.username);
      params.set('pass',     body.pass);
    }

    try {
      const data = await keyauthGet(params);
      return json(data);
    } catch (err) {
      return json({ success: false, message: 'Could not reach auth server' }, 502);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
