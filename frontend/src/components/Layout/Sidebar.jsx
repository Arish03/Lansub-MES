import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import {
  LayoutDashboard, Cpu, TrendingUp, Bell, FileText,
  Activity, LogOut, Wifi, WifiOff, Shield, Wrench, Gauge,
} from 'lucide-react'

const NAV = [
  { group: 'OVERVIEW', items: [
    { to: '/',             label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/assets',       label: 'Equipment',       icon: Cpu },
  ]},
  { group: 'DIGITAL TWIN', items: [
    { to: '/reliability',  label: 'Reliability',     icon: Shield },
    { to: '/trends',       label: 'Trends',          icon: TrendingUp },
  ]},
  { group: 'OPERATIONS', items: [
    { to: '/alarms',       label: 'Alarms',          icon: Bell, alarmBadge: true },
    { to: '/maintenance',  label: 'Maintenance',     icon: Wrench },
    { to: '/reports',      label: 'AI Reports',      icon: FileText },
  ]},
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { connected, latestTelemetry } = useWebSocket()

  const criticalCount = Object.values(latestTelemetry).filter(
    v => v && (v.health_score ?? 100) < 50
  ).length

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src="/lansub_logo.png"
          alt="Lansub Technologies"
          style={{ height: '32px', objectFit: 'contain', maxWidth: '160px' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Platform label */}
      <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Activity size={12} color="var(--red)" />
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--red)', letterSpacing: '0.1em' }}>
          ASSET RELIABILITY PLATFORM
        </span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {NAV.map(group => (
          <div key={group.group}>
            <div className="nav-label">{group.group}</div>
            {group.items.map(({ to, label, icon: Icon, alarmBadge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={15} className="icon" />
                <span style={{ flex: 1 }}>{label}</span>
                {alarmBadge && criticalCount > 0 && (
                  <span style={{
                    background: 'var(--red)', color: '#fff',
                    fontSize: '10px', fontWeight: 800,
                    borderRadius: '999px', padding: '1px 7px',
                    minWidth: '18px', textAlign: 'center',
                  }}>{criticalCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        {/* Connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', borderRadius: 'var(--radius-sm)',
          background: connected ? 'var(--green-light)' : 'var(--red-light)',
          border: `1px solid ${connected ? 'var(--green-mid)' : 'var(--red-mid)'}`,
          marginBottom: '10px',
        }}>
          {connected
            ? <Wifi size={12} color="var(--green)" />
            : <WifiOff size={12} color="var(--red)" />
          }
          <span style={{ fontSize: '11px', fontWeight: 700, color: connected ? 'var(--green)' : 'var(--red)' }}>
            {connected ? 'Live Connected' : 'Disconnected'}
          </span>
          {connected && (
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', marginLeft: 'auto', animation: 'pulse-dot 2s infinite' }} />
          )}
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a2742, #2d4a8a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'capitalize' }}>
              {user?.role}
            </div>
          </div>
          <button onClick={logout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', borderRadius: '5px', display: 'flex', transition: 'color 150ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
