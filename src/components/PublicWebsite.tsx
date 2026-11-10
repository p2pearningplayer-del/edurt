import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  BookOpen,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Shield,
  Mail,
  Phone,
  MapPin,
  Download,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Hero3DCanvas } from './Hero3DCanvas.tsx';
import type { PackageItem } from './AuthAndCheckoutModals.tsx';

interface PublicWebsiteProps {
  siteData: any;
  onStartRegistrationWithPackage: (packageId?: number) => void;
  onOpenLogin: () => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  siteData,
  onStartRegistrationWithPackage,
  onOpenLogin,
}) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [certQuery, setCertQuery] = useState('CERT-2026-884920');
  const [certResult, setCertResult] = useState<any | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [activeLegalTab, setActiveLegalTab] = useState<'noRefund' | 'terms' | 'privacy' | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!siteData || !siteData.siteConfig) return null;

  const { siteConfig, sections = [], packages = [], courses = [], offers = [], socialLinks = [] } = siteData;

  const handleVerifyCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertError(null);
    setCertResult(null);
    if (!certQuery.trim()) return;
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(certQuery.trim())}`);
      const d = await res.json();
      if (!res.ok || !d.valid) {
        setCertError(d.error || 'Certificate not found');
      } else {
        setCertResult(d.certificate);
      }
    } catch {
      setCertError('Verification failed');
    }
  };

  const formatCountdown = (endAtIso: string) => {
    const diff = Math.max(0, new Date(endAtIso).getTime() - nowMs);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${days}d : ${String(hours).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
  };

  const renderSection = (sec: any) => {
    switch (sec.section_key) {
      case 'hero':
        return (
          <section key={sec.id} id="hero" className="hero-section">
            <div className="container">
              <div className="hero-grid">
                <div>
                  <span className="eyebrow-label">{siteConfig.hero?.eyebrow}</span>
                  <h1 className="hero-title">{siteConfig.hero?.headline}</h1>
                  <p className="hero-description">{siteConfig.hero?.description}</p>
                  <div className="hero-cta-row">
                    <button
                      id="hero-primary-cta"
                      className="btn btn-primary btn-lg"
                      onClick={() => onStartRegistrationWithPackage(packages[2]?.id || packages[0]?.id)}
                    >
                      {siteConfig.hero?.primaryCtaText || 'Register & Select Package'}
                      <ArrowRight size={18} />
                    </button>
                    <a href="#packages" className="btn btn-secondary btn-lg">
                      {siteConfig.hero?.secondaryCtaText || 'Explore Learning Packages'}
                    </a>
                  </div>
                  <div className="hero-metrics-strip">
                    {(siteConfig.hero?.stats || []).map((st: any, idx: number) => (
                      <div key={idx}>
                        <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {st.value}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hero-3d-frame">
                  <div
                    style={{
                      padding: '0.9rem 1.25rem',
                      borderBottom: '1px solid var(--border-neutral)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span className="mono">INTERACTIVE 3D EXECUTIVE ARCHITECTURE</span>
                    <span className="status-badge badge-success">WEBGL ACTIVE</span>
                  </div>

                  <Hero3DCanvas
                    preset={siteConfig.hero?.visual3dPreset}
                    primaryColor={siteConfig.theme?.primaryColor || '#10b981'}
                    accentColor={siteConfig.theme?.accentColor || '#d97706'}
                  />

                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderTop: '1px solid var(--border-neutral)',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>Direct Partner Economics</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        70% Referrer · 30% Company (On Gross Package Price)
                      </div>
                    </div>
                    <span className="mono" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                      INR (₹)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'about':
        return (
          <section key={sec.id} id="about" className="section-block">
            <div className="container">
              <div className="grid-2" style={{ alignItems: 'center', gap: '3rem' }}>
                <div>
                  <span className="eyebrow-label">ABOUT EDURT ACADEMY</span>
                  <h2 className="section-title">{siteConfig.about?.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    {siteConfig.about?.description}
                  </p>
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="surface-card" style={{ padding: '1.15rem' }}>
                      <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                        OUR MISSION
                      </div>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{siteConfig.about?.mission}</p>
                    </div>
                    <div className="surface-card" style={{ padding: '1.15rem' }}>
                      <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--color-accent)', marginBottom: '0.35rem' }}>
                        OUR VISION
                      </div>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{siteConfig.about?.vision}</p>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-neutral)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <img
                    src={siteConfig.about?.imageUrl || '/assets/media/pkg_pro.jpg'}
                    alt="About Edurt Academy"
                    style={{ width: '100%', height: '380px', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>
            </div>
          </section>
        );

      case 'packages':
        return (
          <section key={sec.id} id="packages" className="section-block">
            <div className="container">
              <div className="section-header">
                <span className="eyebrow-label">EXECUTIVE LEARNING PACKAGES</span>
                <h2 className="section-title">{sec.title || 'Select Your Curriculum Tier'}</h2>
                <p className="section-subtitle">
                  Every package grants lifetime streaming access to its included courses, assessments, and certificates.
                  Per platform policy, package purchases occur exclusively through our Registration &amp; Referral Attribution workflow.
                </p>
              </div>

              <div className="grid-3">
                {packages.map((pkg: PackageItem) => (
                  <article key={pkg.id} className="package-card">
                    <div className="package-media">
                      <img src={pkg.image_url} alt={pkg.name} loading="lazy" />
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.85rem',
                          left: '0.85rem',
                          right: '0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span className="status-badge badge-warning">{pkg.badge_text || 'CURRICULUM'}</span>
                        <span className="status-badge badge-success">{pkg.status.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="package-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.3rem' }}>{pkg.name}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.85rem' }}>
                        <span className="price-tag">₹{Number(pkg.price_inr).toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          · {pkg.duration_label} · {pkg.courseCount} Course(s)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.15rem' }}>
                        {pkg.description}
                      </p>

                      {/* Included Courses */}
                      <div
                        style={{
                          padding: '0.85rem',
                          background: 'var(--bg-canvas)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-neutral)',
                          marginBottom: '1.15rem',
                        }}
                      >
                        <div
                          className="mono"
                          style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginBottom: '0.45rem' }}
                        >
                          INCLUDED COURSES ({pkg.courseCount})
                        </div>
                        {pkg.courses.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              fontSize: '0.8rem',
                              padding: '0.22rem 0',
                            }}
                          >
                            <BookOpen size={13} color="var(--color-primary)" />
                            <span>{c.title}</span>
                          </div>
                        ))}
                      </div>

                      {/* Package Benefits */}
                      <ul style={{ listStyle: 'none', marginBottom: '1.5rem', flex: 1 }}>
                        {pkg.benefits.map((b, i) => (
                          <li
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                              fontSize: '0.83rem',
                              color: 'var(--text-secondary)',
                              marginBottom: '0.45rem',
                            }}
                          >
                            <CheckCircle2 size={15} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.18rem' }} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      {/* IMPORTANT PRD 2.2: No direct Buy Now button on public package cards; users follow Registration & Referral process */}
                      <button
                        id={`pkg-register-flow-btn-${pkg.id}`}
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                        onClick={() => onStartRegistrationWithPackage(pkg.id)}
                      >
                        Proceed via Registration &amp; Referral Flow
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'benefits':
        return (
          <section key={sec.id} id="benefits" className="section-block">
            <div className="container">
              <div className="section-header">
                <span className="eyebrow-label">PLATFORM ADVANTAGES</span>
                <h2 className="section-title">{sec.title}</h2>
                <p className="section-subtitle">{sec.subtitle}</p>
              </div>
              <div className="grid-4">
                {(siteConfig.benefits || []).map((b: any, i: number) => (
                  <div key={i} className="surface-card surface-card-interactive">
                    <div
                      className="mono"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-accent)',
                        marginBottom: '0.6rem',
                      }}
                    >
                      PILLAR 0{i + 1}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.55rem' }}>{b.title}</h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'how_it_works':
        return (
          <section key={sec.id} id="how-it-works" className="section-block">
            <div className="container">
              <div className="section-header">
                <span className="eyebrow-label">OPERATIONAL WORKFLOW</span>
                <h2 className="section-title">{sec.title}</h2>
              </div>
              <div className="grid-4">
                {(siteConfig.howItWorks || []).map((st: any, i: number) => (
                  <div key={i} className="surface-card">
                    <div className="price-tag" style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                      {st.step}
                    </div>
                    <h3 style={{ fontSize: '1.08rem', marginBottom: '0.45rem' }}>{st.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{st.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'courses':
        return (
          <section key={sec.id} id="courses" className="section-block">
            <div className="container">
              <div className="section-header">
                <span className="eyebrow-label">VERIFIED STREAMING LMS</span>
                <h2 className="section-title">{sec.title}</h2>
                <p className="section-subtitle">
                  100% verified watch tracking, anti-skip server validation, graded quizzes, and individual PDF certificates per completed course.
                </p>
              </div>
              <div className="grid-3">
                {courses.map((c: any) => (
                  <div key={c.id} className="package-card">
                    <div className="package-media" style={{ height: '185px' }}>
                      <img src={c.thumbnail_url} alt={c.title} loading="lazy" />
                      <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem' }}>
                        <span className="status-badge badge-neutral">{c.level}</span>
                      </div>
                    </div>
                    <div className="package-body">
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-primary)', marginBottom: '0.3rem' }}>
                        Faculty: {c.instructor_name}
                      </div>
                      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.55rem' }}>{c.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', flex: 1 }}>
                        {c.short_description}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid var(--border-neutral)',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>{c.module_count || 2} Modules · {c.lesson_count || 2} HD Streams</span>
                        <span style={{ color: 'var(--color-accent)' }}>PDF Certificate</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'offers':
        return (
          <section key={sec.id} id="offers" className="section-block">
            <div className="container">
              <div className="section-header">
                <span className="eyebrow-label">ACTIVE COHORTS &amp; PROMOTIONS</span>
                <h2 className="section-title">{sec.title}</h2>
                <p className="section-subtitle">
                  Independent batch windows with live countdown timers managed via the Master Admin Panel.
                </p>
              </div>
              <div className="grid-2">
                {offers.map((of: any) => (
                  <div
                    key={of.id}
                    className="package-card"
                    style={{ border: '1px solid rgba(217, 119, 6, 0.3)' }}
                  >
                    <div className="package-media" style={{ aspectRatio: '16/9', height: 'auto' }}>
                      <img src={of.banner_url} alt={of.title} />
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.85rem',
                          left: '0.85rem',
                          right: '0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span className="status-badge badge-warning">{of.batch_type}</span>
                        <span className="status-badge badge-success">{of.promo_badge}</span>
                      </div>
                    </div>
                    <div className="package-body">
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        {of.batch_name}
                      </div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{of.title}</h3>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        {of.description}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-canvas)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-neutral)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}>
                          <Clock size={15} color="var(--color-accent)" />
                          <span className="mono" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                            {formatCountdown(of.end_at)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onStartRegistrationWithPackage()}
                        >
                          Join Batch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key={sec.id} id="testimonials" className="section-block">
            <div className="container">
              <div className="section-header">
                <span className="eyebrow-label">VERIFIED PARTNER &amp; LEARNER STORIES</span>
                <h2 className="section-title">{sec.title}</h2>
              </div>
              <div className="grid-3">
                {(siteConfig.testimonials || []).map((t: any, i: number) => (
                  <div key={i} className="surface-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '0.9rem',
                        borderTop: '1px solid var(--border-neutral)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{t.role}</div>
                      </div>
                      <span className="status-badge badge-success">{t.earnings}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'faq':
        return (
          <section key={sec.id} id="faq" className="section-block">
            <div className="container">
              <div className="grid-2" style={{ gap: '3rem', alignItems: 'start' }}>
                <div>
                  <span className="eyebrow-label">GOVERNANCE &amp; CLARITY</span>
                  <h2 className="section-title">{sec.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
                    Transparent rules governing referral attribution, 70% gross commissions, KYC verification, and course certification.
                  </p>

                  {/* Public Certificate Verification Widget (PRD 8.9) */}
                  <div className="surface-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <Award size={18} color="var(--color-accent)" />
                      <h3 style={{ fontSize: '1.05rem' }}>Official Certificate Verification</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                      Verify the authenticity of any graduate certificate issued by Edurt Academy.
                    </p>
                    <form onSubmit={handleVerifyCert} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        id="public-cert-verify-input"
                        type="text"
                        className="form-input mono"
                        placeholder="CERT-2026-884920"
                        value={certQuery}
                        onChange={(e) => setCertQuery(e.target.value)}
                      />
                      <button id="public-cert-verify-btn" type="submit" className="btn btn-secondary">
                        <Search size={15} />
                        Verify
                      </button>
                    </form>
                    {certError && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#f87171' }}>{certError}</div>
                    )}
                    {certResult && (
                      <div
                        style={{
                          marginTop: '0.85rem',
                          padding: '0.85rem',
                          background: 'var(--bg-canvas)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ color: '#34d399', fontWeight: 600, marginBottom: '0.25rem' }}>
                          ✓ Authentic Verified Credential ({certResult.certificate_code})
                        </div>
                        <div>
                          Recipient: <strong>{certResult.recipient_name}</strong>
                        </div>
                        <div>Course: {certResult.course_title}</div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <a
                            href={`/api/certificates/${certResult.certificate_code}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm"
                          >
                            <Download size={13} />
                            Download Official PDF
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {(siteConfig.faq || []).map((item: any, idx: number) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="surface-card"
                        style={{ marginBottom: '0.85rem', padding: '1.15rem 1.35rem', cursor: 'pointer' }}
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <h3 style={{ fontSize: '0.98rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                            {item.q}
                          </h3>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        {isOpen && (
                          <p style={{ marginTop: '0.75rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                            {item.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key={sec.id} id="contact" className="section-block">
            <div className="container">
              <div className="grid-2" style={{ gap: '3rem' }}>
                <div>
                  <span className="eyebrow-label">EXECUTIVE CONCIERGE DESK</span>
                  <h2 className="section-title">{sec.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
                    Reach our academic and partner compliance desk for enterprise inquiries, institutional partnerships, or account assistance.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <Mail size={18} color="var(--color-primary)" />
                      <span>{siteConfig.contact?.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <Phone size={18} color="var(--color-primary)" />
                      <span>{siteConfig.contact?.phone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <MapPin size={18} color="var(--color-primary)" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {siteConfig.contact?.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="surface-card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Send a Direct Inquiry</h3>
                  {contactSubmitted ? (
                    <div
                      style={{
                        padding: '1.25rem',
                        background: 'var(--color-primary-soft)',
                        color: '#34d399',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Thank you! Your message has been logged with the Edurt Executive Concierge Desk.
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setContactSubmitted(true);
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label">Your Name</label>
                        <input type="text" className="form-input" placeholder="Full Name" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-input" placeholder="you@gmail.com" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Message</label>
                        <textarea className="form-textarea" rows={3} placeholder="How can our team assist you?" required />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Submit Inquiry
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      default:
        return (
          <section key={sec.id} className="section-block">
            <div className="container">
              <div className="surface-card">
                <span className="eyebrow-label">CUSTOM CMS SECTION</span>
                <h2 className="section-title">{sec.title}</h2>
                <p className="section-subtitle">{sec.subtitle}</p>
              </div>
            </div>
          </section>
        );
    }
  };

  return (
    <div>
      {sections.map((sec: any) => renderSection(sec))}

      {/* FOOTER */}
      <footer style={{ padding: '3.5rem 0 2.5rem', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div className="grid-4" style={{ marginBottom: '2.5rem', gap: '2rem' }}>
            <div>
              <div className="brand-mark" style={{ marginBottom: '0.85rem' }}>
                <div className="brand-crest">E</div>
                <div>
                  <div className="brand-title">{siteConfig.logoText || 'EDURT'}</div>
                  <span className="brand-subtitle">{siteConfig.logoSubtext}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Executive E-Learning &amp; Direct Partner Platform. Built with bank-grade ledger integrity and 100% server-verified certification.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.85rem', fontFamily: 'var(--font-body)' }}>Platform Navigation</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <a href="#hero">Home</a>
                <a href="#about">About Us</a>
                <a href="#packages">Learning Packages</a>
                <a href="#courses">Featured Courses</a>
                <a href="#offers">VIP Cohorts &amp; Offers</a>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.85rem', fontFamily: 'var(--font-body)' }}>Official Community</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {socialLinks.map((s: any) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>{s.platform}</span>
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.85rem', fontFamily: 'var(--font-body)' }}>Legal &amp; Governance</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--color-accent)', cursor: 'pointer' }}
                  onClick={() => setActiveLegalTab('noRefund')}
                >
                  Stated No-Refund Policy
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onClick={() => setActiveLegalTab('terms')}
                >
                  Terms &amp; Conditions
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onClick={() => setActiveLegalTab('privacy')}
                >
                  Privacy &amp; KYC Protection Policy
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--color-primary)', cursor: 'pointer' }}
                  onClick={onOpenLogin}
                >
                  Partner &amp; Admin Portal Login
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-neutral)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>© {new Date().getFullYear()} {siteConfig.companyName}. All rights reserved. Primary Currency: INR (₹).</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={13} color="var(--color-primary)" />
              <span>Razorpay Verified · Direct 70/30 Gross Commission Split</span>
            </span>
          </div>
        </div>
      </footer>

      {/* LEGAL PAGES MODAL (No-Refund Policy, Terms, Privacy) */}
      {activeLegalTab && (
        <div className="modal-backdrop" onClick={() => setActiveLegalTab(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>
                {activeLegalTab === 'noRefund' && 'No-Refund Policy'}
                {activeLegalTab === 'terms' && 'Terms & Conditions'}
                {activeLegalTab === 'privacy' && 'Privacy & KYC Data Protection Policy'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveLegalTab(null)}>
                Close
              </button>
            </div>
            <div className="tab-strip">
              <button
                className={`tab-pill ${activeLegalTab === 'noRefund' ? 'active' : ''}`}
                onClick={() => setActiveLegalTab('noRefund')}
              >
                No-Refund Policy
              </button>
              <button
                className={`tab-pill ${activeLegalTab === 'terms' ? 'active' : ''}`}
                onClick={() => setActiveLegalTab('terms')}
              >
                Terms &amp; Conditions
              </button>
              <button
                className={`tab-pill ${activeLegalTab === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveLegalTab('privacy')}
              >
                Privacy Policy
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {activeLegalTab === 'noRefund' && siteConfig.legal?.noRefundPolicy}
              {activeLegalTab === 'terms' && siteConfig.legal?.termsAndConditions}
              {activeLegalTab === 'privacy' && siteConfig.legal?.privacyPolicy}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
