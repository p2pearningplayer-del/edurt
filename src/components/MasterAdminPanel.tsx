import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Layout,
  Package,
  BookOpen,
  Users,
  Wallet,
  CreditCard,
  ShieldAlert,
  Tag,
  Mail,
  FileSpreadsheet,
  Key,
  Database,
  Eye,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Plus,
  Download,
  RefreshCw,
} from 'lucide-react';
import { ComponentErrorBoundary, LoadingSkeleton, EmptyState, PageTransition } from './UIStateComponents.tsx';

type AdminModule =
  | 'overview'
  | 'cms'
  | 'packages'
  | 'courses'
  | 'users'
  | 'finance'
  | 'withdrawals'
  | 'kyc'
  | 'offers'
  | 'emails'
  | 'reports'
  | 'security';

interface MasterAdminPanelProps {
  user: any;
  onRefreshPublicSite: (previewDraft?: boolean) => void;
}

export const MasterAdminPanel: React.FC<MasterAdminPanelProps> = ({ user, onRefreshPublicSite }) => {
  const [activeMod, setActiveMod] = useState<AdminModule>('overview');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Module Data States
  const [dashData, setDashData] = useState<any>({
    metrics: {
      totalRegisteredUsers: 6,
      activeUsers: 6,
      totalSalesInr: 17997,
      todaySalesInr: 12499,
      monthlySalesInr: 17997,
      totalPackagePurchases: 3,
      totalAffiliateCommissionInr: 12598,
      companyRevenueShareInr: 5399,
      availableCommissionLiabilityInr: 9798,
      pendingCommissionInr: 0,
      totalWithdrawalsInr: 2800,
      pendingWithdrawalsCount: 0,
      approvedWithdrawalsCount: 1,
      rejectedWithdrawalsCount: 0,
      pendingKycCount: 0,
      totalCoursesCount: 3,
      activeOffersCount: 2,
    },
    recentLogs: [],
  });
  const [cmsData, setCmsData] = useState<any>({
    sections: [
      { id: 1, section_key: 'hero', title: 'Hero 3D & Executive Headline', is_visible: 1 },
      { id: 2, section_key: 'packages', title: 'Learning Packages', is_visible: 1 },
      { id: 3, section_key: 'courses', title: 'Featured Courses', is_visible: 1 },
      { id: 4, section_key: 'offers', title: 'Offers & VIP Batches', is_visible: 1 },
      { id: 5, section_key: 'faq', title: 'Frequently Asked Questions', is_visible: 1 },
    ],
    versions: [{ id: 1, version_number: 1, note: 'Initial LearnUp India Release', created_at: new Date().toISOString() }],
    media: [],
  });
  const [draftConfig, setDraftConfig] = useState<any>({
    logoText: 'LEARNUP INDIA',
    hero: {
      visual3dPreset: 'emerald_monolith',
      headline: 'Master Institutional Skills & Earn 70% Direct Affiliate Commissions.',
      description: 'LearnUp India (learnupindia.com) combines verified streaming courses with an instant 70/30 partner commission ledger.',
    },
    theme: {
      primaryColor: '#10b981',
      accentColor: '#d97706',
    },
  });
  const [publishNote, setPublishNote] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('/assets/media/offer_vip_banner.jpg');

  // Packages
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('4999');
  const [newPkgDesc, setNewPkgDesc] = useState('');

  // Courses & Assignments
  const [coursesAdmin, setCoursesAdmin] = useState<{ courses: any[]; assignmentSubmissions: any[] }>({
    courses: [],
    assignmentSubmissions: [],
  });
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newLessonCourseId, setNewLessonCourseId] = useState<number>(1);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  // Users
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [manualUserName, setManualUserName] = useState('');
  const [manualUserEmail, setManualUserEmail] = useState('');
  const [manualUserMobile, setManualUserMobile] = useState('');
  const [manualUserPass, setManualUserPass] = useState('Student@123');
  const [manualUserRef, setManualUserRef] = useState('AB1234');

  // Finance / Wallet / Bonus
  const [walletAdmin, setWalletAdmin] = useState<any>({ wallets: [] });
  const [affAdmin, setAffAdmin] = useState<any>({ commissions: [] });
  const [bonusUserId, setBonusUserId] = useState<number>(5);
  const [bonusAmount, setBonusAmount] = useState('500');
  const [bonusReason, setBonusReason] = useState('Executive Partner Performance Milestone Bonus');

  // Withdrawals
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [utrInputs, setUtrInputs] = useState<Record<number, string>>({});
  const [rejectInputs, setRejectInputs] = useState<Record<number, string>>({});

  // KYC
  const [kycList, setKycList] = useState<any[]>([]);
  const [kycReasonInputs, setKycReasonInputs] = useState<Record<number, string>>({});

  // Offers & Community
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferBatchType, setNewOfferBatchType] = useState('VIP Batch');
  const [newOfferDesc, setNewOfferDesc] = useState('');

  // Emails
  const [emailsAdmin, setEmailsAdmin] = useState<{ templates: any[]; logs: any[] }>({ templates: [], logs: [] });

  // Reports
  const [reportsData, setReportsData] = useState<any>({
    packageWiseSales: [],
    courseStats: [],
  });

  // Roles, Activity Logs & Backups
  const [rolesData, setRolesData] = useState<any>({ roles: [] });
  const [backupsData, setBackupsData] = useState<{ backups: any[]; restores: any[] }>({ backups: [], restores: [] });

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const [isModLoading, setIsModLoading] = useState(false);

  useEffect(() => {
    loadModule(activeMod);
  }, [activeMod]);

  const loadModule = async (mod: AdminModule) => {
    setIsModLoading(true);
    try {
      if (mod === 'overview') {
        const d = await fetch('/api/admin/dashboard').then((r) => r.json());
        if (d && d.metrics) setDashData(d);
      } else if (mod === 'cms') {
        const d = await fetch('/api/admin/cms').then((r) => r.json());
        if (d && !d.error) {
          setCmsData(d);
          if (d.draftConfig) setDraftConfig(d.draftConfig);
        }
      } else if (mod === 'packages') {
        const d = await fetch('/api/admin/packages').then((r) => r.json());
        if (d && Array.isArray(d.packages)) setPackagesList(d.packages);
      } else if (mod === 'courses') {
        const d = await fetch('/api/admin/courses').then((r) => r.json());
        if (d && Array.isArray(d.courses)) {
          setCoursesAdmin({
            courses: d.courses,
            assignmentSubmissions: Array.isArray(d.assignmentSubmissions) ? d.assignmentSubmissions : [],
          });
        }
      } else if (mod === 'users') {
        const d = await fetch(`/api/admin/users?q=${encodeURIComponent(userSearch)}`).then((r) => r.json());
        if (d && Array.isArray(d.users)) setUsersList(d.users);
      } else if (mod === 'finance') {
        const [w, a] = await Promise.all([
          fetch('/api/admin/wallet').then((r) => r.json()),
          fetch('/api/admin/affiliate').then((r) => r.json()),
        ]);
        if (w && Array.isArray(w.wallets)) setWalletAdmin(w);
        if (a && Array.isArray(a.commissions)) setAffAdmin(a);
      } else if (mod === 'withdrawals') {
        const d = await fetch('/api/admin/withdrawals').then((r) => r.json());
        if (d && Array.isArray(d.withdrawals)) setWithdrawalsList(d.withdrawals);
      } else if (mod === 'kyc') {
        const d = await fetch('/api/admin/kyc').then((r) => r.json());
        if (d && Array.isArray(d.submissions)) setKycList(d.submissions);
      } else if (mod === 'emails') {
        const d = await fetch('/api/admin/emails').then((r) => r.json());
        if (d && Array.isArray(d.templates)) {
          setEmailsAdmin({
            templates: d.templates,
            logs: Array.isArray(d.logs) ? d.logs : [],
          });
        }
      } else if (mod === 'reports') {
        const d = await fetch('/api/admin/reports').then((r) => r.json());
        if (d && Array.isArray(d.packageWiseSales)) {
          setReportsData({
            packageWiseSales: d.packageWiseSales,
            courseStats: Array.isArray(d.courseStats) ? d.courseStats : [],
          });
        }
      } else if (mod === 'security') {
        const [r, b] = await Promise.all([
          fetch('/api/admin/roles').then((res) => res.json()),
          fetch('/api/admin/backups').then((res) => res.json()),
        ]);
        if (r && Array.isArray(r.roles)) setRolesData(r);
        if (b && Array.isArray(b.backups)) {
          setBackupsData({
            backups: b.backups,
            restores: Array.isArray(b.restores) ? b.restores : [],
          });
        }
      }
    } catch (e) {
      notify('err', (e as Error).message);
    } finally {
      setIsModLoading(false);
    }
  };

  // CMS Handlers
  const handleSaveDraft = async () => {
    const res = await fetch('/api/admin/cms/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftConfig }),
    });
    if (res.ok) {
      notify('ok', 'Draft CMS changes saved! Click Preview Draft or Publish to Live Site.');
      loadModule('cms');
    }
  };

  const handlePublishCms = async () => {
    await handleSaveDraft();
    const res = await fetch('/api/admin/cms/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: publishNote || 'Admin CMS Publish' }),
    });
    const d = await res.json();
    if (res.ok) {
      notify('ok', `Published Website CMS Version v${d.publishedVersion}! Live website updated.`);
      setPublishNote('');
      loadModule('cms');
      onRefreshPublicSite(false);
    }
  };

  const handleMoveSection = async (idx: number, dir: -1 | 1) => {
    if (!cmsData?.sections) return;
    const arr = [...cmsData.sections];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    const temp = arr[idx];
    arr[idx] = arr[target];
    arr[target] = temp;
    await fetch('/api/admin/cms/sections/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: arr.map((s) => s.id) }),
    });
    loadModule('cms');
    onRefreshPublicSite(false);
  };

  const handleToggleSectionVisibility = async (sec: any) => {
    await fetch(`/api/admin/cms/sections/${sec.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !sec.is_visible }),
    });
    loadModule('cms');
    onRefreshPublicSite(false);
  };

  const handleCreateBackup = async () => {
    const res = await fetch('/api/admin/backups/create', { method: 'POST' });
    const d = await res.json();
    if (res.ok) {
      notify('ok', `Encrypted AES-256-GCM Backup ${d.backup.backupCode} created (${d.backup.fileSizeBytes} bytes).`);
      loadModule('security');
    }
  };

  const handleVerifyOrRestoreBackup = async (backupId: number, restore: boolean) => {
    const res = await fetch(`/api/admin/backups/${backupId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restore }),
    });
    const d = await res.json();
    if (res.ok) {
      notify(
        'ok',
        restore
          ? `Backup ${d.result.backupCode} restored and verified!`
          : `Backup ${d.result.backupCode} SHA-256 & AES-256-GCM integrity verified (${d.result.tablesVerified} tables intact).`
      );
      loadModule('security');
    } else {
      notify('err', d.error);
    }
  };

  const exportCsv = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(','),
      ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const sidebarModules: Array<{ id: AdminModule; label: string; icon: any }> = [
    { id: 'overview', label: 'Admin Dashboard (17 KPIs)', icon: BarChart3 },
    { id: 'cms', label: 'Website CMS & Page Builder', icon: Layout },
    { id: 'packages', label: 'Package Management', icon: Package },
    { id: 'courses', label: 'Courses, Quizzes & Assignments', icon: BookOpen },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'finance', label: 'Affiliate & Wallet / Bonus', icon: Wallet },
    { id: 'withdrawals', label: 'Withdrawal Management', icon: CreditCard },
    { id: 'kyc', label: 'KYC Review & Compliance', icon: ShieldAlert },
    { id: 'offers', label: 'Offers, Batches & Community', icon: Tag },
    { id: 'emails', label: 'Email Templates & Logs', icon: Mail },
    { id: 'reports', label: 'Reports & CSV Export', icon: FileSpreadsheet },
    { id: 'security', label: 'RBAC Roles, Logs & Backups', icon: Database },
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div
          style={{
            padding: '0.85rem',
            marginBottom: '0.75rem',
            background: 'var(--bg-canvas)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
          }}
        >
          <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}>
            MASTER ADMIN GOVERNANCE
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.fullName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Role: {user.adminRole}</div>
        </div>

        {sidebarModules.map((m) => {
          const IconComp = m.icon;
          return (
            <button
              key={m.id}
              id={`admin-mod-${m.id}`}
              className={`sidebar-item ${activeMod === m.id ? 'active' : ''}`}
              onClick={() => setActiveMod(m.id)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <IconComp size={16} />
                <span>{m.label}</span>
              </span>
            </button>
          );
        })}
      </aside>

      <main className="app-main">
        {banner && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              background: banner.type === 'ok' ? 'var(--color-primary-soft)' : 'var(--color-danger-soft)',
              color: banner.type === 'ok' ? '#34d399' : '#fca5a5',
              fontWeight: 600,
            }}
          >
            {banner.text}
          </div>
        )}

        <ComponentErrorBoundary
          fallbackTitle="Admin Module Error"
          fallbackMessage="An issue occurred loading this admin module. You can retry or select another module."
        >
          <PageTransition tabKey={activeMod}>
            {isModLoading ? (
              <LoadingSkeleton
                type={
                  activeMod === 'overview'
                    ? 'overview'
                    : activeMod === 'users' || activeMod === 'withdrawals' || activeMod === 'finance' || activeMod === 'reports'
                    ? 'table'
                    : 'cards'
                }
              />
            ) : (
              <>
        {/* ================================================================= */}
        {/* 16.2 ADMIN DASHBOARD (17 LIVE DATABASE STATISTICS)                */}
        {/* ================================================================= */}
        {activeMod === 'overview' && dashData?.metrics && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">REAL-TIME RELATIONAL DATABASE METRICS</span>
              <h2>Master Admin Executive Overview</h2>
            </div>

            <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
              {[
                ['1. Total Registered Users', dashData.metrics.totalRegisteredUsers],
                ['2. Active Users', dashData.metrics.activeUsers],
                ['3. Total Sales (Gross)', `₹${Number(dashData.metrics.totalSalesInr).toLocaleString('en-IN')}`],
                ['4. Today’s Sales', `₹${Number(dashData.metrics.todaySalesInr).toLocaleString('en-IN')}`],
                ['5. Monthly Sales (30d)', `₹${Number(dashData.metrics.monthlySalesInr).toLocaleString('en-IN')}`],
                ['6. Total Package Purchases', dashData.metrics.totalPackagePurchases],
                ['7. Total Affiliate Commission (70%)', `₹${Number(dashData.metrics.totalAffiliateCommissionInr).toLocaleString('en-IN')}`],
                ['8. Company Revenue Share (30%/100%)', `₹${Number(dashData.metrics.companyRevenueShareInr).toLocaleString('en-IN')}`],
                ['9. Available Commission Liability', `₹${Number(dashData.metrics.availableCommissionLiabilityInr).toLocaleString('en-IN')}`],
                ['10. Pending Commission', `₹${Number(dashData.metrics.pendingCommissionInr).toLocaleString('en-IN')}`],
                ['11. Total Paid Withdrawals', `₹${Number(dashData.metrics.totalWithdrawalsInr).toLocaleString('en-IN')}`],
                ['12. Pending Withdrawals', dashData.metrics.pendingWithdrawalsCount],
                ['13. Approved Withdrawals', dashData.metrics.approvedWithdrawalsCount],
                ['14. Rejected Withdrawals', dashData.metrics.rejectedWithdrawalsCount],
                ['15. Pending KYC Reviews', dashData.metrics.pendingKycCount],
                ['16. Total Active Courses', dashData.metrics.totalCoursesCount],
                ['17. Active Promotional Offers', dashData.metrics.activeOffersCount],
              ].map(([label, val], idx) => (
                <div key={idx} className="surface-card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                  <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '0.3rem', color: 'var(--text-primary)' }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Recent Admin Activity &amp; Audit Trail</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Affected Record</th>
                    <th>Previous → New Value</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashData.recentLogs || []).map((log: any) => (
                    <tr key={log.id}>
                      <td>
                        <span className="status-badge badge-neutral">{log.admin_role}</span>
                      </td>
                      <td className="mono" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        {log.action}
                      </td>
                      <td className="mono">{log.affected_record}</td>
                      <td>
                        {log.previous_value ? `${log.previous_value} → ` : ''}
                        {log.new_value}
                      </td>
                      <td className="mono">{String(log.created_at).slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.3 - 16.6 WEBSITE CMS, VISUAL PAGE BUILDER & VERSIONING         */}
        {/* ================================================================= */}
        {activeMod === 'cms' && cmsData && draftConfig && (
          <div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <span className="eyebrow-label">DYNAMIC CMS · DRAFT, PREVIEW &amp; VERSION CONTROL</span>
                <h2>Website Content Management &amp; Visual Page Builder</h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button id="cms-save-draft-btn" className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
                  Save Draft
                </button>
                <button
                  id="cms-preview-draft-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onRefreshPublicSite(true)}
                >
                  <Eye size={14} />
                  Preview Draft on Website
                </button>
                <button id="cms-publish-btn" className="btn btn-primary btn-sm" onClick={handlePublishCms}>
                  <CheckCircle2 size={14} />
                  Publish Changes Live
                </button>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
              {/* Hero, Branding & Theme Editor */}
              <div className="surface-card">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Brand, Hero 3D &amp; Theme Configuration</h3>
                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Website Logo Text</label>
                    <input
                      type="text"
                      className="form-input"
                      value={draftConfig.logoText || ''}
                      onChange={(e) => setDraftConfig({ ...draftConfig, logoText: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">3D Hero Object Preset</label>
                    <select
                      className="form-select"
                      value={draftConfig.hero?.visual3dPreset || 'emerald_monolith'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          hero: { ...draftConfig.hero, visual3dPreset: e.target.value },
                        })
                      }
                    >
                      <option value="emerald_monolith">Faceted Emerald Monolith &amp; Gold Rings</option>
                      <option value="gold_gyroscope">Octahedral Executive Gyroscope</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Hero Main Headline</label>
                  <input
                    id="cms-hero-headline-input"
                    type="text"
                    className="form-input"
                    value={draftConfig.hero?.headline || ''}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        hero: { ...draftConfig.hero, headline: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Hero Supporting Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={draftConfig.hero?.description || ''}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        hero: { ...draftConfig.hero, description: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Primary Brand Color (Hex)</label>
                    <input
                      type="text"
                      className="form-input mono"
                      value={draftConfig.theme?.primaryColor || '#10b981'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          theme: { ...draftConfig.theme, primaryColor: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accent Gold Color (Hex)</label>
                    <input
                      type="text"
                      className="form-input mono"
                      value={draftConfig.theme?.accentColor || '#d97706'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          theme: { ...draftConfig.theme, accentColor: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Publish Version Note</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Updated Q4 Hero Headline & Theme"
                    value={publishNote}
                    onChange={(e) => setPublishNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Visual Section Builder (Add, Show/Hide, Reorder) */}
              <div className="surface-card">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Visual Section Manager &amp; Reordering</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {(cmsData.sections || []).map((sec: any, idx: number) => (
                    <div
                      key={sec.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-neutral)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                          {idx + 1}. {sec.title}
                        </div>
                        <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Key: {sec.section_key}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          className={`status-badge ${sec.is_visible ? 'badge-success' : 'badge-neutral'}`}
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={() => handleToggleSectionVisibility(sec)}
                        >
                          {sec.is_visible ? 'VISIBLE' : 'HIDDEN'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleMoveSection(idx, -1)}>
                          <ArrowUp size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleMoveSection(idx, 1)}>
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Section */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New Section Title"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Subtitle"
                    value={newSectionSubtitle}
                    onChange={(e) => setNewSectionSubtitle(e.target.value)}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      if (!newSectionTitle) return;
                      await fetch('/api/admin/cms/sections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: newSectionTitle, subtitle: newSectionSubtitle }),
                      });
                      setNewSectionTitle('');
                      setNewSectionSubtitle('');
                      loadModule('cms');
                    }}
                  >
                    <Plus size={15} />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Version History & Media Library */}
            <div className="grid-2">
              <div className="surface-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>CMS Published Version History</h3>
                {(cmsData.versions || []).map((v: any) => (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div>
                      <span className="mono" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        v{v.version_number}
                      </span>{' '}
                      — <span style={{ fontSize: '0.85rem' }}>{v.note}</span>
                      <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {String(v.created_at).slice(0, 16)}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        await fetch('/api/admin/cms/restore-version', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ versionId: v.id }),
                        });
                        notify('ok', `Restored CMS Version v${v.version_number}`);
                        loadModule('cms');
                        onRefreshPublicSite(false);
                      }}
                    >
                      Restore v{v.version_number}
                    </button>
                  </div>
                ))}
              </div>

              <div className="surface-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>Central Media Library ({cmsData.media?.length || 0})</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Asset Title"
                    value={newMediaTitle}
                    onChange={(e) => setNewMediaTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="/assets/media/..."
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={async () => {
                      if (!newMediaTitle) return;
                      await fetch('/api/admin/media', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: newMediaTitle, fileUrl: newMediaUrl }),
                      });
                      setNewMediaTitle('');
                      loadModule('cms');
                    }}
                  >
                    Add Asset
                  </button>
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {(cmsData.media || []).map((m: any) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.45rem 0',
                        borderBottom: '1px solid var(--border-neutral)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span>{m.title}</span>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {m.file_url}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.7 PACKAGE MANAGEMENT                                           */}
        {/* ================================================================= */}
        {activeMod === 'packages' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">DYNAMIC PACKAGE PRICING &amp; CURRICULUM BUNDLING</span>
              <h2>Package Management</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Historical purchases retain their original snapshot price and commission calculation.
              </p>
            </div>

            <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>Create New Learning Package</h3>
              <div className="grid-3" style={{ gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Package Name"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                />
                <input
                  type="number"
                  className="form-input mono"
                  placeholder="Price in INR"
                  value={newPkgPrice}
                  onChange={(e) => setNewPkgPrice(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Description"
                  value={newPkgDesc}
                  onChange={(e) => setNewPkgDesc(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '0.75rem' }}
                onClick={async () => {
                  if (!newPkgName) return;
                  await fetch('/api/admin/packages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: newPkgName,
                      priceInr: Number(newPkgPrice),
                      description: newPkgDesc,
                      benefits: ['Lifetime Streaming Access', '70% Direct Referral Eligibility', 'Verified PDF Certificate'],
                      courseIds: [1],
                    }),
                  });
                  setNewPkgName('');
                  setNewPkgDesc('');
                  notify('ok', 'Package created!');
                  loadModule('packages');
                  onRefreshPublicSite(false);
                }}
              >
                Create Package
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Package Name</th>
                    <th>Gross Price (INR)</th>
                    <th>70% Referrer Commission</th>
                    <th>30% Company Share</th>
                    <th>Status</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packagesList.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">#{p.id}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="mono">₹{Number(p.price_inr).toLocaleString('en-IN')}</td>
                      <td className="mono" style={{ color: 'var(--color-primary)' }}>
                        ₹{(Number(p.price_inr) * 0.7).toLocaleString('en-IN')}
                      </td>
                      <td className="mono">₹{(Number(p.price_inr) * 0.3).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`status-badge ${p.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={async () => {
                            const nextStatus = p.status === 'active' ? 'inactive' : 'active';
                            await fetch(`/api/admin/packages/${p.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: nextStatus }),
                            });
                            loadModule('packages');
                            onRefreshPublicSite(false);
                          }}
                        >
                          Toggle Active/Inactive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.8 COURSES, LESSONS & ASSIGNMENT SUBMISSION REVIEW              */}
        {/* ================================================================= */}
        {activeMod === 'courses' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">LMS CURRICULUM &amp; CAPSTONE APPROVAL</span>
              <h2>Course, Video Lesson &amp; Assignment Management</h2>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="surface-card">
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Create New Course</h3>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Course Title"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Short Description"
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    if (!newCourseTitle) return;
                    await fetch('/api/admin/courses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: newCourseTitle,
                        shortDescription: newCourseDesc,
                        overview: newCourseDesc,
                      }),
                    });
                    setNewCourseTitle('');
                    setNewCourseDesc('');
                    notify('ok', 'Course created!');
                    loadModule('courses');
                  }}
                >
                  Create Course
                </button>
              </div>

              <div className="surface-card">
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Add Protected Video Lesson to Course</h3>
                <div className="form-group">
                  <select
                    className="form-select"
                    value={newLessonCourseId}
                    onChange={(e) => setNewLessonCourseId(Number(e.target.value))}
                  >
                    {coursesAdmin.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Lesson Title"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    if (!newLessonTitle) return;
                    await fetch(`/api/admin/courses/${newLessonCourseId}/lessons`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: newLessonTitle, durationSeconds: 10, isCompulsory: true }),
                    });
                    setNewLessonTitle('');
                    notify('ok', 'Compulsory video lesson added!');
                    loadModule('courses');
                  }}
                >
                  Add Video Lesson
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
              Student Assignment Submissions (Approving Unlocks Course Certificate)
            </h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course &amp; Assignment</th>
                    <th>Submission Content</th>
                    <th>Status</th>
                    <th>Review Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesAdmin.assignmentSubmissions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.student_name}</div>
                        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.student_email}
                        </div>
                      </td>
                      <td>
                        <div>{s.course_title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.assignment_title}</div>
                      </td>
                      <td style={{ maxWidth: '300px' }}>{s.submission_text}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            s.status === 'approved' ? 'badge-success' : s.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                              await fetch(`/api/admin/assignments/submissions/${s.id}/review`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  status: 'approved',
                                  feedback: 'Approved by Faculty Dean. Excellent implementation plan.',
                                }),
                              });
                              notify('ok', 'Assignment approved! Course completion & certificate evaluated.');
                              loadModule('courses');
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              await fetch(`/api/admin/assignments/submissions/${s.id}/review`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  status: 'rejected',
                                  feedback: 'Please expand on your quantitative risk controls and resubmit.',
                                }),
                              });
                              notify('ok', 'Assignment marked for revision.');
                              loadModule('courses');
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.9 USER MANAGEMENT                                              */}
        {/* ================================================================= */}
        {activeMod === 'users' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">ACCOUNT PROVISIONING &amp; GOVERNANCE</span>
              <h2>User Management</h2>
            </div>

            <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Create User Manually (Follows Referral &amp; Audit Rules)
              </h3>
              <div className="grid-4" style={{ gap: '0.65rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Full Name"
                  value={manualUserName}
                  onChange={(e) => setManualUserName(e.target.value)}
                />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email Address"
                  value={manualUserEmail}
                  onChange={(e) => setManualUserEmail(e.target.value)}
                />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Mobile Number"
                  value={manualUserMobile}
                  onChange={(e) => setManualUserMobile(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="Sponsor Code (e.g. AB1234)"
                  value={manualUserRef}
                  onChange={(e) => setManualUserRef(e.target.value.toUpperCase())}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '0.75rem' }}
                onClick={async () => {
                  if (!manualUserName || !manualUserEmail || !manualUserMobile) return;
                  const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fullName: manualUserName,
                      email: manualUserEmail,
                      mobile: manualUserMobile,
                      password: manualUserPass,
                      referralCode: manualUserRef,
                      packageId: 1,
                    }),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    notify('ok', `User created manually (ID #${d.userId}) with package & 70% referral commission credited!`);
                    setManualUserName('');
                    setManualUserEmail('');
                    setManualUserMobile('');
                    loadModule('users');
                  } else {
                    notify('err', d.error);
                  }
                }}
              >
                Create User &amp; Activate Package
              </button>
            </div>

            {usersList.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Users Found"
                description="No user records match the current filter or search term."
                badge="User Management"
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User Name &amp; Contact</th>
                      <th>Affiliate Code</th>
                      <th>Locked Sponsor</th>
                      <th>Available Commission</th>
                      <th>KYC Status</th>
                      <th>Account Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td className="mono">#{u.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {u.email} · {u.mobile}
                          </div>
                        </td>
                        <td className="mono" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                          {u.affiliate_code}
                        </td>
                        <td className="mono">{u.referred_by_code || 'COMPANY DIRECT'}</td>
                        <td className="mono" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          ₹{Number(u.available_commission_inr || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className="status-badge badge-neutral">{u.kyc_status || 'not_submitted'}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={async () => {
                              const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                              await fetch(`/api/admin/users/${u.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: nextStatus }),
                              });
                              notify('ok', `User #${u.id} status updated to ${nextStatus}`);
                              loadModule('users');
                            }}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.10 & 16.11 AFFILIATE, WALLET & BONUS MANAGEMENT                */}
        {/* ================================================================= */}
        {activeMod === 'finance' && walletAdmin && affAdmin && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">APPEND-ONLY FINANCIAL LEDGER &amp; 70/30 COMMISSION AUDIT</span>
              <h2>Affiliate Commissions, Wallets &amp; Bonus Credits</h2>
            </div>

            <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Credit Authorized Company Bonus (Recorded Separately from Affiliate Commission)
              </h3>
              <div className="grid-3" style={{ gap: '0.75rem' }}>
                <select
                  className="form-select"
                  value={bonusUserId}
                  onChange={(e) => setBonusUserId(Number(e.target.value))}
                >
                  {walletAdmin.wallets.map((w: any) => (
                    <option key={w.user_id} value={w.user_id}>
                      {w.full_name} ({w.affiliate_code})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="form-input mono"
                  placeholder="Bonus Amount (INR)"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mandatory Audit Reason"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                />
              </div>
              <button
                className="btn btn-accent btn-sm"
                style={{ marginTop: '0.75rem' }}
                onClick={async () => {
                  const res = await fetch('/api/admin/wallet/bonus', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: bonusUserId,
                      amountInr: Number(bonusAmount),
                      reason: bonusReason,
                    }),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    notify('ok', `Credited ₹${bonusAmount} bonus with audit log!`);
                    loadModule('finance');
                  } else {
                    notify('err', d.error);
                  }
                }}
              >
                Credit Bonus &amp; Record Ledger Entry
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem' }}>70/30 Affiliate Commission Records</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportCsv('edurt_affiliate_commissions.csv', affAdmin.commissions)}
              >
                <Download size={14} />
                Export Affiliate CSV
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Order</th>
                    <th>Buyer</th>
                    <th>Direct Referrer</th>
                    <th>Gross Price</th>
                    <th>70% Referrer</th>
                    <th>30%/100% Company</th>
                  </tr>
                </thead>
                <tbody>
                  {affAdmin.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <td className="mono">{c.commission_ref}</td>
                      <td className="mono">{c.order_number}</td>
                      <td>{c.buyer_name}</td>
                      <td>{c.referrer_name || 'Company Direct (No Referrer)'}</td>
                      <td className="mono">₹{Number(c.gross_package_price_inr).toLocaleString('en-IN')}</td>
                      <td className="mono" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        ₹{Number(c.referrer_amount_inr).toLocaleString('en-IN')} ({c.referrer_percentage}%)
                      </td>
                      <td className="mono" style={{ color: 'var(--color-accent)' }}>
                        ₹{Number(c.company_amount_inr).toLocaleString('en-IN')} ({c.company_percentage}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.12 WITHDRAWAL MANAGEMENT                                       */}
        {/* ================================================================= */}
        {activeMod === 'withdrawals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span className="eyebrow-label">PAYOUT SETTLEMENT &amp; RESERVATION RELEASE</span>
                <h2>Withdrawal Requests Management</h2>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportCsv('edurt_withdrawals_report.csv', withdrawalsList)}
              >
                <Download size={14} />
                Export Withdrawals CSV
              </button>
            </div>

            {withdrawalsList.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No Withdrawal Requests"
                description="There are currently no withdrawal payout requests in the queue."
                badge="Payout Ledger"
              />
            ) : (
              <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request Ref</th>
                    <th>Partner</th>
                    <th>Amount</th>
                    <th>Payout Details</th>
                    <th>Status</th>
                    <th>Settlement / Rejection Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalsList.map((w) => (
                    <tr key={w.id}>
                      <td className="mono">{w.request_ref}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.full_name}</div>
                        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {w.email}
                        </div>
                      </td>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        ₹{Number(w.amount_inr).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {w.payout_method === 'upi'
                          ? `UPI: ${w.upi_id} (${w.account_holder_name})`
                          : `Bank: ${w.bank_name} · A/C ${w.account_number} · IFSC ${w.ifsc_code}`}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            w.status === 'paid' ? 'badge-success' : w.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}
                        >
                          {w.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {w.status === 'paid' || w.status === 'rejected' ? (
                          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {w.payment_reference || w.rejection_reason}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input mono"
                              style={{ width: '130px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                              placeholder="UTR / Ref ID"
                              value={utrInputs[w.id] || ''}
                              onChange={(e) => setUtrInputs({ ...utrInputs, [w.id]: e.target.value })}
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/withdrawals/${w.id}/decision`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'paid',
                                    paymentReference: utrInputs[w.id] || `UTR${Date.now()}`,
                                  }),
                                });
                                if (res.ok) {
                                  notify('ok', `Withdrawal ${w.request_ref} marked PAID and ledger settled!`);
                                  loadModule('withdrawals');
                                }
                              }}
                            >
                              Mark Paid
                            </button>
                            <input
                              type="text"
                              className="form-input"
                              style={{ width: '140px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                              placeholder="Reject reason..."
                              value={rejectInputs[w.id] || ''}
                              onChange={(e) => setRejectInputs({ ...rejectInputs, [w.id]: e.target.value })}
                            />
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/withdrawals/${w.id}/decision`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'reject',
                                    rejectionReason: rejectInputs[w.id] || 'Invalid Bank/UPI Beneficiary Details',
                                  }),
                                });
                                const d = await res.json();
                                if (res.ok) {
                                  notify('ok', `Withdrawal ${w.request_ref} rejected & reserved funds released to user!`);
                                  loadModule('withdrawals');
                                } else {
                                  notify('err', d.error);
                                }
                              }}
                            >
                              Reject &amp; Release
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

        {/* ================================================================= */}
        {/* 16.13 KYC MANAGEMENT                                              */}
        {/* ================================================================= */}
        {activeMod === 'kyc' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">IDENTITY DOCUMENT &amp; PAYOUT MANDATE VERIFICATION</span>
              <h2>KYC Submissions Review</h2>
            </div>

            {kycList.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No KYC Submissions"
                description="There are currently no identity documents awaiting verification."
                badge="Compliance Queue"
              />
            ) : (
              <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Masked Aadhaar</th>
                    <th>Bank &amp; UPI Mandate</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Compliance Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {kycList.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{k.full_name}</div>
                        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {k.email}
                        </div>
                      </td>
                      <td className="mono">{k.aadhaar_number_masked}</td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {k.bank_name} · {k.account_number} ({k.ifsc_code}) · UPI: {k.upi_id}
                      </td>
                      <td>
                        {k.district}, {k.state} ({k.gender})
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            k.status === 'approved' ? 'badge-success' : k.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                              await fetch(`/api/admin/kyc/${k.id}/decision`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'approved', reason: 'Verified Aadhaar & Bank Mandate' }),
                              });
                              notify('ok', `Approved KYC for ${k.full_name}`);
                              loadModule('kyc');
                            }}
                          >
                            Approve KYC
                          </button>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '150px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                            placeholder="Rejection reason..."
                            value={kycReasonInputs[k.id] || ''}
                            onChange={(e) => setKycReasonInputs({ ...kycReasonInputs, [k.id]: e.target.value })}
                          />
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/kyc/${k.id}/decision`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  status: 'rejected',
                                  reason: kycReasonInputs[k.id] || 'Uploaded Aadhaar image is blurry. Please re-upload clear scan.',
                                }),
                              });
                              if (res.ok) {
                                notify('ok', `Rejected KYC for ${k.full_name} with reason.`);
                                loadModule('kyc');
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

        {/* ================================================================= */}
        {/* 16.15 OFFERS & BATCH MANAGEMENT                                   */}
        {/* ================================================================= */}
        {activeMod === 'offers' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">BATCHES, COUNTDOWN TIMERS &amp; 16:9 BANNERS</span>
              <h2>Offers &amp; Cohort Batch Management</h2>
            </div>

            <div className="surface-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>Create New Promotional Batch &amp; Offer</h3>
              <div className="grid-3" style={{ gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Batch Category</label>
                  <select
                    className="form-select"
                    value={newOfferBatchType}
                    onChange={(e) => setNewOfferBatchType(e.target.value)}
                  >
                    <option value="VIP Batch">VIP Batch</option>
                    <option value="Premium Batch">Premium Batch</option>
                    <option value="Special Offers">Special Offers</option>
                    <option value="Limited-Time Offers">Limited-Time Offers</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Offer Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Executive Summit Special Window"
                    value={newOfferTitle}
                    onChange={(e) => setNewOfferTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Offer Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Description..."
                    value={newOfferDesc}
                    onChange={(e) => setNewOfferDesc(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newOfferTitle) return;
                  await fetch('/api/admin/offers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      batchType: newOfferBatchType,
                      title: newOfferTitle,
                      description: newOfferDesc,
                      durationDays: 10,
                    }),
                  });
                  setNewOfferTitle('');
                  setNewOfferDesc('');
                  notify('ok', 'New Promotional Offer & Batch published!');
                  onRefreshPublicSite(false);
                }}
              >
                Publish Offer &amp; Countdown Timer
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 15.3 ADMIN EMAIL TEMPLATES & DELIVERY LOGS                        */}
        {/* ================================================================= */}
        {activeMod === 'emails' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow-label">HOSTINGER SMTP (TEAM@LEARNUPINDIA.COM) &amp; MYSQL (U591469534_EDUC)</span>
              <h2>Email Notification &amp; Hostinger Infrastructure (13 System Templates)</h2>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="surface-card">
                <span className="eyebrow-label" style={{ marginBottom: '0.25rem' }}>HOSTINGER MAIL (SMTP)</span>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>team@learnupindia.com</h3>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Host: smtp.hostinger.com:465 (SSL/TLS) · Domain: learnupindia.com
                </div>
              </div>
              <div className="surface-card">
                <span className="eyebrow-label" style={{ marginBottom: '0.25rem' }}>HOSTINGER MYSQL DATABASE</span>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Database: u591469534_educ</h3>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  MySQL User: u591469534_educt · Schema: database/schema.mysql.sql (43 Tables)
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="surface-card">
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.85rem' }}>Configured Email Templates ({emailsAdmin.templates.length})</h3>
                {emailsAdmin.templates.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.65rem 0',
                      borderBottom: '1px solid var(--border-neutral)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{t.name}</strong>
                      <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-primary)' }}>
                        {t.template_key}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Subject: {t.subject}</div>
                  </div>
                ))}
              </div>

              <div className="surface-card">
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.85rem' }}>Email Delivery Logs</h3>
                {emailsAdmin.logs.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      padding: '0.65rem 0',
                      borderBottom: '1px solid var(--border-neutral)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="mono">{l.recipient_email}</span>
                      <span className="status-badge badge-success">{l.status}</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{l.subject}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>{l.body_preview}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.19 REPORTS & ANALYTICS                                         */}
        {/* ================================================================= */}
        {activeMod === 'reports' && reportsData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span className="eyebrow-label">RECONCILED LEDGER &amp; LMS REPORTS</span>
                <h2>Financial &amp; Academic Analytics</h2>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => exportCsv('edurt_package_sales_reconciliation.csv', reportsData.packageWiseSales)}
              >
                <Download size={14} />
                Export Package Sales CSV
              </button>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Package-Wise Sales &amp; 70/30 Revenue Reconciliation</h3>
            <div className="table-wrap" style={{ marginBottom: '1.75rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Package Name</th>
                    <th>Paid Orders</th>
                    <th>Gross Sales (INR)</th>
                    <th>Referrer Commissions (70%)</th>
                    <th>Company Share (30% / Direct 100%)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData.packageWiseSales.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{r.package_name}</td>
                      <td className="mono">{r.orders_count}</td>
                      <td className="mono">₹{Number(r.gross_sales_inr).toLocaleString('en-IN')}</td>
                      <td className="mono" style={{ color: 'var(--color-primary)' }}>
                        ₹{Number(r.referrer_commission_inr).toLocaleString('en-IN')}
                      </td>
                      <td className="mono" style={{ color: 'var(--color-accent)' }}>
                        ₹{Number(r.company_share_inr).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Course Enrollment &amp; Certification Report</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Title</th>
                    <th>Total Enrollments</th>
                    <th>100% Verified Completions</th>
                    <th>Certificates Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData.courseStats.map((c: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{c.title}</td>
                      <td className="mono">{c.enrollments_count}</td>
                      <td className="mono">{c.completions_count}</td>
                      <td className="mono" style={{ color: 'var(--color-primary)' }}>
                        {c.certificates_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 16.20 - 16.22 RBAC ROLES, ACTIVITY LOGS & ENCRYPTED BACKUPS       */}
        {/* ================================================================= */}
        {activeMod === 'security' && rolesData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span className="eyebrow-label">RBAC ROLES · AUDIT LOGS · AES-256-GCM ENCRYPTED BACKUPS</span>
                <h2>Security, Roles &amp; Backup Management</h2>
              </div>
              <button id="create-encrypted-backup-btn" className="btn btn-primary btn-sm" onClick={handleCreateBackup}>
                <Database size={14} />
                Create Encrypted AES-256-GCM Backup Now
              </button>
            </div>

            {/* Encrypted Backups Table */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Encrypted Database &amp; Media Backups</h3>
            <div className="table-wrap" style={{ marginBottom: '1.75rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Backup Code</th>
                    <th>Encryption</th>
                    <th>Size</th>
                    <th>SHA-256 Checksum</th>
                    <th>Status</th>
                    <th>Verify / Restore Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backupsData.backups.map((b: any) => (
                    <tr key={b.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {b.backup_code}
                      </td>
                      <td className="mono">{b.encryption_algorithm}</td>
                      <td className="mono">{(Number(b.file_size_bytes) / 1024).toFixed(1)} KB</td>
                      <td className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {String(b.checksum_sha256).slice(0, 24)}...
                      </td>
                      <td>
                        <span className="status-badge badge-success">{b.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleVerifyOrRestoreBackup(b.id, false)}
                          >
                            Test Verify Integrity
                          </button>
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => handleVerifyOrRestoreBackup(b.id, true)}
                          >
                            <RefreshCw size={13} />
                            Restore Snapshot
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {backupsData.backups.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Click &ldquo;Create Encrypted AES-256-GCM Backup Now&rdquo; to generate and verify your first backup archive.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 6 Admin Roles Matrix */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Configured Admin Roles &amp; Least-Privilege Permissions</h3>
            <div className="grid-3">
              {rolesData.roles.map((r: any) => (
                <div key={r.id} className="surface-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <h4 style={{ fontSize: '1rem' }}>{r.name}</h4>
                    <Key size={15} color="var(--color-accent)" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{r.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {r.permissions.map((p: string) => (
                      <span key={p} className="status-badge badge-neutral" style={{ fontSize: '0.66rem' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
              </>
            )}
          </PageTransition>
        </ComponentErrorBoundary>
      </main>
    </div>
  );
};
