require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { login } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/exams', require('./routes/exams'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// SPA Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ExamMaster AI Container Server running at http://localhost:${PORT}`);
  console.log(`   GET  /                                         — SPA Web Application`);
  console.log(`   GET  /api/exams                                — Full 85-exam catalog (Local Dataset Priority)`);
  console.log(`   GET  /api/questions/microsoft/az-900/1          — Questions page`);
  console.log(`   GET  /api/questions/search?q=azure             — Search questions across all 85 exams`);
  console.log(`   POST /api/ai/translate                         — AI Translation`);
  console.log(`   POST /api/ai/tutor                             — AI Tutor Chat`);
  console.log(`   GET  /health                                   — Health check\n`);

  // Optional background auth login for live fallback
  if (process.env.EXAMCADEMY_EMAIL && process.env.EXAMCADEMY_PASSWORD) {
    login()
      .then(() => console.log('🔐 ExamCademy session active'))
      .catch((err) => console.warn('⚠️  ExamCademy live login skipped (using offline dataset):', err.message));
  }
});
