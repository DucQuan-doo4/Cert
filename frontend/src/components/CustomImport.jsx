import React, { useState } from 'react';
import { Upload, Link, AlertTriangle, FileJson, CheckCircle } from 'lucide-react';

export default function CustomImport({ onImportExam }) {
  const [githubUrl, setGithubUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validate imported JSON structure
  const validateAndImport = (data) => {
    try {
      if (!data) throw new Error('Dữ liệu trống.');
      
      // Support raw question arrays or objects with questions array
      let questions = [];
      let title = 'Bộ Đề Tự Nhập';
      let provider = 'custom';
      let slug = 'custom-exam';

      if (Array.isArray(data)) {
        questions = data;
      } else if (data.questions && Array.isArray(data.questions)) {
        questions = data.questions;
        title = data.title || title;
        provider = data.provider || provider;
        slug = data.slug || slug;
      } else {
        throw new Error('Dữ liệu không đúng định dạng. Phải chứa danh sách câu hỏi ("questions").');
      }

      if (questions.length === 0) {
        throw new Error('Bộ đề thi không chứa câu hỏi nào.');
      }

      // Check basic question fields in the first item
      const sample = questions[0];
      if (!sample.question && !sample.options) {
        throw new Error('Định dạng câu hỏi không hợp lệ (thiếu trường question hoặc options).');
      }

      // Successful validation
      const examObj = {
        provider,
        slug,
        title,
        totalQuestions: questions.length,
        questions: questions.map((q, idx) => ({
          ...q,
          number: q.number || idx + 1, // ensure number exists
        }))
      };

      onImportExam(examObj);
      setSuccessMsg(`Tải thành công bộ đề "${title}" (${questions.length} câu hỏi)!`);
      setErrorMsg('');
      setGithubUrl('');
    } catch (err) {
      setErrorMsg(err.message);
      setSuccessMsg('');
    }
  };

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        validateAndImport(parsed);
      } catch (err) {
        setErrorMsg('Tệp tin không phải là JSON hợp lệ.');
        setSuccessMsg('');
      }
    };
    reader.readAsText(file);
  };

  // Handle GitHub raw URL fetch
  const handleGithubFetch = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!githubUrl.trim()) {
      setErrorMsg('Vui lòng nhập đường dẫn URL GitHub Raw.');
      return;
    }

    // Convert standard GitHub URL to Raw URL if pasted in standard format
    let rawUrl = githubUrl.trim();
    if (rawUrl.includes('github.com') && !rawUrl.includes('raw.githubusercontent.com')) {
      rawUrl = rawUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }

    setIsLoading(true);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) {
        throw new Error(`Không thể tải tệp tin (Mã lỗi: ${res.status}). Vui lòng kiểm tra đường dẫn.`);
      }
      const data = await res.json();
      validateAndImport(data);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi kết nối hoặc phân tích cú pháp tệp JSON.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '1.5rem',
      borderRadius: '16px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      <div>
        <h3 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.15rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem'
        }}>
          Nhập bộ đề thi của riêng bạn
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Tự do ôn luyện bất kỳ bộ đề thi nào bằng cách tải file JSON từ máy hoặc kéo từ GitHub về trực tiếp.
        </p>
      </div>

      {/* Upload methods */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {/* Method 1: Local file */}
        <div style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          background: 'var(--bg-card)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0,
              cursor: 'pointer'
            }}
          />
          <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>Tải tệp JSON từ máy</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Chấp nhận tệp .json</span>
        </div>

        {/* Method 2: GitHub URL */}
        <div style={{
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
            <Link size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Liên kết GitHub Raw JSON</span>
          </div>
          <input
            type="text"
            placeholder="Dán link GitHub Raw (VD: https://raw.githubusercontent.com/...)"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button
            onClick={handleGithubFetch}
            className="btn btn-primary"
            style={{ padding: '0.45rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Đang tải tệp...' : 'Tải bộ đề'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger-text)',
          fontSize: '0.8rem'
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success-text)',
          fontSize: '0.8rem'
        }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
