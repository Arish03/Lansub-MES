import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Activity, Eye, EyeOff, Zap, Cpu, TrendingUp, Shield } from 'lucide-react'

const FEATURES = [
  { icon: Cpu, text: '3D Equipment SCADA with live sensor overlay' },
  { icon: TrendingUp, text: 'Predictive maintenance & fault detection' },
  { icon: Shield, text: 'Lansub AI report generation' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Left panel — branding */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(160deg, #1a2742 0%, #2d4a8a 60%, #1a3a6e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(230,57,70,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(37,99,235,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

        {/* Logo */}
        <div>
          <div style={{ marginBottom: '36px', cursor: 'pointer' }} onClick={() => navigate('/landing')}>
            <img src="/lansub_logo.png" alt="Lansub Technologies"
              style={{ height: '44px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
          </div>

          <h2 style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '16px' }}>
            Asset Reliability<br />
            <span style={{ color: '#e63946' }}>Digital Twin</span><br />
            Platform
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '320px' }}>
            Real-time condition monitoring for your Gas Compressor Train with 8 sensor points, OEM datasheet integration and AI-powered failure prediction.
          </p>
        </div>


        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={15} color="rgba(255,255,255,0.8)" />
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom brand */}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Powered by Lansub AI · Lansub Technologies
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              Sign in
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>
              Access your condition monitoring dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'var(--red-light)', border: '1px solid var(--red-mid)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: 'var(--red)', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '15px', borderRadius: '10px' }}
            >
              {loading ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: '28px', padding: '16px',
            background: 'var(--surface)', borderRadius: '12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Demo Credentials — Click to fill
            </div>
            {[
              { user: 'admin',    pass: 'lansub@2024',   role: 'Admin',    color: 'var(--red)' },
              { user: 'engineer', pass: 'engineer@2024', role: 'Engineer', color: 'var(--blue)' },
              { user: 'viewer',   pass: 'viewer@2024',   role: 'Viewer',   color: 'var(--green)' },
            ].map(({ user, pass, role, color }) => (
              <div
                key={user}
                onClick={() => { setUsername(user); setPassword(pass) }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', cursor: 'pointer', borderRadius: '8px',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {user}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '8px' }}>/ {pass}</span>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                  background: `${color}18`, color, borderRadius: '999px',
                  textTransform: 'uppercase', border: `1px solid ${color}33`,
                }}>{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
