import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { Shield, Lock, Eye, EyeOff, LogIn, Sun, Moon } from 'lucide-react';
import RuetLogo from '../../components/RuetLogo';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Username and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        identifier: username.trim(),
        password: password
      });

      if (res.success) {
        if (res.user?.role === 'department_head') {
          toast.success(`Welcome, Department Head ${res.user?.name || ''}`);
          navigate('/head');
          return;
        }
        if (res.user?.role !== 'admin' && res.user?.role !== 'super_admin') {
          toast.error('Access denied: You do not possess Administrator privileges.');
          setLoading(false);
          return;
        }
        toast.success('Administrator authentication verified');
        navigate('/admin');
      } else {
        toast.error(res.message || 'Invalid administrator credentials');
      }
    } catch (err) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const bg = isDarkMode ? '#0a0f1d' : '#f1f5f9';
  const card = isDarkMode ? '#0f172a' : '#ffffff';
  const border = isDarkMode ? '#1e293b' : '#cbd5e1';
  const textMain = isDarkMode ? '#f8fafc' : '#0f172a';
  const textMuted = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Top Controls */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={toggleTheme}
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: '6px 12px',
            color: textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12
          }}
        >
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Main Admin Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 16,
        boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,0.6)' : '0 12px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: `1px solid ${border}`,
          background: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <RuetLogo size={46} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: textMain, margin: 0 }}>
                Lab<span style={{ color: '#2563eb' }}>Eval</span>
              </h2>
              <span style={{
                background: '#dc2626',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Security Console
              </span>
            </div>
            <p style={{ fontSize: 11, color: textMuted, margin: '4px 0 0' }}>
              System Administrator Gateway
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div style={{
          padding: '12px 28px',
          background: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          color: isDarkMode ? '#f87171' : '#b91c1c'
        }}>
          <Shield size={16} style={{ flexShrink: 0 }} />
          <span>Restricted system portal. All access attempts are strictly monitored and logged.</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted, marginBottom: 6 }}>
              Administrator Username
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. ADMIN"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                padding: '10px 14px',
                background: isDarkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${border}`,
                borderRadius: 8,
                fontSize: 13,
                color: textMain,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted, marginBottom: 6 }}>
              Administrator Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '10px 40px 10px 14px',
                  background: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: textMain,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              height: 42,
              background: loading ? '#64748b' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#ffffff',
              border: `1px solid ${isDarkMode ? '#334155' : '#1e293b'}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
            ) : (
              <>
                <Lock size={15} />
                <span>Verify Admin Credentials</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          padding: '12px 28px',
          borderTop: `1px solid ${border}`,
          textAlign: 'center',
          fontSize: 11,
          color: textMuted,
          background: isDarkMode ? 'rgba(30, 41, 59, 0.2)' : '#f8fafc'
        }}>
          RUET LabEval &bull; Administrative Console
        </div>
      </div>
    </div>
  );
}
