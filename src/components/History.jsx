import React from 'react';
import { Calendar, Award, Trash2, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

export default function History({ historyLogs, onClearHistory, onClearItem }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoString;
    }
  };

  if (!historyLogs || historyLogs.length === 0) {
    return (
      <div className="glass-panel" style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        color: 'var(--text-secondary)'
      }}>
        <Award size={48} style={{ opacity: 0.2, marginBottom: '0.75rem', color: 'var(--accent-primary)' }} />
        <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Chưa có lịch sử làm bài</h4>
        <p style={{ fontSize: '0.85rem' }}>Kết quả các bài thi thử của bạn sẽ được lưu giữ tại đây để theo dõi tiến độ.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem'
      }}>
        <h3 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.1rem',
          fontWeight: '700',
          color: 'var(--text-primary)'
        }}>
          Lịch sử làm bài gần đây
        </h3>
        <button
          onClick={onClearHistory}
          className="btn btn-outline"
          style={{
            padding: '0.3rem 0.65rem',
            fontSize: '0.75rem',
            borderRadius: '6px',
            color: 'var(--danger-text)',
            borderColor: 'rgba(239, 68, 68, 0.2)'
          }}
        >
          <Trash2 size={12} />
          Xóa toàn bộ
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {historyLogs.map((log) => {
          const isPass = log.percentage >= 70; // Pass threshold 70%
          
          return (
            <div
              key={log.id}
              className="glass-panel"
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${isPass ? 'var(--success-border)' : 'var(--danger-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h4 style={{
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '0.35rem',
                  lineHeight: '1.4'
                }}>
                  {log.examTitle}
                </h4>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    {formatTime(log.date)}
                  </span>
                  <span>•</span>
                  <span style={{
                    color: log.mode === 'practice' ? 'var(--accent-primary)' : 'var(--warning-text)',
                    fontWeight: '600'
                  }}>
                    {log.mode === 'practice' ? 'Luyện tập' : 'Thi thử'}
                  </span>
                </div>
              </div>

              {/* Score Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '800',
                    color: isPass ? 'var(--success-text)' : 'var(--danger-text)',
                    fontFamily: 'var(--font-heading)'
                  }}>
                    {log.score} / {log.total} ({log.percentage}%)
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: isPass ? 'var(--success-text)' : 'var(--danger-text)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {isPass ? 'ĐẠT (PASS)' : 'CHƯA ĐẠT (FAIL)'}
                  </div>
                </div>

                <button
                  onClick={() => onClearItem(log.id)}
                  className="btn-icon"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: 'rgba(255,255,255,0.02)'
                  }}
                  title="Xóa kết quả này"
                >
                  <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
