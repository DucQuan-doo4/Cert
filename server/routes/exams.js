const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { fetchExamCatalog } = require('../lib/scraper');

const DATA_DIR = path.join(__dirname, '..', 'data');

const OFFICIAL_EXAM_NAMES = {
  'az-900': 'Microsoft Azure Fundamentals (AZ-900)',
  'az-104': 'Microsoft Azure Administrator (AZ-104)',
  'az-204': 'Developing Solutions for Microsoft Azure (AZ-204)',
  'az-305': 'Designing Azure Infrastructure Solutions (AZ-305)',
  'az-400': 'Designing & Implementing DevOps Solutions (AZ-400)',
  'az-500': 'Microsoft Azure Security Technologies (AZ-500)',
  'az-700': 'Designing Azure Networking Solutions (AZ-700)',
  'az-800': 'Administering Windows Server Hybrid Core (AZ-800)',
  'az-801': 'Configuring Windows Server Hybrid Advanced (AZ-801)',
  'ai-900': 'Microsoft Azure AI Fundamentals (AI-900)',
  'ai-901': 'Microsoft Azure AI Fundamentals (AI-901)',
  'ai-102': 'Designing Azure AI Solutions (AI-102)',
  'ai-103': 'Designing Azure AI Solutions (AI-103)',
  'dp-900': 'Microsoft Azure Data Fundamentals (DP-900)',
  'dp-100': 'Designing Data Science Solutions on Azure (DP-100)',
  'dp-203': 'Data Engineering on Microsoft Azure (DP-203)',
  'dp-300': 'Administering Relational Databases on Azure (DP-300)',
  'dp-420': 'Designing Cloud-Native Apps with Cosmos DB (DP-420)',
  'dp-600': 'Analytics Solutions with Microsoft Fabric (DP-600)',
  'dp-700': 'Data Engineering with Microsoft Fabric (DP-700)',
  'dp-800': 'Implementing Azure Cosmos DB Solutions (DP-800)',
  'pl-900': 'Microsoft Power Platform Fundamentals (PL-900)',
  'pl-200': 'Power Platform Functional Consultant (PL-200)',
  'pl-300': 'Microsoft Power BI Data Analyst (PL-300)',
  'pl-400': 'Microsoft Power Platform Developer (PL-400)',
  'sc-900': 'Microsoft Security & Compliance Fundamentals (SC-900)',
  'sc-100': 'Microsoft Cybersecurity Architect (SC-100)',
  'sc-200': 'Microsoft Security Operations Analyst (SC-200)',
  'sc-300': 'Microsoft Identity & Access Administrator (SC-300)',
  'sc-401': 'Information Protection Administrator (SC-401)',
  'sc-500': 'Microsoft Azure Security Center (SC-500)',
  'ms-900': 'Microsoft 365 Fundamentals (MS-900)',
  'ms-102': 'Microsoft 365 Administrator (MS-102)',
  'ms-700': 'Managing Microsoft Teams (MS-700)',
  'ms-721': 'Collaboration Communications Engineer (MS-721)',
  'md-102': 'Microsoft Endpoint Administrator (MD-102)',
  'aws-certified-cloud-practitioner-clf-c02': 'AWS Certified Cloud Practitioner (CLF-C02)',
  'aws-certified-solutions-architect-associate-saa-c03': 'AWS Certified Solutions Architect - Associate (SAA-C03)',
  'aws-certified-solutions-architect-professional-sap-c02': 'AWS Certified Solutions Architect - Professional (SAP-C02)',
  'aws-certified-ai-practitioner-aif-c01': 'AWS Certified AI Practitioner (AIF-C01)',
  'aws-certified-generative-ai-developer-professional-aip-c01': 'AWS Certified Generative AI Developer (AIP-C01)',
  'aws-certified-developer-associate-dva-c02': 'AWS Certified Developer - Associate (DVA-C02)',
  'aws-certified-devops-engineer-professional-dop-c02': 'AWS Certified DevOps Engineer - Professional (DOP-C02)',
  'aws-certified-data-engineer-associate-dea-c01': 'AWS Certified Data Engineer - Associate (DEA-C01)',
  'aws-certified-cloudops-engineer-associate-soa-c03': 'AWS Certified SysOps Administrator - Associate (SOA-C03)',
  'aws-certified-machine-learning-engineer-associate-mla-c01': 'AWS Certified Machine Learning Engineer (MLA-C01)',
  'aws-certified-advanced-networking-specialty-ans-c01': 'AWS Certified Advanced Networking - Specialty (ANS-C01)',
  'aws-certified-security-specialty-scs-c03': 'AWS Certified Security - Specialty (SCS-C03)',
  'associate-cloud-engineer': 'Google Associate Cloud Engineer',
  'cloud-digital-leader': 'Google Cloud Digital Leader',
  'associate-data-practitioner': 'Google Associate Data Practitioner',
  'associate-google-workspace-administrator': 'Google Workspace Administrator',
  'generative-ai-leader': 'Google Generative AI Leader',
  'professional-cloud-architect': 'Google Professional Cloud Architect',
  'professional-cloud-developer': 'Google Professional Cloud Developer',
  'professional-cloud-devops-engineer': 'Google Professional Cloud DevOps Engineer',
  'professional-cloud-network-engineer': 'Google Professional Cloud Network Engineer',
  'professional-cloud-security-engineer': 'Google Professional Cloud Security Engineer',
  'professional-data-engineer': 'Google Professional Data Engineer',
  'professional-machine-learning-engineer': 'Google Professional Machine Learning Engineer',
  'professional-security-operations-engineer': 'Google Professional Security Operations Engineer',
  'professional-chrome-enterprise-administrator': 'Google Chrome Enterprise Administrator',
  'professional-chromeos-administrator': 'Google ChromeOS Administrator'
};

