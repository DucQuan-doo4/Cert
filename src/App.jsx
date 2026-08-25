import React, { useState, useEffect } from 'react';
import { BookOpen, Moon, Sun, Award, HelpCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ExamEngine from './components/ExamEngine';

export default function App() {
  const [activeExam, setActiveExam] = useState(null);
  const [catalog, setCatalog] = useState({ exams: [] });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Load catalog metadata and history on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('/data/index.json');
        if (!res.ok) {
          throw new Error('Không thể tải file chỉ mục index.json');
        }
        const data = await res.json();
        setCatalog(data);
      } catch (err) {
        console.error('Failed to load exam catalog index:', err);
      }
    };

    fetchCatalog();

    // Load history
    try {
      const savedHistory = localStorage.getItem('examHistoryLogs');
      if (savedHistory) {
        setHistoryLogs(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to load exam history:', e);
    }
  }, []);

  // Update HTML data-theme attribute when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle dark/light theme
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Select an exam to practice/take
  const handleSelectExam = (exam) => {
    setActiveExam(exam);
  };

  // Import a custom exam and set as active exam immediately
  const handleImportExam = (importedExam) => {
    // Add to local catalog state so it renders on Dashboard under 'custom' tab
    setCatalog(prev => {
      const exists = prev.exams.some(e => e.slug === importedExam.slug);
      if (exists) return prev;
      return {
        ...prev,
        exams: [importedExam, ...prev.exams]
      };
    });
    
    // Jump straight to the exam
    setActiveExam(importedExam);
  };

  // Save history log
  const handleSaveHistory = (newLog) => {
    const logItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      ...newLog
    };
    
    setHistoryLogs(prev => {
      const updated = [logItem, ...prev];
      localStorage.setItem('examHistoryLogs', JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all history
  const handleClearHistory = () => {
    const confirmClear = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử thi thử?");
    if (!confirmClear) return;
    
    setHistoryLogs([]);
    localStorage.removeItem('examHistoryLogs');
  };

  // Clear specific history item
  const handleClearHistoryItem = (id) => {
    setHistoryLogs(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('examHistoryLogs', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar header */}
      <header className="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => setActiveExam(null)}>
            <div className="logo-icon">
              <BookOpen size={20} fill="currentColor" />
            </div>
            <div className="logo-text">
              <span className="brand-title">CertPrep <span className="badge-ai">Hub</span></span>
              <span className="brand-sub">85+ Exams • Static Client Database</span>
            </div>
          </div>

          <div className="nav-actions">
            <button
              onClick={toggleTheme}
              className="btn btn-icon"
              title="Đổi giao diện Sáng / Tối"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeExam ? (
          <ExamEngine
            exam={activeExam}
            onBack={() => setActiveExam(null)}
            onSaveHistory={handleSaveHistory}
          />
        ) : (
          <Dashboard
            catalog={catalog}
            historyLogs={historyLogs}
            onSelectExam={handleSelectExam}
            onImportExam={handleImportExam}
            onClearHistory={handleClearHistory}
            onClearHistoryItem={handleClearHistoryItem}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1.5rem',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        marginTop: '3rem'
      }}>
        <p>© 2026 CertPrep Hub. Thiết kế cho ôn luyện các chứng chỉ AWS, Microsoft, Google Cloud.</p>
        <p style={{ marginTop: '0.25rem', opacity: 0.8 }}>Dữ liệu tự động bóc tách từ repository cá nhân • Chạy hoàn toàn tại Client-side.</p>
      </footer>
    </div>
  );
}
