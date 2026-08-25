const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes below require authentication
router.use(authMiddleware);

// ══════════════════════════════════════
// BOOKMARKS
// ══════════════════════════════════════

// ── GET /api/user/bookmarks ──
router.get('/bookmarks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, exam_slug, question_number, question_data, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      examSlug: r.exam_slug,
      questionNumber: r.question_number,
      questionData: r.question_data,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// ── POST /api/user/bookmarks ──
router.post('/bookmarks', async (req, res) => {
  try {
    const { examSlug, questionNumber, questionData } = req.body;
    if (!examSlug || !questionNumber) {
      return res.status(400).json({ error: 'Thiếu thông tin câu hỏi' });
    }

    // Toggle: if exists, delete; if not, insert
    const existing = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND exam_slug = $2 AND question_number = $3',
      [req.userId, examSlug, questionNumber]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM bookmarks WHERE id = $1', [existing.rows[0].id]);
      res.json({ action: 'removed', message: 'Đã bỏ lưu câu hỏi' });
    } else {
      const result = await pool.query(
        'INSERT INTO bookmarks (user_id, exam_slug, question_number, question_data) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.userId, examSlug, questionNumber, JSON.stringify(questionData || {})]
      );
      res.status(201).json({ action: 'added', id: result.rows[0].id, message: 'Đã lưu câu hỏi' });
    }
  } catch (err) {
    console.error('Toggle bookmark error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// ══════════════════════════════════════
// EXAM HISTORY
// ══════════════════════════════════════

// ── GET /api/user/history ──
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exam_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      examSlug: r.exam_slug,
      examTitle: r.exam_title,
      total: r.total_questions,
      correct: r.correct_count,
      percentage: r.percentage,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// ── POST /api/user/history ──
router.post('/history', async (req, res) => {
  try {
    const { examSlug, examTitle, total, correct, percentage } = req.body;
    const result = await pool.query(
      'INSERT INTO exam_history (user_id, exam_slug, exam_title, total_questions, correct_count, percentage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.userId, examSlug, examTitle, total, correct, percentage]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Save history error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// ── DELETE /api/user/history/:id ──
router.delete('/history/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM exam_history WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    console.error('Delete history error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// ── DELETE /api/user/history (clear all) ──
router.delete('/history', async (req, res) => {
  try {
    await pool.query('DELETE FROM exam_history WHERE user_id = $1', [req.userId]);
    res.json({ message: 'Đã xóa toàn bộ lịch sử' });
  } catch (err) {
    console.error('Clear history error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
