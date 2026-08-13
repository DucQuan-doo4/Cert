require('dotenv').config();
const { login, getClient } = require('./lib/auth');
const cheerio = require('cheerio');

async function main() {
  await login();
  const client = await getClient();
  const res = await client.get(
    'https://examcademy.com/exams/amazon/aws-certified-cloud-practitioner-clf-c02/1',
    { headers: { Accept: 'text/html' } }
  );
  const html = res.data;
  const $ = cheerio.load(html);

  let allScripts = '';
  $('script:not([src])').each(function(_, el) {
    allScripts += $(el).html() || '';
  });

  console.log('Total script content length:', allScripts.length);
  console.log('Contains "mdxContent":', allScripts.includes('mdxContent'));
  console.log('Contains "MCQuestion":', allScripts.includes('MCQuestion'));
  console.log('Contains "DataSync":', allScripts.includes('DataSync'));

  const idx = allScripts.indexOf('mdxContent');
  if (idx >= 0) {
    console.log('\n--- Context around "mdxContent" (raw, 120 chars) ---');
    console.log(JSON.stringify(allScripts.substring(idx - 5, idx + 120)));
  }

  const dsIdx = allScripts.indexOf('DataSync');
  if (dsIdx >= 0) {
    console.log('\n--- Context around "DataSync" (raw, 200 chars) ---');
    console.log(JSON.stringify(allScripts.substring(dsIdx - 80, dsIdx + 200)));
  }

  const mcqIdx = allScripts.indexOf('MCQuestion');
  if (mcqIdx >= 0) {
    console.log('\n--- Context around "MCQuestion" (raw, 100 chars) ---');
    console.log(JSON.stringify(allScripts.substring(mcqIdx - 30, mcqIdx + 100)));
  }
}

main().catch(console.error);
