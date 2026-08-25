import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import CustomImport from './CustomImport';
import History from './History';

const PROVIDER_META = {
  amazon: { 
    name: 'AWS', 
    slug: 'amazon', 
    badgeType: 'custom',
    badgeIcon: '/aws-logo.png',
    gradient: 'var(--btn-aws-gradient)', 
    borderGradient: 'var(--aws-border)' 
  },
  microsoft: { 
    name: 'Microsoft Azure', 
    slug: 'microsoft', 
    badgeType: 'devicon',
    badgeIcon: 'azure/azure-original',
    gradient: 'var(--btn-ms-gradient)', 
    borderGradient: 'var(--ms-border)' 
  },
  google: { 
    name: 'Google Cloud', 
    slug: 'google', 
    badgeType: 'devicon',
    badgeIcon: 'googlecloud/googlecloud-original',
    gradient: 'var(--btn-gcp-red)', // Can alternate between red/green if needed, using red as default
    borderGradient: 'var(--gcp-border)' 
  }
};

export default function Dashboard({
  catalog,
  historyLogs,
  activeFilter,
  onSelectExam,
  onImportExam,
  onClearHistory,
  onClearHistoryItem
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const { exams, summary } = useMemo(() => {
    if (!catalog || !catalog.exams) {
      return { exams: [], summary: { totalExams: 0, totalQuestions: 0 } };
    }
    const allExams = catalog.exams;
    let totalQuestions = 0;
    allExams.forEach(exam => {
      totalQuestions += exam.totalQuestions || 0;
    });
    return {
      exams: allExams,
      summary: { totalExams: allExams.length, totalQuestions }
    };
  }, [catalog]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const p = exam.provider ? exam.provider.toLowerCase() : 'other';
      const matchesTab = activeFilter === 'all' || p.includes(activeFilter) || activeFilter.includes(p);
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term ||
        exam.title.toLowerCase().includes(term) ||
        exam.slug.toLowerCase().includes(term) ||
        p.includes(term);
      return matchesTab && matchesSearch;
    });
  }, [exams, activeFilter, searchQuery]);

  const getProviderInfo = (provider, index = 0) => {
    const pLower = (provider || '').toLowerCase();
    for (const key in PROVIDER_META) {
      if (pLower.includes(key) || key.includes(pLower)) {
        let meta = { ...PROVIDER_META[key] };
        // Alternate Google Cloud button colors based on index to mimic mockup (red then green)
        if (meta.slug === 'google' && index % 2 !== 0) {
          meta.gradient = 'var(--btn-gcp-green)';
        }
        return meta;
      }
    }
    return { name: provider || 'Other', slug: 'other', gradient: 'linear-gradient(to right, #6b7280, #9ca3af)', borderGradient: 'linear-gradient(to bottom, #6b7280, #9ca3af)' };
  };

  // Recent history stats
  const recentStats = useMemo(() => {
    if (!historyLogs || historyLogs.length === 0) return { passRate: 0, qsPracticed: 0 };
    const passed = historyLogs.filter(h => h.percentage >= 70).length;
    const passRate = Math.round((passed / historyLogs.length) * 100);
    const qsPracticed = historyLogs.reduce((sum, h) => sum + (h.total || 0), 0);
    return { passRate, qsPracticed };
  }, [historyLogs]);

  return (
    <div className="fade-up" style={{ padding: '2rem', maxWidth: '1400px', width: '100%' }}>
      
      {/* ── Top Hero Search ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem 1.5rem',
          border: '1px solid var(--border)',
          transition: 'var(--transition)',
        }}>
          <Search size={22} style={{ color: 'var(--ring-color)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search for an exam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.2rem 0',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '1.2rem',
              fontFamily: 'var(--font-main)'
            }}
          />
        </div>
      </div>

      {/* ── Main Bento Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        
        {/* Exam Cards */}
        {filteredExams.map((exam, idx) => {
          const pInfo = getProviderInfo(exam.provider, idx);
          return (
            <div
              key={exam.slug}
              className="exam-card"
              onClick={() => onSelectExam(exam)}
            >
              {/* Left Gradient Border */}
              <div className="exam-card-border" style={{ background: pInfo.borderGradient }} />

              {/* Provider tag (Logo + Text) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {pInfo.badgeType === 'devicon' ? (
                  <>
                    <img src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${pInfo.badgeIcon}.svg`} alt={pInfo.name} style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{pInfo.name}</span>
                  </>
                ) : (
                  <>
                    <img src={pInfo.badgeIcon} alt={pInfo.name} style={{ height: '20px' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{pInfo.name}</span>
                  </>
                )}
              </div>

              {/* Exam Title */}
              <h3 className="exam-card-title" title={exam.title}>
                {exam.title === 'Copy link to this question' ? exam.slug.toUpperCase() : exam.title}
              </h3>

              {/* Bottom section: Questions + Progress + Start Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ flex: 1, marginRight: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                    {exam.totalQuestions} questions
                  </div>
                  {/* Decorative Progress Bar */}
                  <div style={{ width: '100%', height: '4px', background: 'var(--ring-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: exam.isComplete ? '100%' : '20%', height: '100%', background: 'var(--ring-color)', borderRadius: '2px' }} />
                  </div>
                </div>

                <button className="btn-start" style={{ background: pInfo.gradient }}>
                  Start
                </button>
              </div>
            </div>
          );
        })}

        {/* ── Stats Card ── */}
        <div className="exam-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Stats</h3>
          
          <div className="stats-circle-container" style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' }}>
            
            <div className="stats-circle-container">
              <div className="circular-progress" style={{ '--progress': '100' }}>
                <span className="circular-progress-value">{summary.totalExams}</span>
              </div>
              <span className="stats-label">Total exams</span>
            </div>

            <div className="stats-circle-container">
              <div className="circular-progress" style={{ '--progress': Math.min(100, (recentStats.qsPracticed / Math.max(1, summary.totalQuestions)) * 100).toString() }}>
                <span className="circular-progress-value">{recentStats.qsPracticed}</span>
              </div>
              <span className="stats-label">Questions<br/>practiced</span>
            </div>

            <div className="stats-circle-container">
              <div className="circular-progress" style={{ '--progress': recentStats.passRate.toString() }}>
                <span className="circular-progress-value">{recentStats.passRate}%</span>
              </div>
              <span className="stats-label">Pass rate</span>
            </div>

          </div>
        </div>

      </div>

      {/* ── Import & History ── */}
      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <CustomImport onImportExam={onImportExam} />
        <History historyLogs={historyLogs} onClearHistory={onClearHistory} onClearItem={onClearHistoryItem} />
      </div>
    </div>
  );
}
