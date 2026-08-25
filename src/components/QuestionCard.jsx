import React, { useState } from 'react';
import { Flag, Eye, EyeOff, Languages, Check, X } from 'lucide-react';
import { parseQuestionContent, parseMarkdownToHtml, detectMultiSelect, getExpectedCount } from '../utils/markdown';
import ReferenceBox from './ReferenceBox';

export default function QuestionCard({
  question, userAnswer, isRevealed, isFlagged, mode, isExamSubmitted,
  onSelectAnswer, onToggleReveal, onToggleFlag, provider, examTitle,
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImgSrc, setZoomedImgSrc] = useState('');
  const [isTranslated, setIsTranslated] = useState(false);

  const { number, domain, options, answer, explanation } = question;
  const { cleanText, statements, dropdown, dragDrop } = parseQuestionContent(question.question);
  const isMulti = detectMultiSelect(question);
  const expectedCount = isMulti ? getExpectedCount(question) : 1;

  const selectedArr = isMulti
    ? (Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []))
    : (userAnswer ? [userAnswer] : []);

  const hasAnswered = (isMulti ? selectedArr.length === expectedCount : selectedArr.length > 0) ||
    (statements && userAnswer && Object.keys(userAnswer).length > 0) ||
    (dropdown && userAnswer && Object.keys(userAnswer).length > 0) ||
    (dragDrop && userAnswer && Object.keys(userAnswer).length > 0);

  const showResults = isRevealed || (mode === 'practice' && hasAnswered) || (mode === 'exam' && isExamSubmitted);

  const handleOptionClick = (letter) => {
    if (showResults && mode === 'practice') return;
    if (isMulti) {
      const current = [...selectedArr];
      const idx = current.indexOf(letter);
      if (idx >= 0) { current.splice(idx, 1); } else {
        if (current.length < expectedCount) { current.push(letter); }
        else { current.shift(); current.push(letter); }
      }
      onSelectAnswer(number, current);
    } else {
      onSelectAnswer(number, letter);
    }
  };

  const handleContentClick = (e) => {
    if (e.target.tagName === 'IMG') { setZoomedImgSrc(e.target.src); setIsZoomed(true); }
  };

  const isOptionCorrect = (letter) => {
    if (!answer) return false;
    return answer.split(',').map(s => s.trim().toUpperCase()).includes(letter.toUpperCase());
  };

  const displayQuestionHtml = isTranslated ? cleanText + '<br/><small style="color:var(--text-muted);font-style:italic;margin-top:6px;display:block;">[Bản dịch tự động — nhấn lại nút Dịch để xem gốc]</small>' : cleanText;

  return (
    <div className={`card scale-in ${isFlagged ? 'flagged-card' : ''}`} style={{
      padding: 0, overflow: 'hidden', position: 'relative',
      borderColor: isFlagged ? 'var(--warning)' : undefined,
    }}>
      {/* ── Question Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.85rem 1.25rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{
            background: 'var(--accent-gradient)', color: '#fff',
            fontWeight: 800, fontSize: '0.75rem',
            padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-heading)', letterSpacing: '0.3px'
          }}>
            Câu {number}
          </span>
          {domain && (
            <span style={{
              fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
              background: 'var(--bg-input)', padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)', border: '1px solid var(--border)'
            }}>
              {domain}
            </span>
          )}
          {isMulti && (
            <span style={{
              fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700,
              background: 'var(--accent-light)', padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)'
            }}>
              Chọn {expectedCount} đáp án
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <ActionBtn active={isTranslated} onClick={() => setIsTranslated(!isTranslated)} title="Dịch">
            <Languages size={15} />
          </ActionBtn>
          <ActionBtn active={isRevealed} onClick={() => onToggleReveal(number)} title={isRevealed ? 'Ẩn' : 'Xem'}>
            {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </ActionBtn>
          <ActionBtn
            active={isFlagged}
            onClick={() => onToggleFlag(number)}
            title="Gắn cờ"
            activeColor="var(--warning)"
            activeBg="var(--warning-light)"
          >
            <Flag size={15} fill={isFlagged ? 'currentColor' : 'none'} />
          </ActionBtn>
        </div>
      </div>

      {/* ── Question Body ── */}
      <div style={{ padding: '1.25rem' }}>
        <div
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(displayQuestionHtml) }}
          className="markdown-content"
          style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.7, marginBottom: '1rem' }}
        />

        {/* ── Statements (Microsoft) ── */}
        {statements && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: '0',
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border)', overflow: 'hidden'
            }}>
              <div style={{ padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Câu phát biểu</div>
              <div style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>Yes</div>
              <div style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>No</div>
              {statements.map((st, idx) => {
                const uc = userAnswer && userAnswer[idx];
                const handleSel = (val) => {
                  if (showResults && mode === 'practice') return;
                  onSelectAnswer(number, { ...(userAnswer || {}), [idx]: val });
                };
                const yesCorrect = st.answer && st.answer.toLowerCase() === 'yes';
                const noCorrect = st.answer && st.answer.toLowerCase() === 'no';
                return (
                  <React.Fragment key={idx}>
                    <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', borderBottom: idx < statements.length - 1 ? '1px solid var(--border)' : 'none' }}
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(st.text) }} />
                    {['Yes', 'No'].map(val => {
                      const isThis = uc === val;
                      const correct = val === 'Yes' ? yesCorrect : noCorrect;
                      let bg = isThis ? 'var(--accent-light)' : 'transparent';
                      let color = isThis ? 'var(--accent-primary)' : 'var(--text-muted)';
                      if (showResults && correct) { bg = 'var(--success-light)'; color = 'var(--success-text)'; }
                      if (showResults && isThis && !correct) { bg = 'var(--danger-light)'; color = 'var(--danger-text)'; }
                      return (
                        <div key={val} style={{
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          borderBottom: idx < statements.length - 1 ? '1px solid var(--border)' : 'none',
                          borderLeft: '1px solid var(--border)',
                          background: bg, cursor: 'pointer', transition: 'var(--transition)'
                        }} onClick={() => handleSel(val)}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color }}>{val}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Dropdown blanks (Microsoft) ── */}
        {dropdown && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {dropdown.map((blank, idx) => {
              const uc = userAnswer && userAnswer[idx];
              const correct = showResults && uc === blank.answer;
              const wrong = showResults && uc && uc !== blank.answer;
              return (
                <div key={idx} className="card" style={{ padding: '0.75rem', borderColor: correct ? 'var(--success)' : wrong ? 'var(--danger)' : undefined }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem' }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(blank.label || `Mục ${idx + 1}`) }} />
                  <select value={uc || ''} onChange={e => {
                    if (showResults && mode === 'practice') return;
                    onSelectAnswer(number, { ...(userAnswer || {}), [idx]: e.target.value });
                  }} style={{
                    width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)',
                    border: '1px solid var(--border)', padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-xs)', outline: 'none', fontSize: '0.85rem',
                    ...(correct ? { borderColor: 'var(--success)', color: 'var(--success-text)' } : {}),
                    ...(wrong ? { borderColor: 'var(--danger)', color: 'var(--danger-text)' } : {}),
                  }}>
                    <option value="">-- Chọn đáp án --</option>
                    {blank.options && blank.options.map((o, i) => <option key={i} value={o}>{o}</option>)}
                  </select>
                  {showResults && blank.answer && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--success-text)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Check size={12} /> Đáp án: <strong>{blank.answer}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── DragDrop slots (Microsoft) ── */}
        {dragDrop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {dragDrop.slots.map((slot, idx) => {
              const uc = userAnswer && userAnswer[idx];
              const correct = showResults && uc === slot.answer;
              const wrong = showResults && uc && uc !== slot.answer;
              return (
                <div key={idx} className="card" style={{ padding: '0.75rem', borderColor: correct ? 'var(--success)' : wrong ? 'var(--danger)' : undefined }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem' }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slot.label || `Khái niệm ${idx + 1}`) }} />
                  <select value={uc || ''} onChange={e => {
                    if (showResults && mode === 'practice') return;
                    onSelectAnswer(number, { ...(userAnswer || {}), [idx]: e.target.value });
                  }} style={{
                    width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)',
                    border: '1px solid var(--border)', padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-xs)', outline: 'none', fontSize: '0.85rem',
                    ...(correct ? { borderColor: 'var(--success)', color: 'var(--success-text)' } : {}),
                    ...(wrong ? { borderColor: 'var(--danger)', color: 'var(--danger-text)' } : {}),
                  }}>
                    <option value="">-- Chọn --</option>
                    {dragDrop.items && dragDrop.items.map((o, i) => <option key={i} value={o}>{o}</option>)}
                  </select>
                  {showResults && slot.answer && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--success-text)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Check size={12} /> Ghép cặp: <strong>{slot.answer}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Options List (MCQ) ── */}
        {options && options.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {options.map((opt) => {
              const isPicked = selectedArr.includes(opt.letter);
              const isCorrectOpt = isOptionCorrect(opt.letter);

              let borderColor = 'var(--border)';
              let bg = 'var(--bg-card)';
              let selectorBg = 'transparent';
              let selectorBorder = 'var(--text-muted)';
              let selectorColor = 'var(--text-muted)';
              let resultIcon = null;

              if (isPicked && !showResults) {
                borderColor = 'var(--accent-primary)';
                bg = 'var(--accent-light)';
                selectorBg = 'var(--accent-primary)';
                selectorBorder = 'var(--accent-primary)';
                selectorColor = '#fff';
              }

              if (showResults) {
                if (isCorrectOpt) {
                  borderColor = 'var(--success)';
                  bg = 'var(--success-light)';
                  selectorBg = 'var(--success)';
                  selectorBorder = 'var(--success)';
                  selectorColor = '#fff';
                  resultIcon = <Check size={16} style={{ color: 'var(--success)', marginLeft: 'auto', flexShrink: 0 }} />;
                } else if (isPicked && !isCorrectOpt) {
                  borderColor = 'var(--danger)';
                  bg = 'var(--danger-light)';
                  selectorBg = 'var(--danger)';
                  selectorBorder = 'var(--danger)';
                  selectorColor = '#fff';
                  resultIcon = <X size={16} style={{ color: 'var(--danger)', marginLeft: 'auto', flexShrink: 0 }} />;
                }
              }

              return (
                <div
                  key={opt.letter}
                  onClick={() => handleOptionClick(opt.letter)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.7rem 1rem', borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${borderColor}`, background: bg,
                    cursor: showResults && mode === 'practice' ? 'default' : 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { if (!showResults || mode !== 'practice') e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                  onMouseLeave={e => { if (!showResults || mode !== 'practice') e.currentTarget.style.borderColor = borderColor; }}
                >
                  <div style={{
                    width: '28px', height: '28px',
                    borderRadius: isMulti ? '7px' : '50%',
                    border: `2px solid ${selectorBorder}`,
                    background: selectorBg, color: selectorColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
                    fontFamily: 'var(--font-heading)', transition: 'var(--transition)'
                  }}>
                    {opt.letter}
                  </div>
                  <div
                    className="markdown-content"
                    dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(opt.text) }}
                    style={{ fontSize: '0.9rem', fontWeight: isPicked ? 600 : 400, flex: 1, color: 'var(--text-primary)' }}
                  />
                  {resultIcon}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Explanation ── */}
        {showResults && (
          <div className="fade-in" style={{
            marginTop: '1rem', padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--success-light)',
            borderLeft: '3px solid var(--success)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontWeight: 700, color: 'var(--success-text)', fontSize: '0.88rem',
              marginBottom: '0.6rem', fontFamily: 'var(--font-heading)'
            }}>
              ✔ Đáp án đúng:
              <span style={{
                background: '#fff', padding: '0.12rem 0.5rem', borderRadius: '6px',
                border: '1px solid var(--success)', fontSize: '0.85rem'
              }}>
                {answer || 'Xem giải thích bên dưới'}
              </span>
            </div>
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(explanation || 'Không có giải thích.') }}
              style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}
            />
            <ReferenceBox explanation={explanation} provider={provider} examTitle={examTitle} questionText={cleanText} />
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {isZoomed && (
        <div onClick={() => setIsZoomed(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out', animation: 'fadeIn 0.2s ease'
        }}>
          <img src={zoomedImgSrc} alt="Zoom" style={{
            maxWidth: '90%', maxHeight: '85vh', borderRadius: 'var(--radius-sm)',
            border: '2px solid var(--border)', boxShadow: 'var(--shadow-lg)'
          }} />
        </div>
      )}
    </div>
  );
}

/* ── Sub-component: Small Action Button ── */
function ActionBtn({ active, onClick, title, children, activeColor = 'var(--accent-primary)', activeBg = 'var(--accent-light)' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)',
        background: active ? activeBg : 'transparent',
        color: active ? activeColor : 'var(--text-muted)',
        cursor: 'pointer', transition: 'var(--transition)',
        borderColor: active ? activeColor : 'var(--border)',
      }}
    >
      {children}
    </button>
  );
}
