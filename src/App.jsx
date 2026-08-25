import React, { useState, useEffect } from 'react';
import { BookOpen, Moon, Sun } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ExamEngine from './components/ExamEngine';

export default function App() {
  const [activeExam, setActiveExam] = useState(null);
  const [catalog, setCatalog] = useState({ exams: [] });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Navbar ── */}
      <header className="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => setActiveExam(null)}>
            <div className="logo-icon">
              <BookOpen size={19} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-title">CertPrep <span className="badge-ai">Hub</span></span>
              <span className="brand-sub">85+ Exams • Offline-Ready</span>
            </div>
          </div>

          <div className="nav-actions">
            <button onClick={toggleTheme} className="btn-icon" title="Đổi giao diện" style={{ borderRadius: '50%' }}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1 }}>
        {activeExam ? (
          <ExamEngine exam={activeExam} onBack={() => setActiveExam(null)} onSaveHistory={handleSaveHistory} />
        ) : (
          <Dashboard
            catalog={catalog} historyLogs={historyLogs}
            onSelectExam={handleSelectExam} onImportExam={handleImportExam}
            onClearHistory={handleClearHistory} onClearHistoryItem={handleClearHistoryItem}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center', padding: '1.5rem', borderTop: '1px solid var(--border)',
        color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2rem'
      }}>
        <p>© 2026 CertPrep Hub — Ôn thi chứng chỉ AWS, Microsoft, Google Cloud</p>
        <p style={{ marginTop: '0.2rem', opacity: 0.7 }}>Dữ liệu tĩnh • Client-side SPA</p>
      </footer>
    </div>
  );
}
