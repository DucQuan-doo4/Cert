require('dotenv').config();
const path = require('path');
const { execSync } = require('child_process');
const { crawlAllProviders, DATA_DIR } = require('../lib/crawler');

const REMOTE_GIT_URL = 'https://github.com/DucQuan-doo4/Cert.git';

async function pushToGit() {
  console.log(`\n[Git] Preparing to push crawled data to ${REMOTE_GIT_URL}...`);
  try {
    // Check if git is initialized in DATA_DIR
    const isGitRepo = require('fs').existsSync(path.join(DATA_DIR, '.git'));
    if (!isGitRepo) {
      console.log('[Git] Initializing git repository in data directory...');
      execSync('git init', { cwd: DATA_DIR, stdio: 'inherit' });
      execSync('git branch -M main', { cwd: DATA_DIR, stdio: 'inherit' });
      execSync(`git remote add origin ${REMOTE_GIT_URL}`, { cwd: DATA_DIR, stdio: 'inherit' });
    }

    // Configure git user if needed
    try {
      execSync('git config user.name "ExamMaster Crawler"', { cwd: DATA_DIR });
      execSync('git config user.email "crawler@exammaster.ai"', { cwd: DATA_DIR });
    } catch (_) {}

    console.log('[Git] Staging files...');
    execSync('git add .', { cwd: DATA_DIR, stdio: 'inherit' });

    const timestamp = new Date().toISOString();
    console.log('[Git] Committing changes...');
    execSync(`git commit -m "Auto-update exam data bank [${timestamp}]"`, { cwd: DATA_DIR, stdio: 'inherit' });

    console.log(`[Git] Pushing to ${REMOTE_GIT_URL}...`);
    execSync('git push -u origin main --force', { cwd: DATA_DIR, stdio: 'inherit' });

    console.log('\n[Git] ✅ Successfully pushed all exam datasets to GitHub!');
  } catch (err) {
    console.error('[Git] ❌ Git push failed:', err.message);
    console.log('[Git] You can manually push the "server/data" directory to GitHub using:');
    console.log(`  cd "${DATA_DIR}"`);
    console.log('  git init && git add . && git commit -m "Add exams"');
    console.log(`  git remote add origin ${REMOTE_GIT_URL}`);
    console.log('  git push -u origin main');
  }
}

async function main() {
  console.log('==================================================');
  console.log('  ExamMaster AI - Full Exam Crawler & Exporter');
  console.log('==================================================');

  try {
    await crawlAllProviders(['amazon', 'microsoft', 'google']);
    await pushToGit();
  } catch (err) {
    console.error('Fatal Crawler Error:', err);
  }
}

main();
