import React from 'react';

export default function QuestionGrid({
  questions, userAnswers, flagged, currentIndex, onSelectQuestion, mode, isSubmitted
}) {
  return (
    <div className="exam-grid-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
        Bản đồ câu hỏi ({questions.length})
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.75rem',
        marginBottom: '2rem',
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '0.5rem' // space for scrollbar
      }}>
        {questions.map((q, idx) => {
          const isAnswered = userAnswers[q.number] && (Array.isArray(userAnswers[q.number]) ? userAnswers[q.number].length > 0 : true);
          const isFlag = flagged[q.number];
          const showResult = (mode === 'exam' && isSubmitted) || (mode === 'practice' && isAnswered);
          
          let color = 'var(--text-primary)';
          
          if (showResult) {
            // Simplified correctness check for grid dot colors
            const uAns = userAnswers[q.number];
            if (uAns) {
              const correctAnswers = (q.answer || '').split(',').map(s => s.trim().toUpperCase());
              const userSelected = Array.isArray(uAns) ? uAns : [uAns];
              const isCorrect = userSelected.length === correctAnswers.length && userSelected.every(a => correctAnswers.includes(a.toUpperCase()));
              if (isCorrect) color = 'var(--success)';
              else color = 'var(--danger)';
            }
          }

          return (
            <div
              key={q.number}
              onClick={() => onSelectQuestion(idx)}
              className={`exam-grid-number ${idx === currentIndex ? 'active' : ''}`}
            >
              {isFlag && (
                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)' }} />
              )}
              {isAnswered && !showResult && (
                <div style={{ position: 'absolute', bottom: '2px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
              )}
              <span style={{ color: color }}>{q.number}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <LegendItem icon={<div style={{ width: '10px', height: '10px', background: 'transparent', border: '2px solid var(--border)', borderRadius: '2px' }}/>} label="Đã trả lời" />
        <LegendItem icon={<div style={{ width: '10px', height: '10px', background: 'var(--warning)', borderRadius: '2px' }}/>} label="Đã gắn cờ review" />
        <LegendItem icon={<div style={{ width: '10px', height: '10px', background: '#e0f2fe', borderRadius: '50%' }}/>} label="Đang xem" />
        <LegendItem icon={<div style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '50%' }}/>} label="Câu trả lời đúng" />
        <LegendItem icon={<div style={{ width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%' }}/>} label="Câu trả lời sai" />
      </div>
    </div>
  );
}

function LegendItem({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
      {icon}
      {label}
    </div>
  );
}
