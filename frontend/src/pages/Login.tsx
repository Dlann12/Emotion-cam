import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../utils/auth';

const Login = () => {
  const navigate = useNavigate();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali email dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemo();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal login akun demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: 'var(--bg-main)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 2rem' }}>
        <div className="text-center mb-6">
          <div
            style={{
              display: 'inline-flex',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), #FF8547)',
              color: 'white',
              boxShadow: '0 4px 16px var(--primary-glow)',
              marginBottom: '1rem',
            }}
          >
            <Activity size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Wajah Emosi</h1>
          <p style={{ fontSize: '0.9rem' }}>Kenali ekspresimu, pahami emosimu.</p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#EF4444',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary mt-4"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Masuk...' : 'Masuk ke Akun'} <ArrowRight size={17} />
          </button>
        </form>

        <div style={{ position: 'relative', margin: '1.75rem 0', textAlign: 'center' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-card)',
              padding: '0 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            ATAU
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', border: '1px solid rgba(255, 90, 31, 0.35)' }}
          onClick={handleDemoLogin}
          disabled={loading}
        >
          <Zap size={16} color="var(--primary)" /> Masuk Instan (Akun Demo)
        </button>

        <p className="text-center mt-6" style={{ fontSize: '0.875rem' }}>
          Belum punya akun?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
