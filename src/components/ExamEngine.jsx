import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Award, RotateCcw, AlertCircle, HelpCircle, CheckCircle2, ChevronLeft, ChevronRight, Send, Flag, ShieldAlert } from 'lucide-react';
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
  
  const [mode, setMode] = useState('practice'); // 'practice' or 'exam'
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const timerRef = useRef(null);

  // Load question data
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError('');
      try {
        // If the exam was custom imported, it already has the questions array
        if (exam.questions && Array.isArray(exam.questions)) {
          setQuestions(exam.questions);
          setIsLoading(false);
          initTimer(exam.questions.length);
          return;
        }

        // Otherwise fetch the JSON file dynamically from public folder
        const path = `/data/${exam.fullSlug}.json`;
        const res = await fetch(path);
        if (!res.ok) {
          throw new Error(`Không thể tìm thấy dữ liệu đề thi tại đường dẫn ${path}`);
        }
        const data = await res.json();
        
        // Handle raw arrays or objects with questions array
        let loadedQs = [];
        if (Array.isArray(data)) {
          loadedQs = data;
        } else if (data.questions && Array.isArray(data.questions)) {
          loadedQs = data.questions;
        } else {
          throw new Error('Định dạng câu hỏi không đúng.');
        }

        if (loadedQs.length === 0) {
          throw new Error('Đề thi không chứa câu hỏi nào.');
        }

        // Standardize question number
        const standardized = loadedQs.map((q, idx) => ({
          ...q,
          number: q.number || idx + 1
        }));

        setQuestions(standardized);
        initTimer(standardized.length);
      } catch (err) {
        console.error('Error loading questions:', err);
        setError(err.message || 'Lỗi tải tệp tin đề thi.');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam]);

  // Set up timer depending on mode and question count
  const initTimer = (qCount) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === 'exam') {
      // 2 minutes per question for realistic exam
      const totalTime = qCount * 120;
      setTimeLeft(totalTime);
    } else {
      setTimeSpent(0);
    }

    timerRef.current = setInterval(() => {
      if (mode === 'exam') {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Auto submit when time runs out
            handleExamSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setTimeSpent(prev => prev + 1);
      }
    }, 1000);
  };

  // Restart timer when mode toggles
  useEffect(() => {
    if (questions.length > 0 && !isExamSubmitted) {
      initTimer(questions.length);
    }
  }, [mode, questions, isExamSubmitted]);

  // Format time (MM:SS or HH:MM:SS)
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');

    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  // Handle Option selection
  const handleSelectAnswer = (qNumber, choice) => {
    setUserAnswers(prev => ({
      ...prev,
      [qNumber]: choice
    }));
  };

  // Toggle reveal answer on active card
  const handleToggleReveal = (qNumber) => {
    setRevealedQuestions(prev => ({
      ...prev,
      [qNumber]: !prev[qNumber]
    }));
  };

  // Toggle flagged status
  const handleToggleFlag = (qNumber) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [qNumber]: !prev[qNumber]
    }));
  };

  // Calculate score statistics
  const getResultsSummary = () => {
    let answered = 0;
    let correct = 0;

    questions.forEach(q => {
      const ans = userAnswers[q.number];
      const isCorrect = () => {
        if (!q.answer) return false;
        // Check standard multiple options match
        if (Array.isArray(ans)) {
          const correctLetters = q.answer.split(',').map(s => s.trim().toUpperCase());
          return ans.length === correctLetters.length && ans.every(a => correctLetters.includes(a.toUpperCase()));
        }
        return String(ans).toUpperCase() === String(q.answer).toUpperCase();
      };

      if (ans !== undefined) {
        answered++;
        if (isCorrect()) correct++;
      }
    });

    const percentage = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const isPass = percentage >= 70; // Pass threshold

    return {
      answered,
      correct,
      total: questions.length,
      percentage,
      isPass
    };
  };

  // Submit Exam
  const handleExamSubmit = (isTimeOut = false) => {
    if (isExamSubmitted) return;

    if (!isTimeOut) {
      const { answered, total } = getResultsSummary();
      const confirmSubmit = window.confirm(
        `Bạn đã trả lời ${answered}/${total} câu hỏi. Bạn có chắc chắn muốn nộp bài thi thử?`
      );
      if (!confirmSubmit) return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setIsExamSubmitted(true);

    const stats = getResultsSummary();
    
    // Save to history
    onSaveHistory({
      examTitle: exam.title || exam.slug.toUpperCase(),
      score: stats.correct,
      total: stats.total,
      percentage: stats.percentage,
      mode: mode,
      date: new Date().toISOString()
    });
  };

  // Reset exam state
  const handleExamReset = () => {
    const confirmReset = window.confirm("Bạn có muốn làm lại đề thi từ đầu? Toàn bộ kết quả hiện tại sẽ bị xóa.");
    if (!confirmReset) return;

    setUserAnswers({});
    setFlaggedQuestions({});
    setRevealedQuestions({});
    setIsExamSubmitted(false);
    setCurrentIdx(0);
    initTimer(questions.length);
  };

  // Navigations
  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '1.5rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
          <Clock size={40} className="text-cyan animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)' }}>Đang tải bộ câu hỏi...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Quá trình này có thể mất vài giây tùy vào kích thước tệp dữ liệu.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '1.5rem' }}>
        <div className="glass-panel text-center" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger-text)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>Không thể nạp đề thi</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1.5rem 0' }}>{error}</p>
          <button onClick={onBack} className="btn btn-primary">
            <ArrowLeft size={16} /> Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = questions[currentIdx];
  const stats = getResultsSummary();
  const progressPercent = questions.length > 0 ? (stats.answered / questions.length) * 100 : 0;

  return (
    <div className="exam-engine-container fade-in" style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      {/* Top sticky stats header */}
      <div className="glass-panel navbar" style={{
        position: 'sticky',
        top: '64px', // fits neatly below main navigation bar
        zIndex: 50,
        padding: '0.75rem 1.25rem',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onBack} className="btn btn-glass" style={{ padding: '0.4rem 0.75rem', borderRadius: '8px' }}>
            <ArrowLeft size={14} /> Trở về
          </button>
          <div>
            <h2 style={{
              fontSize: '0.95rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: '700',
              color: 'var(--text-primary)',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }} title={exam.title}>
              {exam.title}
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Đang làm câu: {currentIdx + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Mode Toggle, Timer, Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Practice/Exam Mode Toggle */}
          {!isExamSubmitted && (
            <div style={{
              background: 'var(--bg-primary)',
              padding: '0.2rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.15rem'
            }}>
              <button
                onClick={() => setMode('practice')}
                className="btn"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  background: mode === 'practice' ? 'var(--accent-gradient)' : 'transparent',
                  color: mode === 'practice' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Luyện tập
              </button>
              <button
                onClick={() => setMode('exam')}
                className="btn"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  background: mode === 'exam' ? 'var(--accent-gradient)' : 'transparent',
                  color: mode === 'exam' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Thi thử
              </button>
            </div>
          )}

          {/* Time display */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: '750',
            color: mode === 'exam' && timeLeft < 300 ? 'var(--danger-text)' : 'var(--text-primary)',
            background: mode === 'exam' && timeLeft < 300 ? 'var(--danger-bg)' : 'var(--accent-gradient-subtle)',
            padding: '0.35rem 0.65rem',
            borderRadius: '8px',
            border: `1px solid ${mode === 'exam' && timeLeft < 300 ? 'var(--danger-border)' : 'var(--border-color)'}`
          }}>
            <Clock size={14} className={mode === 'exam' && timeLeft < 300 ? 'animate-pulse' : ''} />
            <span>
              {mode === 'exam' ? `Thời gian: ${formatTime(timeLeft)}` : `Thời gian làm: ${formatTime(timeSpent)}`}
            </span>
          </div>

          {/* Counter progress */}
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Đã làm: <strong style={{ color: 'var(--accent-primary)' }}>{stats.answered}</strong> / {questions.length}
          </div>

          {/* Nộp bài button */}
          {!isExamSubmitted ? (
            <button
              onClick={() => handleExamSubmit(false)}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px' }}
            >
              <Send size={12} />
              Nộp Bài
            </button>
          ) : (
            <button
              onClick={handleExamReset}
              className="btn btn-glass"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px', borderColor: 'var(--warning-border)', color: 'var(--warning-text)' }}
            >
              <RotateCcw size={12} />
              Làm Lại
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '4px',
        background: 'var(--border-color)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '-0.75rem'
      }}>
        <div style={{
          width: `${progressPercent}%`,
          height: '100%',
          background: 'var(--accent-gradient)',
          borderRadius: '2px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Result Card (shown upon submit) */}
      {isExamSubmitted && (
        <div className="glass-panel fade-in" style={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          borderLeft: `5px solid ${stats.isPass ? 'var(--success-border)' : 'var(--danger-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {stats.isPass ? (
                <CheckCircle2 size={24} style={{ color: 'var(--success-text)' }} />
              ) : (
                <ShieldAlert size={24} style={{ color: 'var(--danger-text)' }} />
              )}
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: '800',
                color: stats.isPass ? 'var(--success-text)' : 'var(--danger-text)'
              }}>
                {stats.isPass ? 'Chúc mừng! Bạn đã ĐẠT bài thi thử' : 'Rất tiếc! Bạn CHƯA ĐẠT bài thi thử'}
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {stats.isPass 
                ? 'Tuyệt vời! Kết quả này cho thấy bạn đã sẵn sàng cho kỳ thi thực tế. Hãy ôn luyện thêm các câu sai.' 
                : 'Đừng nản chí! Hãy xem lại danh sách câu trả lời sai phía dưới và đọc kỹ tài liệu tham khảo để bổ sung kiến thức.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm số</span>
              <strong style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', color: stats.isPass ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {stats.percentage}%
              </strong>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Đúng / Tổng câu</span>
              <strong style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                {stats.correct} / {stats.total}
              </strong>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Chế độ</span>
              <strong style={{ fontSize: '1rem', color: 'var(--accent-primary)', textTransform: 'capitalize', display: 'block', marginTop: '0.2rem' }}>
                {mode === 'practice' ? 'Luyện tập' : 'Thi thử'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Main split layout: Questions Card (Left) vs Question Map Grid (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '1.5rem',
        alignItems: 'start'
      }} className="exam-split-layout">
        
        {/* Left Side: Question display card and bottom navigations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
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

          {/* Bottom Card Navigations */}
          <div className="glass-panel" style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)'
          }}>
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
            >
              <ChevronLeft size={16} />
              Câu trước
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Câu {currentIdx + 1} trên {questions.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIdx === questions.length - 1}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
            >
              Câu sau
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Right Side: Map question numbers grid navigation */}
        <div style={{
          position: 'sticky',
          top: '140px', // sticky offset below headers
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <QuestionGrid
            questions={questions}
            currentIdx={currentIdx}
            userAnswers={userAnswers}
            flaggedQuestions={flaggedQuestions}
            revealedQuestions={revealedQuestions}
            isExamSubmitted={isExamSubmitted}
            mode={mode}
            onGridItemClick={(idx) => setCurrentIdx(idx)}
          />

          {/* Flagged questions list helper in exam mode */}
          {Object.keys(flaggedQuestions).filter(k => flaggedQuestions[k]).length > 0 && (
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--warning-text)', marginBottom: '0.5rem' }}>
                <Flag size={14} fill="var(--warning-border)" />
                <span>Câu đã gắn cờ ({Object.keys(flaggedQuestions).filter(k => flaggedQuestions[k]).length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {questions
                  .map((q, idx) => ({ q, idx }))
                  .filter(item => flaggedQuestions[item.q.number])
                  .map(item => (
                    <button
                      key={item.q.number}
                      onClick={() => setCurrentIdx(item.idx)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--warning-bg)',
                        border: '1px solid var(--warning-border)',
                        color: 'var(--warning-text)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {item.q.number}
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
