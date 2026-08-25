import React, { useState } from 'react';
import { Flag, Eye, EyeOff, Languages, Check, X, Maximize2, Minimize2 } from 'lucide-react';
import { parseQuestionContent, parseMarkdownToHtml, detectMultiSelect, getExpectedCount } from '../utils/markdown';
import ReferenceBox from './ReferenceBox';

export default function QuestionCard({
  question,
  userAnswer,
  isRevealed,
  isFlagged,
  mode, // 'practice' or 'exam'
  isExamSubmitted,
  onSelectAnswer,
  onToggleReveal,
  onToggleFlag,
  provider,
  examTitle,
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImgSrc, setZoomedImgSrc] = useState('');
  const [isTranslated, setIsTranslated] = useState(false);

  const { number, domain, options, answer, explanation } = question;

  // Parse question content
  const { cleanText, statements, dropdown, dragDrop } = parseQuestionContent(question.question);
  const isMulti = detectMultiSelect(question);
  const expectedCount = isMulti ? getExpectedCount(question) : 1;

  // Answers state
  const selectedArr = isMulti
    ? (Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []))
    : (userAnswer ? [userAnswer] : []);

  const hasAnswered = (isMulti ? selectedArr.length === expectedCount : selectedArr.length > 0) || 
    (statements && userAnswer && Object.keys(userAnswer).length > 0) ||
    (dropdown && userAnswer && Object.keys(userAnswer).length > 0) ||
    (dragDrop && userAnswer && Object.keys(userAnswer).length > 0);

  // In practice mode, reveal immediately after answering.
  // In exam mode, only reveal after exam is submitted.
  const showResults = isRevealed || (mode === 'practice' && hasAnswered) || (mode === 'exam' && isExamSubmitted);

  // Handle Option selection
  const handleOptionClick = (letter) => {
    if (showResults && mode === 'practice') return; // Locked in practice mode once shown

    if (isMulti) {
      const current = [...selectedArr];
      const idx = current.indexOf(letter);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        if (current.length < expectedCount) {
          current.push(letter);
        } else {
          current.shift();
          current.push(letter);
        }
      }
      onSelectAnswer(number, current);
    } else {
      onSelectAnswer(number, letter);
    }
  };

  // Handle Image Click (Click-to-Zoom)
  const handleContentClick = (e) => {
    if (e.target.tagName === 'IMG') {
      setZoomedImgSrc(e.target.src);
      setIsZoomed(true);
    }
  };

  // Generate a mock AI Translation for display (since we bypassed backend)
  const getMockTranslation = () => {
    // A simple heuristic translation of common terms for demonstration
    let text = cleanText;
    const dict = {
      'Which': 'Câu nào',
      'What': 'Cái gì',
      'How': 'Làm thế nào',
      'Why': 'Tại sao',
      'service': 'dịch vụ',
      'workload': 'khối lượng công việc',
      'purchasing option': 'hình thức mua/thanh toán',
      'cost-effective': 'tối ưu chi phí',
      'storage': 'lưu trữ',
      'database': 'cơ sở dữ liệu',
      'security': 'bảo mật',
      'compliance': 'tuân thủ',
      'high availability': 'sẵn sàng cao',
      'configure': 'cấu hình',
      'intended': 'dự kiến',
      'training': 'huấn luyện',
      'inference': 'suy luận',
      'details': 'chi tiết',
      'documents': 'tài liệu',
      'transparency': 'tính minh bạch',
      'understanding': 'hiểu biết',
      'scripts': 'kịch bản/mã lệnh',
      'Store': 'Lưu trữ',
      'Create': 'Tạo',
      'Use': 'Sử dụng',
      'Commit': 'Đẩy lên/Lưu trữ',
    };
    
    Object.keys(dict).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      text = text.replace(regex, dict[key]);
    });
    
    return text + `<br/><small style="color:var(--text-muted);font-style:italic;margin-top:8px;display:block;">[Bản dịch tự động nhanh - Click nút Dịch lần nữa để xem bản tiếng Anh gốc]</small>`;
  };

  const displayQuestionHtml = isTranslated ? getMockTranslation() : cleanText;

  // Check if an option is correct
  const isOptionCorrect = (letter) => {
    if (!answer) return false;
    const correctLetters = answer.split(',').map(s => s.trim().toUpperCase());
    return correctLetters.includes(letter.toUpperCase());
  };

  return (
    <div className={`question-card glass-panel fade-in ${isFlagged ? 'flagged-border' : ''}`} style={{
      padding: '1.5rem',
      marginBottom: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Question Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              background: 'var(--accent-gradient)',
              color: '#070d19',
              fontWeight: '800',
              fontSize: '0.8rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontFamily: 'var(--font-heading)'
            }}>
              Câu {number}
            </span>
            {domain && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                • {domain}
              </span>
            )}
          </div>
          {isMulti && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--accent-primary)',
              fontWeight: '600',
              marginTop: '0.25rem'
            }}>
              [Chọn {expectedCount} đáp án]
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setIsTranslated(!isTranslated)}
            className={`btn-icon ${isTranslated ? 'active-action' : ''}`}
            title="Dịch Tiếng Việt"
            style={isTranslated ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : {}}
          >
            <Languages size={16} />
          </button>
          
          <button
            onClick={() => onToggleReveal(number)}
            className={`btn-icon ${isRevealed ? 'active-action' : ''}`}
            title={isRevealed ? "Ẩn đáp án" : "Xem đáp án"}
            style={isRevealed ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : {}}
          >
            {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <button
            onClick={() => onToggleFlag(number)}
            className={`btn-icon ${isFlagged ? 'active-flag' : ''}`}
            title="Gắn cờ câu hỏi"
            style={isFlagged ? { borderColor: 'var(--warning-border)', color: 'var(--warning-text)', background: 'var(--warning-bg)' } : {}}
          >
            <Flag size={16} fill={isFlagged ? 'var(--warning-border)' : 'none'} />
          </button>
        </div>
      </div>

      {/* Question Body */}
      <div
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(displayQuestionHtml) }}
        className="question-body-text markdown-content"
        style={{
          fontSize: '1rem',
          color: 'var(--text-primary)',
          fontWeight: '500',
          lineHeight: '1.6'
        }}
      />

      {/* Interactive Statements (Microsoft specific) */}
      {statements && (
        <div className="statements-widget" style={{ marginTop: '1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px',
            gap: '0.5rem',
            padding: '0.5rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <div>Câu phát biểu</div>
            <div style={{ textAlign: 'center' }}>Yes</div>
            <div style={{ textAlign: 'center' }}>No</div>
          </div>
          {statements.map((st, idx) => {
            const userChoice = userAnswer && userAnswer[idx];
            const isYesCorrect = st.answer && st.answer.toLowerCase() === 'yes';
            const isNoCorrect = st.answer && st.answer.toLowerCase() === 'no';

            const handleStmtSelect = (val) => {
              if (showResults && mode === 'practice') return;
              const newAnswers = { ...(userAnswer || {}) };
              newAnswers[idx] = val;
              onSelectAnswer(number, newAnswers);
            };

            return (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px',
                gap: '0.5rem',
                padding: '0.75rem 0.5rem',
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center',
                fontSize: '0.9rem'
              }}>
                <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(st.text) }} />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleStmtSelect('Yes')}
                    className={`btn ${userChoice === 'Yes' ? 'btn-primary' : 'btn-glass'}`}
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                      ...(showResults && isYesCorrect ? { background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' } : {}),
                      ...(showResults && userChoice === 'Yes' && !isYesCorrect ? { background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' } : {})
                    }}
                  >
                    Yes
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleStmtSelect('No')}
                    className={`btn ${userChoice === 'No' ? 'btn-primary' : 'btn-glass'}`}
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                      ...(showResults && isNoCorrect ? { background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' } : {}),
                      ...(showResults && userChoice === 'No' && !isNoCorrect ? { background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' } : {})
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Dropdown blanks (Microsoft specific) */}
      {dropdown && (
        <div className="dropdowns-widget" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dropdown.map((blank, idx) => {
            const userChoice = userAnswer && userAnswer[idx];
            const isCorrect = showResults && userChoice === blank.answer;
            const isIncorrect = showResults && userChoice && userChoice !== blank.answer;

            const handleDropChange = (e) => {
              if (showResults && mode === 'practice') return;
              const newAnswers = { ...(userAnswer || {}) };
              newAnswers[idx] = e.target.value;
              onSelectAnswer(number, newAnswers);
            };

            return (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}
                     dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(blank.label || `Mục ${idx + 1}`) }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={userChoice || ''}
                    onChange={handleDropChange}
                    className="exam-select"
                    style={{
                      flex: 1,
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      outline: 'none',
                      ...(isCorrect ? { borderColor: 'var(--success-border)', color: 'var(--success-text)' } : {}),
                      ...(isIncorrect ? { borderColor: 'var(--danger-border)', color: 'var(--danger-text)' } : {})
                    }}
                  >
                    <option value="">-- Chọn đáp án --</option>
                    {blank.options && blank.options.map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {showResults && blank.answer && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--success-text)', marginTop: '0.25rem' }}>
                    <Check size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Đáp án đúng: <strong>{blank.answer}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Drag & Drop matching slots (Microsoft specific) */}
      {dragDrop && (
        <div className="dragdrop-widget" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dragDrop.slots.map((slot, idx) => {
            const userChoice = userAnswer && userAnswer[idx];
            const isCorrect = showResults && userChoice === slot.answer;
            const isIncorrect = showResults && userChoice && userChoice !== slot.answer;

            const handleSlotChange = (e) => {
              if (showResults && mode === 'practice') return;
              const newAnswers = { ...(userAnswer || {}) };
              newAnswers[idx] = e.target.value;
              onSelectAnswer(number, newAnswers);
            };

            return (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}
                     dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slot.label || `Khái niệm ${idx + 1}`) }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={userChoice || ''}
                    onChange={handleSlotChange}
                    className="exam-select"
                    style={{
                      flex: 1,
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      outline: 'none',
                      ...(isCorrect ? { borderColor: 'var(--success-border)', color: 'var(--success-text)' } : {}),
                      ...(isIncorrect ? { borderColor: 'var(--danger-border)', color: 'var(--danger-text)' } : {})
                    }}
                  >
                    <option value="">-- Chọn đáp án phù hợp --</option>
                    {dragDrop.items && dragDrop.items.map((item, oIdx) => (
                      <option key={oIdx} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                {showResults && slot.answer && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--success-text)', marginTop: '0.25rem' }}>
                    <Check size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Ghép cặp đúng: <strong>{slot.answer}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Options List (AWS & standard Microsoft MCQ) */}
      {options && options.length > 0 && (
        <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {options.map((opt) => {
            const isPicked = selectedArr.includes(opt.letter);
            const isCorrectOption = isOptionCorrect(opt.letter);

            // Styling variables based on mode and reveal state
            let optionStyle = {
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              cursor: showResults && mode === 'practice' ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              gap: '0.75rem'
            };

            // Selection styles
            if (isPicked && !showResults) {
              optionStyle.borderColor = 'var(--accent-primary)';
              optionStyle.background = 'rgba(0, 242, 254, 0.05)';
            }

            // Results revealed styles (Practice selected or Exam submitted)
            let resultIcon = null;
            if (showResults) {
              if (isCorrectOption) {
                optionStyle.borderColor = 'var(--success-border)';
                optionStyle.background = 'var(--success-bg)';
                optionStyle.color = 'var(--success-text)';
                resultIcon = <Check size={16} style={{ color: 'var(--success-text)', marginLeft: 'auto' }} />;
              } else if (isPicked && !isCorrectOption) {
                optionStyle.borderColor = 'var(--danger-border)';
                optionStyle.background = 'var(--danger-bg)';
                optionStyle.color = 'var(--danger-text)';
                resultIcon = <X size={16} style={{ color: 'var(--danger-text)', marginLeft: 'auto' }} />;
              }
            }

            // Custom radio / checkbox selector shape style
            const selectorStyle = {
              width: '24px',
              height: '24px',
              borderRadius: isMulti ? '6px' : '50%', // Checkbox is square, Radio is circle!
              border: `2px solid ${isPicked ? 'transparent' : 'var(--text-muted)'}`,
              background: isPicked
                ? (showResults
                  ? (isCorrectOption ? 'var(--success-border)' : 'var(--danger-border)')
                  : 'var(--accent-primary)')
                : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPicked ? '#070d19' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: '800',
              flexShrink: 0,
              fontFamily: 'var(--font-heading)'
            };

            return (
              <div
                key={opt.letter}
                onClick={() => handleOptionClick(opt.letter)}
                style={optionStyle}
                className="option-hover-effect"
              >
                <div style={selectorStyle}>
                  {opt.letter}
                </div>
                <div
                  className="option-text markdown-content"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(opt.text) }}
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: isPicked ? '600' : '400',
                    flex: 1
                  }}
                />
                {resultIcon}
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation Box */}
      {showResults && (
        <div className="explanation-box fade-in" style={{
          marginTop: '0.75rem',
          padding: '1.25rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)',
          borderLeft: '4px solid var(--success-border)',
          borderTop: '1px solid var(--border-color)',
          borderRight: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '700',
            color: 'var(--success-text)',
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-heading)'
          }}>
            <span>✔ Đáp án đúng:</span>
            <span style={{
              background: 'var(--success-bg)',
              padding: '0.15rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.9rem'
            }}>
              {answer || 'Xem phân tích giải thích bên dưới'}
            </span>
          </div>

          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(explanation || 'Không có giải thích chi tiết.') }}
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}
          />

          {/* Reference Links Component */}
          <ReferenceBox
            explanation={explanation}
            provider={provider}
            examTitle={examTitle}
            questionText={cleanText}
          />
        </div>
      )}

      {/* Lightbox Zoom */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(7, 13, 25, 0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img
              src={zoomedImgSrc}
              alt="Zoomed diagram"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '8px',
                border: '2px solid var(--border-color)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
              }}
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="btn"
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem'
              }}
            >
              Đóng [X]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
