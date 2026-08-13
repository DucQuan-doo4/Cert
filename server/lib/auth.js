const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');

const BASE_URL = 'https://examcademy.com';

const session = {
  jar: null,
  client: null,
  isAuthenticated: false,
  lastLogin: null,
};

function createClient(jar) {
  return wrapper(
    axios.create({
      withCredentials: true,
      jar,
      maxRedirects: 15,
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
  );
}

/**
 * Auth0 New Universal Login flow:
 *  1. GET examcademy.com/auth/login  → redirects to auth.examcademy.com/u/login?state=xxx
 *  2. Extract `state` from hidden form input
 *  3. POST username + password + state to SAME URL (no _csrf in new ULP)
 *  4. Auth0 redirects back to examcademy.com → session cookies set
 */
async function loginAuth0(client, email, password) {
  console.log('[Auth] Starting Auth0 Universal Login flow...');

  // ── Step 1: Initiate login flow ──────────────────────────────────────────
  let auth0Html, auth0Url;
  try {
    const res = await client.get(`${BASE_URL}/auth/login?returnTo=%2F`);
    auth0Html = res.data;
    auth0Url  = res.request?.res?.responseUrl || res.config?.url || '';
  } catch (err) {
    if (err.response) {
      auth0Html = err.response.data;
      auth0Url  = err.response.config?.url || '';
    } else throw err;
  }

  console.log(`[Auth] Landed on: ${auth0Url}`);

  if (!auth0Url.includes('auth.examcademy.com')) {
    throw new Error(`Did not reach auth.examcademy.com. Landed on: ${auth0Url}`);
  }

  // ── Step 2: Extract state from form ─────────────────────────────────────
  const $ = cheerio.load(auth0Html);
  const state = $('input[name="state"]').first().val();

  if (!state) {
    // Fallback: state from URL param
    const stateFromUrl = new URL(auth0Url).searchParams.get('state');
    if (!stateFromUrl) {
      throw new Error('Cannot find state parameter in Auth0 form or URL');
    }
    console.log('[Auth] Using state from URL param');
    return submitCredentials(client, auth0Url, stateFromUrl, email, password);
  }

  console.log(`[Auth] Got state: ${state.substring(0, 30)}...`);
  return submitCredentials(client, auth0Url, state, email, password);
}

async function submitCredentials(client, auth0Url, state, email, password) {
  // ── Step 3: POST credentials to same Auth0 URL ───────────────────────────
  // Auth0 New ULP: form POSTs to current URL with state + username + password + action
  console.log('[Auth] POSTing credentials to Auth0...');

  const params = new URLSearchParams();
  params.append('state', state);
  params.append('username', email);
  params.append('password', password);
  params.append('action', 'default');

  let finalUrl = '';
  try {
    const res = await client.post(auth0Url, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: auth0Url,
        Origin: 'https://auth.examcademy.com',
      },
    });
    finalUrl = res.request?.res?.responseUrl || res.config?.url || '';
  } catch (err) {
    if (err.response) {
      finalUrl = err.response.config?.url || '';
      // 401/403 = bad credentials
      if (err.response.status === 401 || err.response.status === 403) {
        throw new Error('Auth0 rejected credentials. Check email/password.');
      }
      // Other errors: still check session below
      console.log(`[Auth] POST returned ${err.response.status} — verifying session...`);
    } else {
      throw err;
    }
  }

  console.log(`[Auth] Post-login URL: ${finalUrl}`);

  // ── Step 4: Verify session ──────────────────────────────────────────────
  // Try /api/auth/session
  try {
    const sessionRes = await client.get(`${BASE_URL}/api/auth/session`);
    const user = sessionRes.data?.user;
    if (user?.email) {
      console.log(`[Auth] ✅ Verified via session: ${user.email}`);
      return true;
    }
  } catch (_) {}

  // Fallback: access a protected exam page
  try {
    const examRes = await client.get(
      `${BASE_URL}/exams/amazon/aws-certified-cloud-practitioner-clf-c02/1`
    );
    const html = typeof examRes.data === 'string' ? examRes.data : '';
    if (html.toLowerCase().includes('question') && html.includes('clf-c02')) {
      console.log('[Auth] ✅ Verified via exam page access');
      return true;
    }
  } catch (_) {}

  return false;
}

async function login() {
  const email = process.env.EXAMCADEMY_EMAIL;
  const password = process.env.EXAMCADEMY_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing EXAMCADEMY_EMAIL or EXAMCADEMY_PASSWORD in .env');
  }
  session.jar = new CookieJar();
  session.client = createClient(session.jar);
  const ok = await loginAuth0(session.client, email, password);
  if (ok) {
    session.isAuthenticated = true;
    session.lastLogin = Date.now();
    return true;
  }
  throw new Error('Auth0 login failed — session could not be verified.');
}

async function getClient() {
  const SESSION_TTL = 6 * 60 * 60 * 1000;
  const isStale =
    !session.isAuthenticated ||
    !session.lastLogin ||
    Date.now() - session.lastLogin > SESSION_TTL;
  if (isStale) {
    console.log('[Auth] Session stale — logging in...');
    await login();
  }
  return session.client;
}

async function reLogin() {
  session.isAuthenticated = false;
  return getClient();
}

module.exports = { getClient, reLogin, login };
