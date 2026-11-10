import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Shield,
  LogIn,
  UserPlus,
  Globe,
  Menu,
  X,
  CreditCard,
  Eye,
} from 'lucide-react';
import { PublicWebsite } from './components/PublicWebsite.tsx';
import { UserDashboard, type DashboardTab } from './components/UserDashboard.tsx';
import { MasterAdminPanel } from './components/MasterAdminPanel.tsx';
import { AuthAndCheckoutModals, type PendingOrderInfo } from './components/AuthAndCheckoutModals.tsx';
import { DEFAULT_SITE_DATA } from './defaultSiteData.ts';

export function App() {
  const [siteData, setSiteData] = useState<any>(DEFAULT_SITE_DATA);
  const [isPreviewDraft, setIsPreviewDraft] = useState(false);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrderInfo | null>(null);

  const [activeView, setActiveView] = useState<'public' | 'dashboard' | 'admin'>('public');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('dashboard');

  const [modalMode, setModalMode] = useState<'login' | 'register' | 'forgot' | 'checkout' | null>(null);
  const [selectedPackageIdForReg, setSelectedPackageIdForReg] = useState<number | undefined>(undefined);
  const [capturedRefCode, setCapturedRefCode] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchSiteData = async (preview = false) => {
    try {
      const res = await fetch(`/api/public/site${preview ? '?preview=draft' : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.siteConfig) {
        setSiteData(data);
        setIsPreviewDraft(preview);

        if (data?.siteConfig?.theme) {
          const root = document.documentElement;
          if (data.siteConfig.theme.primaryColor) {
            root.style.setProperty('--color-primary', data.siteConfig.theme.primaryColor);
          }
          if (data.siteConfig.theme.accentColor) {
            root.style.setProperty('--color-accent', data.siteConfig.theme.accentColor);
          }
        }
      }
    } catch {
      // Keep DEFAULT_SITE_DATA active if API is unreachable
    }
  };

  const fetchCurrentSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setCurrentUser(null);
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user);
      setPendingOrder(data.pendingOrder || null);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    const previewParam = params.get('preview') === 'draft';

    if (refParam) {
      const cleanRef = refParam.trim().toUpperCase();
      setCapturedRefCode(cleanRef);
      fetch(`/api/public/referral/${encodeURIComponent(cleanRef)}`).catch(() => {});
    }

    fetchSiteData(previewParam);
    fetchCurrentSession();
  }, []);

  const handleStartRegistration = (packageId?: number) => {
    setSelectedPackageIdForReg(packageId);
    setModalMode('register');
  };

  const handleAuthSuccess = (user: any, _token: string, newOrder?: PendingOrderInfo | null) => {
    setCurrentUser(user);
    if (newOrder) {
      setPendingOrder(newOrder);
      setModalMode('checkout');
      setActiveView('dashboard');
    } else {
      setModalMode(null);
      setActiveView(user.adminId ? 'admin' : 'dashboard');
      fetchCurrentSession();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setPendingOrder(null);
    setActiveView('public');
  };

  const siteConfig = siteData?.siteConfig || {};

  return (
    <div>
      {/* DRAFT PREVIEW BANNER (PRD Section 16.6) */}
      {isPreviewDraft && (
        <div
          style={{
            background: 'var(--color-accent)',
            color: '#0b0f0e',
            padding: '0.55rem 1.25rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            <Eye size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            CMS DRAFT PREVIEW MODE — Unpublished changes are visible only in this preview.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                fetchSiteData(false);
                setActiveView('admin');
              }}
            >
              Return to Master Admin CMS
            </button>
          </div>
        </div>
      )}

      {/* TOP GLOBAL HEADER */}
      <header className="site-header">
        <div className="container header-inner">
          <div
            className="brand-mark"
            onClick={() => {
              setActiveView('public');
              setMobileMenuOpen(false);
            }}
          >
            <div className="brand-crest">L</div>
            <div>
              <div className="brand-title">{siteConfig.logoText || 'LEARNUP INDIA'}</div>
              <span className="brand-subtitle">
                {siteConfig.logoSubtext || 'LEARNUPINDIA.COM · EXECUTIVE LEARNING & PARTNER NETWORK'}
              </span>
            </div>
          </div>

          {activeView === 'public' && (
            <nav className="nav-links" aria-label="Primary Navigation">
              <a href="#hero" className="nav-link">
                Home
              </a>
              <a href="#about" className="nav-link">
                About Us
              </a>
              <a href="#packages" className="nav-link">
                Plans / Packages
              </a>
              <a href="#courses" className="nav-link">
                Courses
              </a>
              <a href="#offers" className="nav-link">
                Offers
              </a>
              <a href="#faq" className="nav-link">
                Verify Certificate
              </a>
              <a href="#contact" className="nav-link">
                Contact Us
              </a>
            </nav>
          )}

          <div className="header-actions">
            {currentUser ? (
              <>
                <button
                  id="switch-public-view-btn"
                  className={`btn btn-sm ${activeView === 'public' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveView('public')}
                >
                  <Globe size={14} />
                  Public Site
                </button>
                <button
                  id="switch-dashboard-view-btn"
                  className={`btn btn-sm ${activeView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveView('dashboard')}
                >
                  <LayoutDashboard size={14} />
                  User Dashboard
                </button>
                {currentUser.adminId && (
                  <button
                    id="switch-admin-view-btn"
                    className={`btn btn-sm ${activeView === 'admin' ? 'btn-accent' : 'btn-secondary'}`}
                    onClick={() => setActiveView('admin')}
                  >
                    <Shield size={14} />
                    Master Admin Panel
                  </button>
                )}
                {pendingOrder && (
                  <button
                    id="header-checkout-btn"
                    className="btn btn-accent btn-sm"
                    onClick={() => setModalMode('checkout')}
                  >
                    <CreditCard size={14} />
                    Pay ₹{Number(pendingOrder.grossAmountInr).toLocaleString('en-IN')}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  id="header-login-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalMode('login')}
                >
                  <LogIn size={14} />
                  Login
                </button>
                <button
                  id="header-register-btn"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStartRegistration()}
                >
                  <UserPlus size={14} />
                  Register
                </button>
              </>
            )}

            <button
              id="mobile-menu-toggle"
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Responsive Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '1rem 1.5rem',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-neutral)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <a href="#hero" onClick={() => setMobileMenuOpen(false)}>
              Home
            </a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>
              About Us
            </a>
            <a href="#packages" onClick={() => setMobileMenuOpen(false)}>
              Plans / Packages
            </a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
              Contact Us
            </a>
          </div>
        )}
      </header>

      {/* ACTIVE SYSTEM VIEW */}
      {activeView === 'public' && (
        <PublicWebsite
          siteData={siteData}
          onStartRegistrationWithPackage={handleStartRegistration}
          onOpenLogin={() => setModalMode('login')}
        />
      )}

      {activeView === 'dashboard' && currentUser && (
        <UserDashboard
          user={currentUser}
          activeTab={dashboardTab}
          pendingOrder={pendingOrder}
          onSelectTab={setDashboardTab}
          onOpenCheckout={() => setModalMode('checkout')}
          onLogout={handleLogout}
          onRefreshUser={fetchCurrentSession}
        />
      )}

      {activeView === 'admin' && currentUser?.adminId && (
        <MasterAdminPanel
          user={currentUser}
          onRefreshPublicSite={(previewDraft = false) => {
            fetchSiteData(previewDraft);
            if (previewDraft) {
              setActiveView('public');
            }
          }}
        />
      )}

      {/* AUTHENTICATION, OTP & RAZORPAY CHECKOUT MODALS */}
      <AuthAndCheckoutModals
        mode={modalMode}
        packages={siteData?.packages || []}
        initialPackageId={selectedPackageIdForReg}
        initialReferralCode={capturedRefCode}
        pendingOrder={pendingOrder}
        noRefundPolicyText={
          siteConfig.legal?.noRefundPolicy ||
          'All learning package payments are final and non-refundable once verified.'
        }
        onClose={() => setModalMode(null)}
        onSwitchMode={setModalMode}
        onAuthSuccess={handleAuthSuccess}
        onPaymentVerified={() => {
          setModalMode(null);
          setPendingOrder(null);
          fetchCurrentSession();
          setActiveView('dashboard');
          setDashboardTab('courses');
        }}
      />
    </div>
  );
}

export default App;