/**
 * Format raw exam slug into clean human readable title
 */
function formatTitle(slug) {
  if (OFFICIAL_EXAM_NAMES[slug.toLowerCase()]) {
    return OFFICIAL_EXAM_NAMES[slug.toLowerCase()];
  }
  const parts = slug.split('-');
  return parts.map(p => {
    if (['aws', 'az', 'ai', 'dp', 'pl', 'sc', 'ms', 'mb', 'md', 'gh', 'ab'].includes(p.toLowerCase())) {
      return p.toUpperCase();
    }
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

/**
 * GET /api/exams
 */
router.get('/', async (req, res) => {
  try {
    const providers = ['microsoft', 'google', 'amazon'];
    const catalogByProvider = {
      microsoft: { name: 'Microsoft Azure', icon: 'bi-microsoft', color: '#00a4ef', exams: [] },
      google: { name: 'Google Cloud', icon: 'bi-google', color: '#ea4335', exams: [] },
      amazon: { name: 'Amazon Web Services', icon: 'bi-amazon', color: '#ff9900', exams: [] }
    };

    let totalExams = 0;
    let totalQuestions = 0;

    for (const provider of providers) {
      const pDir = path.join(DATA_DIR, provider);
      if (fs.existsSync(pDir)) {
        const files = fs.readdirSync(pDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const filePath = path.join(pDir, file);
          try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            const slug = data.slug || file.replace('.json', '');
            const qCount = Array.isArray(data) ? data.length : (data.questions ? data.questions.length : 0);
            
            const title = OFFICIAL_EXAM_NAMES[slug.toLowerCase()] || 
              (data.title && data.title !== 'Copy link to this question' ? data.title : formatTitle(slug));

            catalogByProvider[provider].exams.push({
              provider,
              slug,
              fullSlug: `${provider}/${slug}`,
              title,
              totalQuestions: qCount,
              totalPages: data.totalPages || Math.ceil(qCount / 25) || 1,
              isComplete: data.isComplete ?? true,
              updatedAt: data.updatedAt || new Date().toISOString()
            });

            totalExams++;
            totalQuestions += qCount;
          } catch (_) {}
        }
      }
    }

    if (totalExams > 0) {
      return res.json({
        success: true,
        source: 'local_github_dataset',
        summary: {
          totalExams,
          totalQuestions,
          providersCount: providers.length
        },
        providers: catalogByProvider
      });
    }

    const exams = await fetchExamCatalog();
    res.json({ success: true, source: 'live_scraper', data: exams, count: exams.length });
  } catch (err) {
    console.error('[Route /api/exams]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
