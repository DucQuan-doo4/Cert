import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Send, Shuffle } from 'lucide-react';
import QuestionCard from './QuestionCard';
import QuestionGrid from './QuestionGrid';

export default function ExamEngine({ exam, onBack, onSaveHistory, bookmarks, onToggleBookmark, isBookmarked }) {
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [revealed, setRevealed] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [mode, setMode] = useState('practice');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const qCount = exam.totalQuestions || 0;
    setTimeRemaining(qCount * 90); // 1.5 mins per question
    
    // Simulate loading questions if they are not already loaded
    // In actual implementation, this might fetch from an API
    if (exam.questions) {
      setQuestions(exam.questions);
    } else {
      // Mock loading - in reality the parent should pass the questions or fetch them
      fetch(`/data/${exam.provider.toLowerCase() === 'amazon web services' ? 'amazon' : exam.provider.toLowerCase()}/${exam.slug}.json`)
        .then(r => r.json())
        .then(data => setQuestions(data.questions || []))
        .catch(e => console.error(e));
    }
  }, [exam]);

  useEffect(() => {
    let timer;
    if (mode === 'exam' && !isSubmitted && timeRemaining > 0) {
      timer = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mode, isSubmitted, timeRemaining]);

  const handleSelectAnswer = (qNumber, answer) => {
    if (mode === 'exam' && isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qNumber]: answer }));
  };

  const handleToggleFlag = (qNumber) => {
    setFlagged(prev => ({ ...prev, [qNumber]: !prev[qNumber] }));
  };

  const handleToggleReveal = (qNumber) => {
    setRevealed(prev => ({ ...prev, [qNumber]: !prev[qNumber] }));
  };

  const handleSubmit = () => {
    if (!window.confirm('Bạn có chắc chắn muốn nộp bài?')) return;
    setIsSubmitted(true);
    let correctCount = 0;
    
    // Simple evaluation (can be more complex based on question types)
    questions.forEach(q => {
      const uAns = userAnswers[q.number];
      if (!uAns) return;
      
      const correctAnswers = (q.answer || '').split(',').map(s => s.trim().toUpperCase());
      const userSelected = Array.isArray(uAns) ? uAns : [uAns];
      
      if (userSelected.length === correctAnswers.length && userSelected.every(a => correctAnswers.includes(a.toUpperCase()))) {
        correctCount++;
      }
    });

    onSaveHistory({
      examSlug: exam.slug,
      examTitle: exam.title,
      total: questions.length,
      correct: correctCount,
      percentage: Math.round((correctCount / questions.length) * 100)
    });
  };

  const handleShuffle = () => {
    if (Object.keys(userAnswers).length > 0 && !isSubmitted) {
      if (!window.confirm('Trộn câu hỏi sẽ xóa toàn bộ kết quả đang làm. Bạn có chắc chắn?')) return;
    }
    
    // Fisher-Yates shuffle
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Re-assign numbers so the UI map still shows 1, 2, 3... in order
    const renumbered = shuffled.map((q, idx) => ({
      ...q,
      originalNumber: q.originalNumber || q.number,
      number: (idx + 1).toString()
    }));

    setQuestions(renumbered);
    setUserAnswers({});
    setFlagged({});
    setRevealed({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setTimeRemaining(renumbered.length * 90);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;

  if (questions.length === 0) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Đang tải câu hỏi...</div>;
  }

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh', padding: '2rem 1rem' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="exam-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Trở về
        </button>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            {exam.title.length > 40 ? exam.title.substring(0, 40) + '...' : exam.title}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Câu {currentIndex + 1} / {questions.length}</div>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button 
            style={{ padding: '0.5rem 1rem', border: 'none', background: mode === 'practice' ? '#f3f4fa' : 'transparent', fontWeight: mode === 'practice' ? 700 : 500, cursor: 'pointer' }}
            onClick={() => setMode('practice')}
            disabled={isSubmitted}
          >
            Luyện tập
          </button>
          <button 
            style={{ padding: '0.5rem 1rem', border: 'none', borderLeft: '1px solid var(--border)', background: mode === 'exam' ? '#f3f4fa' : 'transparent', fontWeight: mode === 'exam' ? 700 : 500, cursor: 'pointer' }}
            onClick={() => setMode('exam')}
            disabled={isSubmitted}
          >
            Thi thử
          </button>
        </div>

        <div className="exam-btn" style={{ cursor: 'default' }}>
          <Clock size={16} /> {formatTime(timeRemaining)}
        </div>

        <div className="exam-btn" style={{ cursor: 'default' }}>
          {answeredCount}/{questions.length} đã làm
        </div>

        <button className="exam-btn" onClick={handleShuffle} disabled={isSubmitted} title="Trộn câu hỏi ngẫu nhiên">
          <Shuffle size={16} /> Trộn
        </button>

        <button className="exam-btn" onClick={handleSubmit} disabled={isSubmitted} style={{ background: isSubmitted ? 'var(--success)' : 'transparent', color: isSubmitted ? '#fff' : 'inherit' }}>
          <Send size={16} /> {isSubmitted ? 'Đã nộp' : 'Nộp Bài'}
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="exam-layout-container" style={{ padding: 0 }}>
        
        {/* Left Column (Question) */}
        <div className="exam-main-col">
          {currentQ && (
            <QuestionCard 
              question={currentQ}
              userAnswer={userAnswers[currentQ.number]}
              isRevealed={revealed[currentQ.number]}
              isFlagged={flagged[currentQ.number]}
              mode={mode}
              isExamSubmitted={isSubmitted}
              onSelectAnswer={handleSelectAnswer}
              onToggleReveal={handleToggleReveal}
              onToggleFlag={handleToggleFlag}
              provider={exam.provider}
              examTitle={exam.title}
              examSlug={exam.slug}
              isBookmarked={isBookmarked ? isBookmarked(exam.slug, currentQ.number) : false}
              onToggleBookmark={onToggleBookmark}
            />
          )}

          {/* Nav Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button className="exam-btn" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0}>
              &lt; Trước
            </button>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {currentIndex + 1} / {questions.length}
            </div>
            <button className="exam-btn" onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))} disabled={currentIndex === questions.length - 1}>
              Sau &gt;
            </button>
          </div>
        </div>

        {/* Right Column (Grid) */}
        <div className="exam-side-col">
          <QuestionGrid 
            questions={questions}
            userAnswers={userAnswers}
            flagged={flagged}
            currentIndex={currentIndex}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
            mode={mode}
            isSubmitted={isSubmitted}
          />
        </div>

      </div>

    </div>
  );
}
