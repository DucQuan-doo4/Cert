import React, { useState, useMemo } from 'react';
import { Search, Play, Award, CheckCircle, HelpCircle, HardDrive, BookOpen, Layers } from 'lucide-react';
import CustomImport from './CustomImport';
import History from './History';

const PROVIDER_META = {
  amazon: { name: 'AWS', color: '#ff9900', icon: '☁️' },
  microsoft: { name: 'Microsoft', color: '#00a4ef', icon: '💻' },
  google: { name: 'Google Cloud', color: '#ea4335', icon: '🌐' }
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

  // Compute exams list and summary statistics
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
      summary: {
        totalExams: allExams.length,
        totalQuestions,
        providerCounts
      }
    };
  }, [catalog]);

  // Extract unique providers dynamically from exams
  const dynamicProviders = useMemo(() => {
    const list = new Set();
    exams.forEach(exam => {
      if (exam.provider) list.add(exam.provider);
    });
    return Array.from(list);
  }, [exams]);

  // Filter exams based on tab and search query
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

  // Render provider badge
  const getProviderInfo = (provider) => {
    const pLower = (provider || '').toLowerCase();
    return PROVIDER_META[pLower] || {
      name: provider ? provider.toUpperCase() : 'KHÁC',
      color: '#64748b',
      icon: '📝'
    };
  };

  return (
    <div className="dashboard-container fade-in" style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem'
    }}>
      {/* Hero Header Banner */}
      <div className="glass-panel text-center" style={{
        padding: '3rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        borderRadius: '24px'
      }}>
        {/* Glow circles behind glass */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(0, 242, 254, 0.12)', filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', background: 'rgba(127, 0, 255, 0.12)', filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
        
        <h1 style={{
          fontSize: '2.6rem',
          fontFamily: 'var(--font-heading)',
          fontWeight: '800',
          marginBottom: '0.75rem',
          lineHeight: '1.25',
          background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #7f00ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-1px'
        }}>
          Hệ Thống Luyện Thi Chứng Chỉ Cloud & IT
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.05rem',
          maxWidth: '720px',
          margin: '0 auto 1.75rem auto',
          lineHeight: '1.6'
        }}>
          Truy cập kho đề thi khổng lồ gồm <strong style={{ color: 'var(--accent-primary)' }}>{summary.totalQuestions.toLocaleString()} câu hỏi</strong> thực tế, hỗ trợ làm bài tự động, chấm điểm màu sắc xanh/đỏ và tra cứu tài liệu học tập chính hãng.
        </p>

        {/* Dynamic Summary Stats Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '2rem'
        }}>
          <span className="stat-badge" style={badgeStyle('rgba(0, 242, 254, 0.1)', 'var(--accent-primary)')}>
            <Layers size={14} />
            {summary.totalExams} Bộ Đề Thi
          </span>
          {dynamicProviders.map(prov => {
            const pInfo = getProviderInfo(prov);
            const count = summary.providerCounts[prov] || 0;
            return (
              <span key={prov} className="stat-badge" style={badgeStyle(`${pInfo.color}15`, pInfo.color)}>
                <span style={{ marginRight: '0.25rem' }}>{pInfo.icon}</span>
                {count} Đề {pInfo.name}
              </span>
            );
          })}
          <span className="stat-badge" style={badgeStyle('rgba(16, 185, 129, 0.1)', 'var(--success-text)')}>
            <HardDrive size={14} />
            Local-First Mode
          </span>
        </div>

        {/* Search Bar */}
        <div className="glass-panel" style={{
          maxWidth: '620px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          padding: '0.25rem 0.75rem',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          background: 'var(--bg-primary)'
        }}>
          <Search size={18} style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }} />
          <input
            type="text"
            placeholder="Tìm kiếm bộ đề (ví dụ: AZ-900, AWS Practitioner, Google Cloud)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.75rem 0.25rem',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-main)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-outline"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border-color)'
      }} className="custom-scroll">
        <button
          onClick={() => setActiveTab('all')}
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-glass'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
        >
          Tất cả ({exams.length})
        </button>
        {dynamicProviders.map(prov => {
          const pInfo = getProviderInfo(prov);
          const count = summary.providerCounts[prov] || 0;
          return (
            <button
              key={prov}
              onClick={() => setActiveTab(prov)}
              className={`btn ${activeTab === prov ? 'btn-primary' : 'btn-glass'}`}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                ...(activeTab === prov ? {} : { borderColor: 'rgba(255,255,255,0.05)' })
              }}
            >
              <span style={{ marginRight: '0.35rem' }}>{pInfo.icon}</span>
              {pInfo.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Exams Grid */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.4rem',
          fontWeight: '800',
          color: 'var(--text-primary)',
          marginBottom: '1rem'
        }}>
          Danh sách bộ đề ôn tập {activeTab !== 'all' ? `hãng ${getProviderInfo(activeTab).name}` : ''}
        </h2>

        {filteredExams.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <HelpCircle size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.75rem' }} />
            <h3 style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>Không tìm thấy bộ đề phù hợp</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Hãy thử thay đổi bộ lọc hoặc nhập từ khóa tìm kiếm khác.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredExams.map((exam) => {
              const pInfo = getProviderInfo(exam.provider);
              return (
                <div
                  key={exam.slug}
                  className="glass-panel card-hover-effect"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${pInfo.color}`,
                    background: 'var(--bg-card)',
                    position: 'relative',
                    minHeight: '200px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span className="stat-badge" style={badgeStyle(`${pInfo.color}15`, pInfo.color)}>
                        <span style={{ marginRight: '0.25rem' }}>{pInfo.icon}</span>
                        {pInfo.name}
                      </span>
                      {exam.isComplete && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--success-text)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: '600' }}>
                          <CheckCircle size={10} /> Verified
                        </span>
                      )}
                    </div>
                    
                    <h3 style={{
                      fontSize: '1.05rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: '700',
                      lineHeight: '1.4',
                      color: 'var(--text-primary)',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '4.2em' // constant height for neat grid alignment
                    }} title={exam.title}>
                      {exam.title === 'Copy link to this question' ? exam.slug.toUpperCase() : exam.title}
                    </h3>
                  </div>

                  <div>
                    <div style={{
                      display: 'flex',
                      gap: '0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.85rem',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <BookOpen size={12} />
                        {exam.totalQuestions} câu hỏi
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectExam(exam)}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
                    >
                      <Play size={14} fill="currentColor" />
                      Luyện Đề Ngay
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two columns: Importer and History */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        marginTop: '1.5rem',
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

// Utility styling functions
function badgeStyle(bg, color) {
  return {
    background: bg,
    color: color,
    borderColor: `${color}35`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    border: '1px solid transparent',
    fontFamily: 'var(--font-heading)'
  };
}
