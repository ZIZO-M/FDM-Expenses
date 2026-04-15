import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import FDMLogo from '../../components/FDMLogo';
import * as api from '../../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#1E1E1E',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        background: '#1E1E1E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background accent blob */}
        <div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,214,0,0.15) 0%, transparent 70%)',
          top: -100, left: -100, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(197,255,0,0.08) 0%, transparent 70%)',
          bottom: 0, right: 0, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <FDMLogo height={52} />
          <div style={{
            marginTop: 32,
            fontSize: 28, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.5px', lineHeight: 1.2,
          }}>
            Expense Management<br />
            <span style={{ color: '#00D600' }}>Portal</span>
          </div>
          <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 300, lineHeight: 1.6 }}>
            Submit, review and process expense claims across the FDM Group network.
          </p>

          {/* Brand accent strip */}
          <div style={{ display: 'flex', gap: 6, marginTop: 40, justifyContent: 'center' }}>
            {['#00D600', '#C5FF00', 'rgba(255,255,255,0.15)'].map((c, i) => (
              <div key={i} style={{ height: 4, width: i === 0 ? 32 : 16, borderRadius: 99, background: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 440,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 44px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E1E1E', letterSpacing: '-0.4px', marginBottom: 6 }}>
            Sign in
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--grey-400)' }}>
            Use your FDM Group credentials
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@fdmgroup.com"
              required autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: 8,
              background: '#00D600', color: '#1E1E1E',
              fontSize: 15, fontWeight: 800, fontFamily: 'DM Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.18s',
              boxShadow: '0 4px 14px rgba(0,214,0,0.35)',
            }}
          >
            {loading ? <><span className="spinner" style={{ borderTopColor: '#1E1E1E' }} /> Signing in…</> : 'Sign In →'}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: 28, padding: '16px', background: 'var(--grey-50)', borderRadius: 8, border: '1px solid var(--grey-200)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Demo Accounts
          </div>
          {[
            { role: 'Employee',       email: 'employee@fdm.com' },
            { role: 'Line Manager',   email: 'manager@fdm.com' },
            { role: 'Finance Officer',email: 'finance@fdm.com' },
          ].map(({ role, email: e }) => (
            <div key={e} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--grey-500)', fontWeight: 500 }}>{role}</span>
              <button type="button" onClick={() => { setEmail(e); setPassword('password123'); }}
                style={{ fontSize: 11.5, color: '#009900', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                {e}
              </button>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--grey-300)', marginTop: 8 }}>Password: password123</div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--grey-300)', textAlign: 'center' }}>
          FDM Group Expenses Portal · ECS506U Group 41
        </div>
      </div>
    </div>
  );
}
