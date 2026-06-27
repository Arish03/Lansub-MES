import React from 'react'
import { useLocation } from 'react-router-dom'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { Bell, Search, RefreshCw, Clock } from 'lucide-react'

const PAGE_TITLES = {
  '/':        { title: 'Dashboard',       sub: 'Gas Compressor Train Overview' },
  '/assets':  { title: 'Equipment',       sub: 'Monitored assets register' },
  '/trends':  { title: 'Trend Analysis',  sub: 'Historical & live parameter trends' },
  '/alarms':  { title: 'Alarm Console',   sub: 'Active alarms and event log' },
  '/reports': { title: 'AI Reports',      sub: 'Lansub AI generated reports' },
}

export default function Header() {
  const location = useLocation()
  const { connected, latestTelemetry } = useWebSocket()

  const path = location.pathname.startsWith('/assets/') ? '/assets' : location.pathname
  const { title, sub } = PAGE_TITLES[path] || { title: 'Lansub MES', sub: '' }

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const criticalAssets = Object.values(latestTelemetry).filter(
    v => v && (v.health_score ?? 100) < 50
  ).length

  return (
    <header className="header">
      {/* Left: page title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>→</span>
          <h1 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '1px' }}>{sub}</p>
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Live clock */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 12px', borderRadius: '8px',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          fontSize: '12px', color: 'var(--text-2)', fontWeight: 500,
        }}>
          <Clock size={12} color="var(--text-3)" />
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          &nbsp;·&nbsp;
          <LiveClock />
        </div>

        {/* Connection badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 12px', borderRadius: '8px',
          background: connected ? 'var(--green-light)' : 'var(--red-light)',
          border: `1px solid ${connected ? 'var(--green-mid)' : 'var(--red-mid)'}`,
          fontSize: '12px', fontWeight: 600,
          color: connected ? 'var(--green)' : 'var(--red)',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: connected ? 'var(--green)' : 'var(--red)',
            animation: connected ? 'pulse-dot 2s infinite' : 'none',
          }} />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>

        {/* Alarm bell */}
        <button style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: criticalAssets > 0 ? 'var(--red-light)' : 'var(--surface-2)',
          border: `1px solid ${criticalAssets > 0 ? 'var(--red-mid)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', transition: 'var(--transition)',
        }}>
          <Bell size={15} color={criticalAssets > 0 ? 'var(--red)' : 'var(--text-2)'} />
          {criticalAssets > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: 'var(--red)', color: '#fff',
              fontSize: '9px', fontWeight: 700,
              width: '16px', height: '16px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'alarmPulse 1.5s infinite',
            }}>{criticalAssets}</span>
          )}
        </button>
      </div>
    </header>
  )
}

function LiveClock() {
  const [time, setTime] = React.useState(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )
  React.useEffect(() => {
    const t = setInterval(() => setTime(
      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    ), 1000)
    return () => clearInterval(t)
  }, [])
  return <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{time}</span>
}
