import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, RotateCcw, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Send, Flag, ShieldAlert, Trophy, Target } from 'lucide-react';
import QuestionCard from './QuestionCard';
import QuestionGrid from './QuestionGrid';

export default function ExamEngine({ exam, onBack, onSaveHistory }) {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [revealedQuestions, setRevealedQuestions] = useState({});
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('practice');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (exam.questions && Array.isArray(exam.questions)) {
          setQuestions(exam.questions);
          setIsLoading(false);
          initTimer(exam.questions.length);
          return;
        }
        const path = `/data/${exam.fullSlug}.json`;
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Không tìm thấy dữ liệu đề thi: ${path}`);
        const data = await res.json();
        let loadedQs = Array.isArray(data) ? data : (data.questions || []);
        if (loadedQs.length === 0) throw new Error('Đề thi không chứa câu hỏi nào.');
        const standardized = loadedQs.map((q, idx) => ({ ...q, number: q.number || idx + 1 }));
        setQuestions(standardized);
        initTimer(standardized.length);
      } catch (err) {
        setError(err.message || 'Lỗi tải đề thi.');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [exam]);

  const initTimer = (qCount) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mode === 'exam') {
      setTimeLeft(qCount * 120);
    } else {
      setTimeSpent(0);
    }
    timerRef.current = setInterval(() => {
      if (mode === 'exam') {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleExamSubmit(true); return 0; }
          return prev - 1;
        });
      } else {
        setTimeSpent(prev => prev + 1);
      }
    }, 1000);
  };

  useEffect(() => {
    if (questions.length > 0 && !isExamSubmitted) initTimer(questions.length);
  }, [mode, questions, isExamSubmitted]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const handleSelectAnswer = (qNumber, choice) => {
    setUserAnswers(prev => ({ ...prev, [qNumber]: choice }));
  };

  const handleToggleReveal = (qNumber) => {
    setRevealedQuestions(prev => ({ ...prev, [qNumber]: !prev[qNumber] }));
  };

  const handleToggleFlag = (qNumber) => {
    setFlaggedQuestions(prev => ({ ...prev, [qNumber]: !prev[qNumber] }));
  };

  const getResultsSummary = () => {
    let answered = 0, correct = 0;
    questions.forEach(q => {
      const ans = userAnswers[q.number];
      const isCorrect = () => {
        if (!q.answer) return false;
        if (Array.isArray(ans)) {
          const cl = q.answer.split(',').map(s => s.trim().toUpperCase());
          return ans.length === cl.length && ans.every(a => cl.includes(a.toUpperCase()));
        }
        return String(ans).toUpperCase() === String(q.answer).toUpperCase();
      };
      if (ans !== undefined) { answered++; if (isCorrect()) correct++; }
    });
    const percentage = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { answered, correct, total: questions.length, percentage, isPass: percentage >= 70 };
  };

  const handleExamSubmit = (isTimeOut = false) => {
    if (isExamSubmitted) return;
    if (!isTimeOut) {
      const { answered, total } = getResultsSummary();
      if (!window.confirm(`Bạn đã trả lời ${answered}/${total} câu. Nộp bài?`)) return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsExamSubmitted(true);
    const stats = getResultsSummary();
    onSaveHistory({ examTitle: exam.title || exam.slug.toUpperCase(), score: stats.correct, total: stats.total, percentage: stats.percentage, mode, date: new Date().toISOString() });
  };

  const handleExamReset = () => {
    if (!window.confirm('Làm lại đề thi từ đầu?')) return;
    setUserAnswers({}); setFlaggedQuestions({}); setRevealedQuestions({});
    setIsExamSubmitted(false); setCurrentIdx(0); initTimer(questions.length);
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Đang tải câu hỏi...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Không thể tải đề thi</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={onBack} className="btn btn-primary">
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = questions[currentIdx];
  const stats = getResultsSummary();
  const progressPercent = questions.length > 0 ? (stats.answered / questions.length) * 100 : 0;
  const examDisplayTitle = exam.title === 'Copy link to this question' ? exam.slug.toUpperCase() : exam.title;

  return (
    <div className="fade-up" style={{ maxWidth: '1320px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Top Control Bar ── */}
      <div className="card" style={{
        position: 'sticky', top: '52px', zIndex: 50,
        padding: '0.6rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
        borderRadius: 'var(--radius-sm)',
      }}>
        {/* Left: Back + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
            <ArrowLeft size={14} /> Trở về
          </button>
          <div style={{ borderLeft: '1px solid var(--border)', height: '24px' }} />
          <div>
            <div style={{
              fontSize: '0.88rem', fontFamily: 'var(--font-heading)', fontWeight: 700,
              color: 'var(--text-primary)', maxWidth: '280px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }} title={examDisplayTitle}>
              {examDisplayTitle}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Câu {currentIdx + 1} / {questions.length}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Mode Toggle */}
          {!isExamSubmitted && (
            <div style={{
              display: 'flex', background: 'var(--bg-input)', padding: '3px',
              borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)'
            }}>
              {['practice', 'exam'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600,
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-main)',
                  background: mode === m ? 'var(--accent-primary)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  boxShadow: mode === m ? 'var(--shadow-accent)' : 'none',
                  transition: 'var(--transition)',
                }}>
                  {m === 'practice' ? 'Luyện tập' : 'Thi thử'}
                </button>
              ))}
            </div>
          )}

          {/* Timer */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            fontSize: '0.82rem', fontWeight: 700,
            color: mode === 'exam' && timeLeft < 300 ? 'var(--danger-text)' : 'var(--text-primary)',
            background: mode === 'exam' && timeLeft < 300 ? 'var(--danger-light)' : 'var(--bg-input)',
            padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-xs)',
            border: `1px solid ${mode === 'exam' && timeLeft < 300 ? 'var(--danger)' : 'var(--border)'}`,
            fontFamily: 'var(--font-heading)'
          }}>
            <Clock size={13} />
            {mode === 'exam' ? formatTime(timeLeft) : formatTime(timeSpent)}
          </div>

          {/* Answered count */}
          <div style={{
            fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)',
            background: 'var(--bg-input)', padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)'
          }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{stats.answered}</span>/{questions.length} đã làm
          </div>

          {/* Submit/Reset */}
          {!isExamSubmitted ? (
            <button onClick={() => handleExamSubmit(false)} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <Send size={12} /> Nộp Bài
            </button>
          ) : (
            <button onClick={handleExamReset} className="btn btn-ghost" style={{
              padding: '0.35rem 0.75rem', fontSize: '0.8rem',
              borderColor: 'var(--warning)', color: 'var(--warning-text)'
            }}>
              <RotateCcw size={12} /> Làm Lại
            </button>
          )}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div style={{ width: '100%', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          width: `${progressPercent}%`, height: '100%',
          background: 'var(--accent-gradient)', borderRadius: '2px',
          transition: 'width 0.4s ease'
        }} />
      </div>

      {/* ── Result Card ── */}
      {isExamSubmitted && (
        <div className="card scale-in" style={{
          padding: '1.5rem', borderRadius: 'var(--radius-md)',
          borderLeft: `4px solid ${stats.isPass ? 'var(--success)' : 'var(--danger)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: stats.isPass ? 'var(--success-light)' : 'var(--danger-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {stats.isPass ? <Trophy size={24} style={{ color: 'var(--success)' }} /> : <ShieldAlert size={24} style={{ color: 'var(--danger)' }} />}
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: stats.isPass ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {stats.isPass ? 'Chúc mừng! Bạn ĐẠT!' : 'Chưa đạt — Cố gắng thêm!'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {stats.isPass ? 'Kết quả tuyệt vời! Ôn luyện thêm các câu sai.' : 'Xem lại giải thích và ôn tập thêm nhé.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: stats.isPass ? 'var(--success)' : 'var(--danger)' }}>{stats.percentage}%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Điểm số</div>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{stats.correct}/{stats.total}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Đúng/Tổng</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Split Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem', alignItems: 'start' }} className="exam-split-layout">

        {/* Left: Question + Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <QuestionCard
            question={activeQuestion}
            userAnswer={userAnswers[activeQuestion.number]}
            isRevealed={revealedQuestions[activeQuestion.number]}
            isFlagged={flaggedQuestions[activeQuestion.number]}
            mode={mode}
            isExamSubmitted={isExamSubmitted}
            onSelectAnswer={handleSelectAnswer}
            onToggleReveal={handleToggleReveal}
            onToggleFlag={handleToggleFlag}
            provider={exam.provider}
            examTitle={exam.title}
          />

          {/* Bottom Navigation */}
          <div className="card" style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <button onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)} disabled={currentIdx === 0} className="btn btn-ghost" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
              <ChevronLeft size={15} /> Trước
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {currentIdx + 1} / {questions.length}
            </span>
            <button onClick={() => currentIdx < questions.length - 1 && setCurrentIdx(currentIdx + 1)} disabled={currentIdx === questions.length - 1} className="btn btn-ghost" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
              Sau <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Right: Grid + Flagged */}
        <div style={{ position: 'sticky', top: '120px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <QuestionGrid
            questions={questions} currentIdx={currentIdx}
            userAnswers={userAnswers} flaggedQuestions={flaggedQuestions}
            revealedQuestions={revealedQuestions} isExamSubmitted={isExamSubmitted}
            mode={mode} onGridItemClick={(idx) => setCurrentIdx(idx)}
          />
          {Object.keys(flaggedQuestions).filter(k => flaggedQuestions[k]).length > 0 && (
            <div className="card" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning-text)', marginBottom: '0.4rem' }}>
                <Flag size={12} fill="currentColor" /> Gắn cờ ({Object.keys(flaggedQuestions).filter(k => flaggedQuestions[k]).length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {questions.filter(q => flaggedQuestions[q.number]).map(q => (
                  <button key={q.number} onClick={() => setCurrentIdx(questions.indexOf(q))} style={{
                    padding: '0.15rem 0.4rem', background: 'var(--warning-light)',
                    border: '1px solid var(--warning)', color: 'var(--warning-text)',
                    fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer'
                  }}>
                    {q.number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
