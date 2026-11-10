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
  BookOpen,
  Share2,
  Wallet,
  User,
  LogOut,
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
        return;
      }
      const data = await res.json();
      if (data && data.user) {
        setCurrentUser(data.user);
        setPendingOrder(data.pendingOrder || null);
      }
    } catch {
      // Keep existing currentUser state if already logged in
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

  const handleAuthSuccess = (user: any, token: string, newOrder?: PendingOrderInfo | null) => {
    if (token) {
      localStorage.setItem('edurt_token', token);
    }
    if (user?.email) {
      localStorage.setItem('edurt_user_email', user.email);
    }
    setCurrentUser(user);
    if (newOrder) {
      setPendingOrder(newOrder);
      setModalMode('checkout');
      setActiveView('dashboard');
    } else {
      setModalMode(null);
      setActiveView(user?.adminId ? 'admin' : 'dashboard');
      fetchCurrentSession();
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('edurt_token');
    localStorage.removeItem('edurt_user_email');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    setCurrentUser(null);
    setPendingOrder(null);
    setActiveView('public');
    setMobileMenuOpen(false);
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
                  <span className="hide-on-mobile">Public</span> Site
                </button>
                <button
                  id="switch-dashboard-view-btn"
                  className={`btn btn-sm ${activeView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveView('dashboard')}
                >
                  <LayoutDashboard size={14} />
                  <span className="hide-on-mobile">User</span> Dashboard
                </button>
                {currentUser.adminId && (
                  <button
                    id="switch-admin-view-btn"
                    className={`btn btn-sm ${activeView === 'admin' ? 'btn-accent' : 'btn-secondary'}`}
                    onClick={() => setActiveView('admin')}
                  >
                    <Shield size={14} />
                    <span className="hide-on-mobile">Master</span> Admin
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
              padding: '1rem 1.25rem',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <a
              href="#hero"
              onClick={() => {
                setActiveView('public');
                setMobileMenuOpen(false);
              }}
            >
              Home
            </a>
            <a
              href="#about"
              onClick={() => {
                setActiveView('public');
                setMobileMenuOpen(false);
              }}
            >
              About Us
            </a>
            <a
              href="#packages"
              onClick={() => {
                setActiveView('public');
                setMobileMenuOpen(false);
              }}
            >
              Plans / Packages
            </a>
            <a
              href="#courses"
              onClick={() => {
                setActiveView('public');
                setMobileMenuOpen(false);
              }}
            >
              Courses
            </a>
            <a
              href="#contact"
              onClick={() => {
                setActiveView('public');
                setMobileMenuOpen(false);
              }}
            >
              Contact Us
            </a>
            {currentUser && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-neutral)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setActiveView('dashboard');
                    setMobileMenuOpen(false);
                  }}
                >
                  <LayoutDashboard size={14} />
                  User Dashboard
                </button>
                {currentUser.adminId && (
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => {
                      setActiveView('admin');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Shield size={14} />
                    Master Admin Panel
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ACTIVE SYSTEM VIEW */}
      {(activeView === 'public' || !currentUser || (activeView === 'admin' && !currentUser?.adminId)) && (
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

      {/* NATIVE ANDROID BOTTOM NAVIGATION BAR */}
      <nav className="android-bottom-nav" aria-label="Android Mobile Navigation">
        {currentUser ? (
          <>
            <button
              className={`android-nav-btn ${activeView === 'dashboard' && dashboardTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('dashboard');
                setDashboardTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
            <button
              className={`android-nav-btn ${activeView === 'dashboard' && dashboardTab === 'affiliate' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('dashboard');
                setDashboardTab('affiliate');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Share2 size={18} />
              <span>Affiliate</span>
            </button>
            <button
              className={`android-nav-btn ${activeView === 'dashboard' && dashboardTab === 'courses' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('dashboard');
                setDashboardTab('courses');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <BookOpen size={18} />
              <span>Courses</span>
            </button>
            <button
              className={`android-nav-btn ${activeView === 'dashboard' && dashboardTab === 'withdrawal' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('dashboard');
                setDashboardTab('withdrawal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Wallet size={18} />
              <span>Withdraw</span>
            </button>
            {currentUser.adminId ? (
              <button
                className={`android-nav-btn ${activeView === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Shield size={18} />
                <span>Admin</span>
              </button>
            ) : (
              <button
                className={`android-nav-btn ${activeView === 'dashboard' && dashboardTab === 'account' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('dashboard');
                  setDashboardTab('account');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <User size={18} />
                <span>Account</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className={`android-nav-btn ${activeView === 'public' && !modalMode ? 'active' : ''}`}
              onClick={() => {
                setActiveView('public');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Globe size={18} />
              <span>Home</span>
            </button>
            <button
              className="android-nav-btn"
              onClick={() => {
                setActiveView('public');
                document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <CreditCard size={18} />
              <span>Packages</span>
            </button>
            <button
              className="android-nav-btn"
              onClick={() => {
                setActiveView('public');
                document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <BookOpen size={18} />
              <span>Courses</span>
            </button>
            <button
              className={`android-nav-btn ${modalMode === 'login' ? 'active' : ''}`}
              onClick={() => setModalMode('login')}
            >
              <LogIn size={18} />
              <span>Login</span>
            </button>
            <button
              className={`android-nav-btn ${modalMode === 'register' ? 'active' : ''}`}
              onClick={() => handleStartRegistration()}
            >
              <UserPlus size={18} />
              <span>Register</span>
            </button>
          </>
        )}
      </nav>

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
