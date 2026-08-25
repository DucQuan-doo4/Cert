import React, { useState, useMemo } from 'react';
import { Search, Play, BookOpen, Layers, ChevronRight, Star, TrendingUp, BarChart3 } from 'lucide-react';
import CustomImport from './CustomImport';
import History from './History';

const PROVIDER_META = {
  amazon: { name: 'AWS', slug: 'aws', color: '#ff9900', gradient: 'linear-gradient(135deg, #ff9900 0%, #ff6600 100%)' },
  microsoft: { name: 'Microsoft', slug: 'microsoft', color: '#0078d4', gradient: 'linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)' },
  google: { name: 'Google Cloud', slug: 'google', color: '#4285f4', gradient: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' }
};

export default function Dashboard({
  catalog,
  historyLogs,
  onSelectExam,
  onImportExam,
  onClearHistory,
  onClearHistoryItem
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { exams, summary } = useMemo(() => {
    if (!catalog || !catalog.exams) {
      return { exams: [], summary: { totalExams: 0, totalQuestions: 0, providerCounts: {} } };
    }
    const allExams = catalog.exams;
    const providerCounts = {};
    let totalQuestions = 0;
    allExams.forEach(exam => {
      const p = exam.provider || 'others';
      providerCounts[p] = (providerCounts[p] || 0) + 1;
      totalQuestions += exam.totalQuestions || 0;
    });
    return {
      exams: allExams,
      summary: { totalExams: allExams.length, totalQuestions, providerCounts }
    };
  }, [catalog]);

  const dynamicProviders = useMemo(() => {
    const list = new Set();
    exams.forEach(exam => { if (exam.provider) list.add(exam.provider); });
    return Array.from(list);
  }, [exams]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesTab = activeTab === 'all' || exam.provider === activeTab;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term ||
        exam.title.toLowerCase().includes(term) ||
        exam.slug.toLowerCase().includes(term) ||
        (exam.provider && exam.provider.toLowerCase().includes(term));
      return matchesTab && matchesSearch;
    });
  }, [exams, activeTab, searchQuery]);

  const getProviderInfo = (provider) => {
    const pLower = (provider || '').toLowerCase();
    return PROVIDER_META[pLower] || { name: provider || 'Other', slug: 'other', color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)' };
  };

  // Recent history stats
  const recentStats = useMemo(() => {
    if (!historyLogs || historyLogs.length === 0) return { avgScore: 0, totalAttempts: 0 };
    const total = historyLogs.length;
    const avg = Math.round(historyLogs.reduce((sum, h) => sum + (h.percentage || 0), 0) / total);
    return { avgScore: avg, totalAttempts: total };
  }, [historyLogs]);

  return (
    <div className="fade-up" style={{ maxWidth: '1320px', margin: '0 auto', padding: '1.5rem' }}>

      {/* ── Hero Stats Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          icon={<Layers size={20} />}
          label="Tổng bộ đề"
          value={summary.totalExams}
          color="var(--accent-primary)"
          bg="var(--accent-light)"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="Tổng câu hỏi"
          value={summary.totalQuestions.toLocaleString()}
          color="#8b5cf6"
          bg="rgba(139,92,246,0.08)"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Điểm trung bình"
          value={recentStats.avgScore > 0 ? `${recentStats.avgScore}%` : '—'}
          color="var(--success-text)"
          bg="var(--success-light)"
        />
        <StatCard
          icon={<BarChart3 size={20} />}
          label="Lần làm bài"
          value={recentStats.totalAttempts}
          color="var(--warning-text)"
          bg="var(--warning-light)"
        />
      </div>

      {/* ── Search + Filter Bar ── */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '1.5rem'
      }}>
        {/* Search Input */}
        <div style={{
          flex: 1,
          minWidth: '280px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          border: '1px solid var(--border)',
          transition: 'var(--transition)',
        }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tìm bộ đề (AZ-900, SAA-C03, Cloud Digital Leader...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.35rem 0',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-main)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600,
                padding: '0.15rem 0.4rem', borderRadius: '4px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          background: 'var(--bg-input)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}>
          <FilterTab active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            Tất cả
          </FilterTab>
          {dynamicProviders.map(prov => {
            const pInfo = getProviderInfo(prov);
            return (
              <FilterTab key={prov} active={activeTab === prov} onClick={() => setActiveTab(prov)}>
                {pInfo.name}
              </FilterTab>
            );
          })}
        </div>
      </div>

      {/* ── Exam Cards Grid ── */}
      {filteredExams.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Search size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.75rem' }} />
          <h3 style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
            Không tìm thấy bộ đề phù hợp
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem'
        }}>
          {filteredExams.map((exam, idx) => {
            const pInfo = getProviderInfo(exam.provider);
            return (
              <div
                key={exam.slug}
                className="card"
                onClick={() => onSelectExam(exam)}
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `fadeUp 0.35s ${idx * 0.02}s cubic-bezier(0.16,1,0.3,1) both`,
                }}
              >
                {/* Provider gradient accent strip */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: pInfo.gradient, borderRadius: '16px 16px 0 0'
                }} />

                {/* Top row: Provider tag + question count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`provider-tag ${pInfo.slug}`}>
                    {pInfo.name}
                  </span>
                  <span style={{
                    fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}>
                    <BookOpen size={12} />
                    {exam.totalQuestions} câu
                  </span>
                </div>

                {/* Exam Title */}
                <h3 style={{
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  color: 'var(--text-primary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '2.66em'
                }} title={exam.title}>
                  {exam.title === 'Copy link to this question' ? exam.slug.toUpperCase() : exam.title}
                </h3>

                {/* Bottom row: Start button */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: '0.65rem', borderTop: '1px solid var(--border)', marginTop: 'auto'
                }}>
                  {exam.isComplete && (
                    <span style={{
                      fontSize: '0.7rem', color: 'var(--success-text)',
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600
                    }}>
                      <Star size={10} fill="currentColor" /> Verified
                    </span>
                  )}
                  {!exam.isComplete && <span />}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)',
                    fontFamily: 'var(--font-heading)'
                  }}>
                    Luyện đề
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Import + History Section ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        <CustomImport onImportExam={onImportExam} />
        <History
          historyLogs={historyLogs}
          onClearHistory={onClearHistory}
          onClearItem={onClearHistoryItem}
        />
      </div>
    </div>
  );
}

/* ── Sub-Components ── */

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{
      padding: '1.15rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem'
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color, flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.85rem',
        borderRadius: 'var(--radius-xs)',
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: 'var(--font-main)',
        cursor: 'pointer',
        border: 'none',
        transition: 'var(--transition)',
        background: active ? 'var(--accent-primary)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-accent)' : 'none',
      }}
    >
      {children}
    </button>
  );
}
