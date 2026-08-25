import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ExamEngine from './components/ExamEngine';
import Landing from './components/Landing';

export default function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [catalog, setCatalog] = useState({ exams: [] });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('/data/index.json');
        if (!res.ok) throw new Error('Không thể tải index.json');
        const data = await res.json();
        setCatalog(data);
      } catch (err) {
        console.error('Failed to load exam catalog:', err);
      }
    };
    fetchCatalog();
    try {
      const saved = localStorage.getItem('examHistoryLogs');
      if (saved) setHistoryLogs(JSON.parse(saved));
    } catch (e) { console.error(e); }
  }, []);

  const handleSelectExam = (exam) => setActiveExam(exam);

  const handleImportExam = (importedExam) => {
    setCatalog(prev => {
      if (prev.exams.some(e => e.slug === importedExam.slug)) return prev;
      return { ...prev, exams: [importedExam, ...prev.exams] };
    });
    setActiveExam(importedExam);
  };

  const handleSaveHistory = (newLog) => {
    const logItem = { id: Date.now() + Math.random().toString(36).substr(2, 5), ...newLog };
    setHistoryLogs(prev => {
      const updated = [logItem, ...prev];
      localStorage.setItem('examHistoryLogs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    if (!window.confirm('Xóa toàn bộ lịch sử thi thử?')) return;
    setHistoryLogs([]);
    localStorage.removeItem('examHistoryLogs');
  };

  const handleClearHistoryItem = (id) => {
    setHistoryLogs(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('examHistoryLogs', JSON.stringify(updated));
      return updated;
    });
  };

  const SIDEBAR_MENU = [
    { id: 'all', iconType: 'logo', src: '/logo.png' },
    { id: 'amazon', iconType: 'custom', src: '/aws-logo.png', bg: '#f9f9fa' },
    { id: 'microsoft', iconType: 'devicon', slug: 'azure/azure-original', bg: '#ffffff', border: '1px solid #e0e4f0' },
    { id: 'google', iconType: 'devicon', slug: 'googlecloud/googlecloud-original', bg: '#ffffff', border: '1px solid #e0e4f0' },
  ];

  if (!hasEnteredApp) {
    return <Landing onEnter={() => setHasEnteredApp(true)} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* ── Left Sidebar ── */}
      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        paddingTop: '1.5rem',
        boxShadow: '2px 0 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden',
            border: '2px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '135%', height: '135%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>CertPrep</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
          {SIDEBAR_MENU.filter(item => item.id !== 'all').map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveExam(null); setActiveFilter(item.id); }}
              style={{
                width: '60px', height: '60px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '16px',
                border: item.border || 'none',
                background: item.bg || 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: activeFilter === item.id ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                transform: activeFilter === item.id ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {item.iconType === 'devicon' && (
                <img 
                  src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${item.slug}.svg`} 
                  alt={item.id} 
                  style={{ width: '32px', height: '32px' }} 
                />
              )}
              {item.iconType === 'custom' && (
                <img 
                  src={item.src} 
                  alt={item.id} 
                  style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
                />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {activeExam ? (
          <ExamEngine exam={activeExam} onBack={() => setActiveExam(null)} onSaveHistory={handleSaveHistory} />
        ) : (
          <Dashboard
            catalog={catalog} historyLogs={historyLogs}
            activeFilter={activeFilter}
            onSelectExam={handleSelectExam} onImportExam={handleImportExam}
            onClearHistory={handleClearHistory} onClearHistoryItem={handleClearHistoryItem}
          />
        )}
      </main>
    </div>
  );
}
