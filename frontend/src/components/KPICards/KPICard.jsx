import React from 'react'

const ACCENT = {
  red:    { bg: 'var(--red-light)',    border: 'var(--red-mid)',    text: 'var(--red)',    stripe: '#e63946' },
  blue:   { bg: 'var(--blue-light)',   border: 'var(--blue-mid)',   text: 'var(--blue)',   stripe: '#2563eb' },
  green:  { bg: 'var(--green-light)',  border: 'var(--green-mid)',  text: 'var(--green)',  stripe: '#16a34a' },
  amber:  { bg: 'var(--amber-light)',  border: 'var(--amber-mid)',  text: 'var(--amber)',  stripe: '#d97706' },
  purple: { bg: 'var(--purple-light)', border: '#ddd6fe',          text: 'var(--purple)', stripe: '#7c3aed' },
  normal: { bg: 'var(--surface)',      border: 'var(--border)',    text: 'var(--text-2)', stripe: '#2563eb' },
}

export default function KPICard({ title, value, unit, icon: Icon, trend, status = 'normal', subtitle, accentColor = 'normal' }) {
  // Map status → accent
  const colorKey = accentColor !== 'normal' ? accentColor
    : status === 'good' ? 'green'
    : status === 'warning' ? 'amber'
    : status === 'critical' ? 'red'
    : 'normal'
  const a = ACCENT[colorKey] || ACCENT.normal

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'var(--transition)',
        cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Top color stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '4px',
        background: a.stripe,
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: a.bg, border: `1px solid ${a.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={16} color={a.text} />
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '36px', fontWeight: 900, color: a.stripe,
          letterSpacing: '-0.04em', lineHeight: 1,
        }}>
          {value ?? '—'}
        </span>
        {unit && (
          <span style={{ fontSize: '14px', color: 'var(--text-3)', fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle / trend */}
      {(subtitle || trend !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          {trend !== undefined && trend !== null && (
            <span style={{
              color: trend > 0 ? 'var(--green)' : 'var(--red)',
              fontWeight: 700,
              background: trend > 0 ? 'var(--green-light)' : 'var(--red-light)',
              padding: '1px 6px', borderRadius: '4px',
              fontSize: '11px',
            }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {subtitle && (
            <span style={{ color: 'var(--text-3)' }}>{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
