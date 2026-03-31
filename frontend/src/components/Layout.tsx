import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_BY_ROLE = {
  EMPLOYEE: [
    { label: 'My Claims', path: '/employee/claims' },
    { label: 'New Claim', path: '/employee/claims/new' },
  ],
  LINE_MANAGER: [
    { label: 'My Claims', path: '/employee/claims' },
    { label: 'New Claim', path: '/employee/claims/new' },
    { label: 'Pending Reviews', path: '/manager/claims' },
  ],
  FINANCE_OFFICER: [
    { label: 'My Claims', path: '/employee/claims' },
    { label: 'New Claim', path: '/employee/claims/new' },
    { label: 'Pending Reviews', path: '/manager/claims' },
    { label: 'Approved Claims', path: '/finance/claims' },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user ? NAV_BY_ROLE[user.role] : [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: '#1a4d1a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>FDM Expenses</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {user?.role.replace('_', ' ')}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'block',
                  padding: '10px 20px',
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '14px',
                  borderLeft: active ? '3px solid #4dcc80' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>
            {user?.fullName}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
            {user?.costCentre}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '7px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        {children}
      </main>
    </div>
  );
}
