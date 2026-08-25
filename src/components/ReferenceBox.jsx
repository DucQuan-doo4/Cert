import React from 'react';
import { BookOpen, ExternalLink, Search } from 'lucide-react';

export default function ReferenceBox({ explanation, provider, examTitle, questionText }) {
  if (!explanation) return null;

  // Regex to match markdown links: [Title](URL)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const links = [];
  let match;

  // Extract all markdown links
  while ((match = markdownLinkRegex.exec(explanation)) !== null) {
    // Avoid duplicates
    if (!links.some(l => l.url === match[2])) {
      links.push({
        title: match[1],
        url: match[2]
      });
    }
  }

  // Get search term if no links are found
  const getSearchTerm = () => {
    // Clean html tags from question text if any
    const cleanQ = questionText ? questionText.replace(/<[^>]*>/g, '') : '';
    // Extract keywords (longer words, capital words, etc.)
    const keywords = cleanQ
      .split(/\s+/)
      .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim())
      .filter(w => w.length > 4 && !['which', 'would', 'should', 'could', 'about', 'following', 'options', 'correct', 'incorrect'].includes(w.toLowerCase()))
      .slice(0, 4)
      .join(' ');
    
    return `${provider || ''} ${keywords || examTitle || ''}`.trim();
  };

  const searchTerm = getSearchTerm();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' documentation')}`;

  return (
    <div className="reference-box" style={{
      marginTop: '1.25rem',
      padding: '1rem',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border-color)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        marginBottom: '0.75rem',
      }}>
        <BookOpen size={16} className="text-cyan" style={{ color: 'var(--accent-primary)' }} />
        <span>Tài liệu học tập bổ trợ</span>
      </div>

      {links.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ref-link-card"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(0, 242, 254, 0.03)',
                border: '1px solid rgba(0, 242, 254, 0.1)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '550',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.1)';
                e.currentTarget.style.background = 'rgba(0, 242, 254, 0.03)';
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                {link.title}
              </span>
              <ExternalLink size={14} style={{ flexShrink: 0, opacity: 0.8, color: 'var(--accent-primary)' }} />
            </a>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Không tìm thấy liên kết tài liệu trực tiếp trong lời giải. Bạn có thể tra cứu nhanh trên Google Tài liệu chính hãng:
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ref-search-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            <Search size={14} />
            <span>Tìm kiếm tài liệu: "{searchTerm}"</span>
            <ExternalLink size={12} style={{ opacity: 0.6 }} />
          </a>
        </div>
      )}
    </div>
  );
}
