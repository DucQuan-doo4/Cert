/**
 * Diagnostic script — inspect Auth0 login page HTML
 * Run: node diagnose-auth.js
 */
require('dotenv').config();
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');

const jar = new CookieJar();
const client = wrapper(axios.create({
  withCredentials: true,
  jar,
  maxRedirects: 15,
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,*/*',
  },
}));

async function main() {
  console.log('=== Step 1: Initiate login ===');
  let auth0Url, auth0Html;

  try {
    const res = await client.get('https://examcademy.com/auth/login?returnTo=%2F');
    auth0Html = res.data;
    auth0Url = res.request?.res?.responseUrl || res.config?.url || '';
  } catch (err) {
    if (err.response) {
      auth0Html = err.response.data;
      auth0Url = err.response.config?.url || '';
    } else throw err;
  }

  console.log('Landed on URL:', auth0Url);

  // If we need to re-fetch the auth page
  if (!auth0Url.includes('auth.examcademy.com')) {
    const res2 = await client.get('https://auth.examcademy.com/u/login');
    auth0Html = res2.data;
    auth0Url = res2.request?.res?.responseUrl || 'https://auth.examcademy.com/u/login';
  }

  const $ = cheerio.load(auth0Html);

  console.log('\n=== Step 2: Form inputs found ===');
  $('input').each((i, el) => {
    const name = $(el).attr('name');
    const val = $(el).attr('value');
    const type = $(el).attr('type');
    if (name) console.log(`  [${type || 'text'}] name="${name}" value="${val ? val.substring(0, 40) : '(empty)'}"`);
  });

  console.log('\n=== Step 3: Form actions found ===');
  $('form').each((i, el) => {
    console.log(`  form action="${$(el).attr('action')}" method="${$(el).attr('method')}"`);
  });

  console.log('\n=== Step 4: Look for client_id in scripts ===');
  const htmlStr = auth0Html.toString();
  
  // Search for client_id pattern
  const clientIdMatch = htmlStr.match(/"client_id"\s*:\s*"([^"]+)"/);
  const clientIdMatch2 = htmlStr.match(/clientID\s*[:=]\s*["']([^"']+)["']/i);
  const clientIdMatch3 = htmlStr.match(/client_id=([a-zA-Z0-9]+)/);
  console.log('  client_id (JSON):', clientIdMatch?.[1] || 'NOT FOUND');
  console.log('  clientID (JS var):', clientIdMatch2?.[1] || 'NOT FOUND');
  console.log('  client_id (URL param):', clientIdMatch3?.[1] || 'NOT FOUND');

  // Search for auth0 domain / config
  const domainMatch = htmlStr.match(/"domain"\s*:\s*"([^"]+)"/);
  const audienceMatch = htmlStr.match(/"audience"\s*:\s*"([^"]+)"/);
  console.log('  domain:', domainMatch?.[1] || 'NOT FOUND');
  console.log('  audience:', audienceMatch?.[1] || 'NOT FOUND');

  console.log('\n=== Step 5: Scripts loaded ===');
  $('script[src]').each((i, el) => {
    console.log(' ', $(el).attr('src'));
  });

  console.log('\n=== Step 6: First 3000 chars of HTML ===');
  console.log(htmlStr.substring(0, 3000));

  console.log('\n=== Step 7: Check for co/authenticate or similar ===');
  const coAuthMatch = htmlStr.includes('/co/authenticate');
  const ropcMatch = htmlStr.includes('password-realm');
  const universalMatch = htmlStr.includes('universal-login');
  console.log('  /co/authenticate mentioned:', coAuthMatch);
  console.log('  password-realm mentioned:', ropcMatch);
  console.log('  universal-login mentioned:', universalMatch);

  // Extract state from URL
  const stateFromUrl = new URL(auth0Url).searchParams.get('state');
  console.log('\n=== State from URL ===');
  console.log('  state:', stateFromUrl ? stateFromUrl.substring(0, 40) + '...' : 'NOT FOUND');
}

main().catch(console.error);
