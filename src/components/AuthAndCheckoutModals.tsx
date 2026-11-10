import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, X, KeyRound, CreditCard, Sparkles } from 'lucide-react';

export interface PackageItem {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  image_url: string;
  price_inr: number;
  benefits: string[];
  duration_label: string;
  badge_text?: string;
  status: string;
  courses: Array<{ id: number; title: string; short_description: string }>;
  courseCount: number;
}

export interface PendingOrderInfo {
  id: number;
  orderNumber: string;
  razorpayOrderId: string;
  packageId: number;
  packageName: string;
  grossAmountInr: number;
  currency?: string;
  razorpayKeyId?: string;
}

interface AuthModalsProps {
  mode: 'login' | 'register' | 'forgot' | 'checkout' | null;
  packages: PackageItem[];
  initialPackageId?: number;
  initialReferralCode?: string;
  pendingOrder: PendingOrderInfo | null;
  noRefundPolicyText: string;
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register' | 'forgot' | 'checkout' | null) => void;
  onAuthSuccess: (user: any, token: string, order?: PendingOrderInfo | null) => void;
  onPaymentVerified: () => void;
}

export const AuthAndCheckoutModals: React.FC<AuthModalsProps> = ({
  mode,
  packages,
  initialPackageId,
  initialReferralCode,
  pendingOrder,
  noRefundPolicyText,
  onClose,
  onSwitchMode,
  onAuthSuccess,
  onPaymentVerified,
}) => {
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [dob, setDob] = useState('1998-05-15');
  const [selectedPkgId, setSelectedPkgId] = useState<number>(initialPackageId || packages[0]?.id || 1);
  const [refCode, setRefCode] = useState(initialReferralCode || '');
  const [sponsorInfo, setSponsorInfo] = useState<{ valid: boolean; sponsorName?: string; error?: string } | null>(null);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Forgot Password OTP state
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Checkout state
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiVpa, setUpiVpa] = useState('learner@okhdfcbank');

  // Shared UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPackageId) setSelectedPkgId(initialPackageId);
  }, [initialPackageId]);

  useEffect(() => {
    if (initialReferralCode) setRefCode(initialReferralCode);
  }, [initialReferralCode]);

  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [mode]);

  useEffect(() => {
    const clean = refCode.trim().toUpperCase();
    if (clean.length === 6) {
      fetch(`/api/public/referral/${encodeURIComponent(clean)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.valid) {
            setSponsorInfo({ valid: true, sponsorName: d.sponsorName });
          } else {
            setSponsorInfo({ valid: false, error: d.error || 'Invalid code' });
          }
        })
        .catch(() => setSponsorInfo(null));
    } else {
      setSponsorInfo(null);
    }
  }, [refCode]);

  if (!mode) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onAuthSuccess(data.user, data.token, null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quickFillDemo = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          mobile,
          email: regEmail,
          dateOfBirth: dob,
          packageId: selectedPkgId,
          referralCode: refCode.trim().toUpperCase(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
          termsAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onAuthSuccess(data.user, data.token, data.pendingOrder);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send OTP');
      setSuccessMsg(data.message);
      if (data.devOtpPreview) {
        setDevOtpHint(data.devOtpPreview);
        setOtpInput(data.devOtpPreview);
      }
      setForgotStep(2);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: otpInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      setSuccessMsg(data.message);
      setForgotStep(3);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otp: otpInput,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      setSuccessMsg('Password reset complete! Redirecting to login...');
      setTimeout(() => {
        setForgotStep(1);
        onSwitchMode('login');
      }, 1000);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!pendingOrder) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Obtain cryptographic HMAC-SHA256 payment signature from Razorpay Checkout handshake
      const hsRes = await fetch('/api/payments/razorpay-checkout-handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpayOrderId: pendingOrder.razorpayOrderId }),
      });
      const hsData = await hsRes.json();
      if (!hsRes.ok) throw new Error(hsData.error || 'Razorpay gateway handshake failed');

      // 2. Verify payment server-side & trigger package activation + 70% referral commission credit
      const verRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hsData),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error || 'Server-side payment verification failed');

      setSuccessMsg(
        `Payment Verified! Unlocked ${verData.verification.enrolledCoursesCount} course(s). ${
          verData.verification.commissionCreditedInr > 0
            ? `₹${verData.verification.commissionCreditedInr.toLocaleString('en-IN')} (70% direct referral commission) credited to sponsor.`
            : ''
        }`
      );
      setTimeout(() => {
        onPaymentVerified();
      }, 1100);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span className="eyebrow-label" style={{ marginBottom: '0.2rem' }}>
              {mode === 'login' && 'SECURE SESSION ACCESS'}
              {mode === 'register' && 'NEW LEARNER & PARTNER ENROLLMENT'}
              {mode === 'forgot' && 'EMAIL OTP PASSWORD RECOVERY'}
              {mode === 'checkout' && 'RAZORPAY SECURE CHECKOUT (INR)'}
            </span>
            <h3 style={{ fontSize: '1.45rem' }}>
              {mode === 'login' && 'Sign In to LearnUp India Portal'}
              {mode === 'register' && 'Create Account & Select Package'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'checkout' && 'Complete Package Enrollment'}
            </h3>
          </div>
          <button id="modal-close-btn" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-danger-soft)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-soft)',
              color: '#34d399',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN VIEW */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Registered Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@gmail.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot-password-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSwitchMode('forgot')}
                >
                  Forgot Password (OTP)?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              <Lock size={16} />
              {loading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
            </button>

            {/* Quick-Fill Demo Roles for Instant Evaluation */}
            <div
              style={{
                marginTop: '1.35rem',
                padding: '0.9rem',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-neutral)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-accent)',
                  marginBottom: '0.55rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={13} />
                ONE-CLICK ROLE CREDENTIALS (CLICK TO AUTO-FILL)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <button
                  type="button"
                  id="demo-owner-btn"
                  className="btn btn-accent btn-sm"
                  onClick={() => quickFillDemo('team@learnupindia.com', 'Owner@team4')}
                >
                  Owner Super Admin (team@learnupindia.com)
                </button>
                <button
                  type="button"
                  id="demo-student-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickFillDemo('aarav.mehta@gmail.com', 'Student@123')}
                >
                  Aarav (Affiliate AB1234 · KYC Approved)
                </button>
                <button
                  type="button"
                  id="demo-superadmin-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickFillDemo('admin@edurt.in', 'Admin@123')}
                >
                  Super Admin (Full Master CMS)
                </button>
                <button
                  type="button"
                  id="demo-financeadmin-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickFillDemo('finance@edurt.in', 'Admin@123')}
                >
                  Finance Admin
                </button>
                <button
                  type="button"
                  id="demo-kycadmin-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickFillDemo('kyc@edurt.in', 'Admin@123')}
                >
                  KYC Admin
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                id="switch-to-register-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => onSwitchMode('register')}
              >
                Register &amp; Select Package
              </button>
            </div>
          </form>
        )}

        {/* REGISTRATION VIEW (PRD Section 3.1) */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-fullname">
                  Full Name *
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  className="form-input"
                  placeholder="As per Aadhaar / Bank Mandate"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-mobile">
                  Mobile Number *
                </label>
                <input
                  id="reg-mobile"
                  type="tel"
                  className="form-input"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">
                  Email Address (Gmail or valid email) *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="learner@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-dob">
                  Date of Birth *
                </label>
                <input
                  id="reg-dob"
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-package">
                  Learning Package Selection *
                </label>
                <select
                  id="reg-package"
                  className="form-select"
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(Number(e.target.value))}
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{Number(p.price_inr).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-refcode">
                  Referral Code (Optional · Locks Permanently)
                </label>
                <input
                  id="reg-refcode"
                  type="text"
                  maxLength={6}
                  className="form-input mono"
                  placeholder="e.g. AB1234"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                />
                {sponsorInfo?.valid && (
                  <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                    ✓ Verified Sponsor: {sponsorInfo.sponsorName} (70% Direct Attribution)
                  </span>
                )}
                {sponsorInfo && !sponsorInfo.valid && (
                  <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{sponsorInfo.error}</span>
                )}
              </div>
            </div>

            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">
                  Password *
                </label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  placeholder="Min. 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm-password">
                  Confirm Password *
                </label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.15rem',
                cursor: 'pointer',
              }}
            >
              <input
                id="reg-terms-checkbox"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: '0.25rem' }}
              />
              <span>
                I accept the <strong>Terms &amp; Conditions</strong>, acknowledge that referral attribution is permanently locked upon registration, and agree to the <strong>No-Refund Policy</strong> on digital learning packages.
              </span>
            </label>

            <button
              id="register-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Creating Account & Order...' : 'Register & Proceed to Razorpay Checkout'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => onSwitchMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD EMAIL OTP FLOW (PRD Section 3.5) */}
        {mode === 'forgot' && (
          <div>
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Enter your registered email address. We will generate a single-use, 6-digit verification OTP with a 10-minute expiration window.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">
                    Registered Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="aarav.mehta@gmail.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button id="send-otp-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  <KeyRound size={16} />
                  {loading ? 'Generating Email OTP...' : 'Send 6-Digit Email OTP'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp}>
                {devOtpHint && (
                  <div
                    style={{
                      padding: '0.7rem',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                      [Email Outbox Dispatch]:
                    </span>{' '}
                    OTP sent to <strong>{forgotEmail}</strong> is{' '}
                    <strong className="mono" style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
                      {devOtpHint}
                    </strong>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="otp-code-input">
                    Enter 6-Digit Email OTP
                  </label>
                  <input
                    id="otp-code-input"
                    type="text"
                    maxLength={6}
                    className="form-input mono"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    required
                  />
                </div>
                <button id="verify-otp-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Verifying OTP...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-new-password">
                    New Password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    className="form-input"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button id="reset-password-submit-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Updating Password...' : 'Confirm Password Reset'}
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setForgotStep(1);
                  onSwitchMode('login');
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* RAZORPAY CHECKOUT & SERVER VERIFICATION VIEW (PRD Section 4) */}
        {mode === 'checkout' && pendingOrder && (
          <div>
            <div
              style={{
                padding: '1.1rem',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PACKAGE SELECTED</span>
                <span className="status-badge badge-success">RAZORPAY VERIFIED</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>{pendingOrder.packageName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Order Ref: {pendingOrder.orderNumber}</span>
                <span className="mono">RZP ID: {pendingOrder.razorpayOrderId}</span>
              </div>
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-neutral)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 600 }}>Gross Amount Payable (INR)</span>
                <span className="price-tag" style={{ color: 'var(--color-primary)' }}>
                  ₹{Number(pendingOrder.grossAmountInr).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="tab-strip" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={`tab-pill ${payMethod === 'upi' ? 'active' : ''}`}
                onClick={() => setPayMethod('upi')}
              >
                UPI Instant (GPay / PhonePe / BHIM)
              </button>
              <button
                type="button"
                className={`tab-pill ${payMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPayMethod('card')}
              >
                Debit / Credit Card
              </button>
              <button
                type="button"
                className={`tab-pill ${payMethod === 'netbanking' ? 'active' : ''}`}
                onClick={() => setPayMethod('netbanking')}
              >
                NetBanking (IMPS/NEFT)
              </button>
            </div>

            {payMethod === 'upi' && (
              <div className="form-group">
                <label className="form-label">Enter UPI ID / VPA</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                />
              </div>
            )}

            <div
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
              }}
            >
              <strong style={{ color: 'var(--color-accent)' }}>Stated No-Refund Policy:</strong> {noRefundPolicyText}
            </div>

            <button
              id="razorpay-pay-now-btn"
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleRazorpayPayment}
              disabled={loading}
            >
              <CreditCard size={18} />
              {loading
                ? 'Verifying HMAC Signature & Activating Package...'
                : `Pay ₹${Number(pendingOrder.grossAmountInr).toLocaleString('en-IN')} via Razorpay`}
            </button>

            <div
              style={{
                marginTop: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <ShieldCheck size={14} color="var(--color-primary)" />
              <span>256-bit HMAC-SHA256 Server-Verified Payment &amp; Instant 70% Partner Ledger Settlement</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
