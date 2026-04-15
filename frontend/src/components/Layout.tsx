import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FDMLogo from './FDMLogo';

const NAV_BY_ROLE = {
  EMPLOYEE: [
    { label: 'Dashboard',      path: '/dashboard',           icon: '⊞' },
    { label: 'My Claims',      path: '/employee/claims',     icon: '📋' },
    { label: 'New Claim',      path: '/employee/claims/new', icon: '＋' },
  ],
  LINE_MANAGER: [
    { label: 'Dashboard',      path: '/dashboard',           icon: '⊞' },
    { label: 'My Claims',      path: '/employee/claims',     icon: '📋' },
    { label: 'New Claim',      path: '/employee/claims/new', icon: '＋' },
    { label: 'Pending Reviews',path: '/manager/claims',      icon: '🔍' },
  ],
  FINANCE_OFFICER: [
    { label: 'Dashboard',      path: '/dashboard',           icon: '⊞' },
    { label: 'My Claims',      path: '/employee/claims',     icon: '📋' },
    { label: 'New Claim',      path: '/employee/claims/new', icon: '＋' },
    { label: 'Pending Reviews',path: '/manager/claims',      icon: '🔍' },
    { label: 'Approved Claims',path: '/finance/claims',      icon: '💳' },
  ],
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/employee/claims': 'My Claims',
  '/employee/claims/new': 'New Claim',
  '/manager/claims': 'Pending Reviews',
  '/finance/claims': 'Approved Claims',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getRoleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// FDM brand dark colour for sidebar
const SIDEBAR_BG = '#1E1E1E';
const SIDEBAR_ACTIVE = '#00D600';
const SIDEBAR_ACTIVE_TEXT = '#1E1E1E';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const navItems = user ? NAV_BY_ROLE[user.role] ?? [] : [];

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'FDM Expenses';

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', background: SIDEBAR_BG,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo area */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <FDMLogo height={28} />
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 6, letterSpacing: '0.3px' }}>
            Expense Management Portal
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 10px 4px' }}>
            Navigation
          </div>
          {navItems.map((item) => {
            const active = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 6, marginBottom: 2,
                color: active ? SIDEBAR_ACTIVE_TEXT : 'rgba(255,255,255,0.55)',
                background: active ? SIDEBAR_ACTIVE : 'transparent',
                fontSize: 13.5, fontWeight: active ? 700 : 500,
                transition: 'all 0.18s',
                textDecoration: 'none',
              }}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: SIDEBAR_ACTIVE, color: SIDEBAR_ACTIVE_TEXT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>
              {user ? getInitials(user.fullName) : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                {user ? getRoleLabel(user.role) : ''}
              </div>
            </div>
            <button onClick={handleLogout} title="Sign out" style={{
              width: 28, height: 28, background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, transition: 'all 0.18s', flexShrink: 0,
            }}>⎋</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{pageTitle}</span>
          <div className="topbar-actions">
            <span className="text-muted" style={{ fontSize: 12 }}>{user?.costCentre}</span>
          </div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
