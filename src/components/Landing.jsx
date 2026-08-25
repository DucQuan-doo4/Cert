import React from 'react';
import { ArrowRight, Cloud, Database, Code, CheckCircle, Shield, Zap } from 'lucide-react';

export default function Landing({ onEnter }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-body)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* ── Background Decorative Elements ── */}
      <div className="landing-bg-blob" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)', top: '-20%', left: '-10%' }} />
      <div className="landing-bg-blob" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(0,0,0,0) 70%)', bottom: '-20%', right: '-10%' }} />

      {/* ── Navigation / Header ── */}
      <header style={{
        padding: '1.5rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden',
            background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="/logo_clean.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>CertPrep</span>
        </div>
        <button className="landing-btn-outline" onClick={onEnter}>
          Vào Ứng Dụng
        </button>
      </header>

      {/* ── Hero Section ── */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '2rem', textAlign: 'center', zIndex: 10
      }}>
        
        <div className="fade-up" style={{ animationDelay: '0.1s' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
            background: '#ffffff', padding: '0.4rem 1rem', borderRadius: '999px',
            boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            <Zap size={16} style={{ color: '#f59e0b' }} />
            Phiên bản Mới nhất 2026
          </div>
        </div>

        <h1 className="fade-up" style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 900,
          color: 'var(--text-primary)', lineHeight: 1.1,
          maxWidth: '800px', marginBottom: '1.5rem',
          animationDelay: '0.2s'
        }}>
          Chinh phục Chứng chỉ <br/>
          <span style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Điện toán Đám mây
          </span>
        </h1>

        <p className="fade-up" style={{
          fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '600px',
          lineHeight: 1.6, marginBottom: '2.5rem', animationDelay: '0.3s'
        }}>
          Nền tảng luyện thi toàn diện với hàng nghìn câu hỏi thực tế từ AWS, Microsoft Azure và Google Cloud. Giao diện trực quan, hỗ trợ dịch thuật tự động và chấm điểm thông minh.
        </p>

        <button 
          className="fade-up landing-btn-primary" 
          onClick={onEnter}
          style={{ animationDelay: '0.4s' }}
        >
          Bắt Đầu Luyện Thi <ArrowRight size={20} />
        </button>

        {/* ── Feature Providers ── */}
        <div className="fade-up" style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem',
          marginTop: '4rem', animationDelay: '0.5s'
        }}>
          <FeatureBadge icon={<img src="/aws-logo.png" style={{ height: '20px' }} alt="aws"/>} title="AWS Certified" />
          <FeatureBadge icon={<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" style={{ width: '20px' }} alt="azure"/>} title="Microsoft Azure" />
          <FeatureBadge icon={<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" style={{ width: '20px' }} alt="gcp"/>} title="Google Cloud" />
        </div>

      </main>
      
      {/* ── Features List ── */}
      <section className="fade-up" style={{
        padding: '3rem 2rem', background: 'rgba(255,255,255,0.5)',
        borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '4rem',
        animationDelay: '0.6s', flexWrap: 'wrap'
      }}>
        <SimpleFeature icon={<CheckCircle size={20} style={{ color: 'var(--success)' }}/>} text="100% Cập nhật 2026" />
        <SimpleFeature icon={<Shield size={20} style={{ color: '#6366f1' }}/>} text="Giao diện thi thực tế" />
        <SimpleFeature icon={<Database size={20} style={{ color: '#f59e0b' }}/>} text="Chấm điểm tức thì" />
      </section>

    </div>
  );
}

function FeatureBadge({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      background: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)'
    }}>
      {icon}
      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{title}</span>
    </div>
  );
}

function SimpleFeature({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
      {icon}
      {text}
    </div>
  );
}
