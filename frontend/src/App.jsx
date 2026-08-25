import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ExamEngine from './components/ExamEngine';
import Landing from './components/Landing';
import AuthPage from './components/AuthPage';
import { isLoggedIn, getMe, logout as apiLogout, getHistory, saveHistory as apiSaveHistory, clearHistory as apiClearHistory, deleteHistoryItem as apiDeleteHistoryItem, getBookmarks, toggleBookmark as apiToggleBookmark } from './utils/api';
import { LogOut, Bookmark } from 'lucide-react';

export default function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [catalog, setCatalog] = useState({ exams: [] });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (isLoggedIn()) {
        try {
          const userData = await getMe();
          setUser(userData);
          setHasEnteredApp(true);
        } catch {
          apiLogout();
        }
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // Fetch catalog
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
  }, []);

  // Fetch user data when logged in
  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      try {
        const [historyData, bookmarkData] = await Promise.all([getHistory(), getBookmarks()]);
        setHistoryLogs(historyData);
        setBookmarks(bookmarkData);
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    };
    loadUserData();
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    setHasEnteredApp(true);
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setHasEnteredApp(false);
    setActiveExam(null);
    setHistoryLogs([]);
    setBookmarks([]);
  };

  const handleSelectExam = (exam) => setActiveExam(exam);

  const handleImportExam = (importedExam) => {
    setCatalog(prev => {
      if (prev.exams.some(e => e.slug === importedExam.slug)) return prev;
      return { ...prev, exams: [importedExam, ...prev.exams] };
    });
    setActiveExam(importedExam);
  };

  const handleSaveHistory = async (newLog) => {
    try {
      const result = await apiSaveHistory(newLog);
      setHistoryLogs(prev => [{ ...newLog, id: result.id, createdAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Xóa toàn bộ lịch sử thi thử?')) return;
    try {
      await apiClearHistory();
      setHistoryLogs([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleClearHistoryItem = async (id) => {
    try {
      await apiDeleteHistoryItem(id);
      setHistoryLogs(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleToggleBookmark = async (examSlug, questionNumber, questionData) => {
    try {
      const result = await apiToggleBookmark(examSlug, questionNumber, questionData);
      if (result.action === 'added') {
        setBookmarks(prev => [{ id: result.id, examSlug, questionNumber, questionData, createdAt: new Date().toISOString() }, ...prev]);
      } else {
        setBookmarks(prev => prev.filter(b => !(b.examSlug === examSlug && b.questionNumber === questionNumber)));
      }
      return result;
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const isBookmarked = (examSlug, questionNumber) => {
    return bookmarks.some(b => b.examSlug === examSlug && b.questionNumber === questionNumber);
  };

  const SIDEBAR_MENU = [
    { id: 'all', iconType: 'logo', src: '/logo_clean.png' },
    { id: 'amazon', iconType: 'custom', src: '/aws-logo.png', bg: '#f9f9fa' },
    { id: 'microsoft', iconType: 'devicon', slug: 'azure/azure-original', bg: '#ffffff', border: '1px solid #e0e4f0' },
    { id: 'google', iconType: 'devicon', slug: 'googlecloud/googlecloud-original', bg: '#ffffff', border: '1px solid #e0e4f0' },
  ];

  // Show nothing while checking auth
  if (!authChecked) return null;

  // Landing page (not logged in, hasn't entered)
  if (!hasEnteredApp && !user) {
    return <Landing onEnter={() => setHasEnteredApp(true)} />;
  }

  // Auth page (entered app but not logged in)
  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
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
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div 
            onClick={() => { setActiveExam(null); setActiveFilter('all'); }}
            style={{
              width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden',
              border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff',
              cursor: 'pointer', transition: 'var(--transition)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Trang chủ"
          >
            <img src="/logo_clean.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CertPrep</span>
        </div>

        {/* Provider Buttons */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', alignItems: 'center', flex: 1 }}>
          {SIDEBAR_MENU.filter(item => item.id !== 'all').map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveExam(null); setActiveFilter(item.id); }}
              style={{
                width: '52px', height: '52px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '14px',
                border: item.border || '1px solid transparent',
                background: item.bg || 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: activeFilter === item.id ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                transform: activeFilter === item.id ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              {item.iconType === 'devicon' && (
                <img 
                  src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${item.slug}.svg`} 
                  alt={item.id} 
                  style={{ width: '28px', height: '28px' }} 
                />
              )}
              {item.iconType === 'custom' && (
                <img 
                  src={item.src} 
                  alt={item.id} 
                  style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
                />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom: User Info + Logout */}
        <div style={{ marginTop: 'auto', paddingBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {/* Bookmarks count */}
          <div
            title={`${bookmarks.length} câu hỏi đã lưu`}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: bookmarks.length > 0 ? 'var(--warning-light)' : 'var(--bg-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', cursor: 'default'
            }}
          >
            <Bookmark size={18} style={{ color: bookmarks.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }} />
            {bookmarks.length > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px',
                background: 'var(--warning)', color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                width: '16px', height: '16px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{bookmarks.length}</span>
            )}
          </div>

          {/* User Avatar */}
          <div
            title={user.displayName || user.email}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.85rem'
            }}
          >
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'transparent', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'var(--transition)', color: 'var(--text-muted)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger-light)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <LogOut size={18} />
          </button>
        </div>
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
          <ExamEngine
            exam={activeExam}
            onBack={() => setActiveExam(null)}
            onSaveHistory={handleSaveHistory}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            isBookmarked={isBookmarked}
          />
        ) : (
          <Dashboard
            catalog={catalog} historyLogs={historyLogs}
            activeFilter={activeFilter}
            onSelectExam={handleSelectExam} onImportExam={handleImportExam}
            onClearHistory={handleClearHistory} onClearHistoryItem={handleClearHistoryItem}
            bookmarks={bookmarks}
            user={user}
          />
        )}
      </main>
    </div>
  );
}
