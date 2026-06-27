import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { assetsApi } from '../services/api'
import { useWebSocket } from '../contexts/WebSocketContext'
import { AlertTriangle, CheckCircle, ChevronRight, Cpu } from 'lucide-react'

function HealthRing({ score, size = 60 }) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#e63946'
  const r = 22, c = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-2)" strokeWidth="5" />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 600ms ease' }}
      />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${c}px ${c}px`, fill: color, fontSize: '10px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
        {score?.toFixed(0)}%
      </text>
    </svg>
  )
}

const ASSET_ICONS = { MOTOR: '⚡', GEARBOX: '⚙️', COMPRESSOR: '🔧' }

export default function Assets() {
  const { latestTelemetry } = useWebSocket()
  const [assets, setAssets] = useState([])

  useEffect(() => {
    assetsApi.list().then(({ data }) => setAssets(data)).catch(() => {})
  }, [])

  const enrichedAssets = assets.map(a => ({
    ...a,
    health_score: latestTelemetry[a.asset_id]?.health_score ?? a.health_score ?? 100,
    fault_type:   latestTelemetry[a.asset_id]?.fault_type   ?? 'none',
  }))

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>
          Gas Compressor Train — {assets.length} assets under continuous monitoring
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {enrichedAssets.map(asset => {
          const health = asset.health_score ?? 100
          const fault  = asset.fault_type ?? 'none'
          const color  = health >= 80 ? 'var(--green)' : health >= 50 ? 'var(--amber)' : 'var(--red)'
          const bg     = health >= 80 ? 'var(--green-light)' : health >= 50 ? 'var(--amber-light)' : 'var(--red-light)'
          const border = health >= 80 ? 'var(--green-mid)' : health >= 50 ? 'var(--amber-mid)' : 'var(--red-mid)'
          const statusLabel = health >= 80 ? 'Good' : health >= 50 ? 'Degraded' : 'Critical'
          const live = latestTelemetry[asset.asset_id]

          return (
            <Link key={asset.asset_id} to={`/assets/${asset.asset_id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-lg)',
                borderTop: `4px solid ${color}`,
                padding: '22px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>{ASSET_ICONS[asset.asset_type] || '🏭'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '2px' }}>{asset.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{asset.manufacturer} · {asset.model}</div>
                  </div>
                  <HealthRing score={health} />
                </div>

                {/* Status badge */}
                <div style={{ marginBottom: '14px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 12px',
                    background: bg, color, border: `1px solid ${border}`,
                    borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{statusLabel}</span>
                </div>

                {/* Specs grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    ['Location', asset.location],
                    ['Installed', asset.installation_date ? asset.installation_date.split('T')[0] : '—'],
                    asset.rated_rpm    && ['Rated RPM', `${asset.rated_rpm} RPM`],
                    asset.rated_power_kw    && ['Power', `${asset.rated_power_kw} kW`],
                    asset.rated_flow_m3h    && ['Flow Rate', `${asset.rated_flow_m3h} m³/h`],
                    asset.rated_pressure_bar && ['Pressure', `${asset.rated_pressure_bar} bar`],
                  ].filter(Boolean).slice(0, 4).map(([k, v]) => (
                    <div key={k} style={{ padding: '8px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{k}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Sensor points */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {asset.sensor_points?.map(sp => (
                    <span key={sp} style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 9px',
                      background: bg, color, border: `1px solid ${border}`,
                      borderRadius: '999px',
                    }}>{sp}</span>
                  ))}
                </div>

                {/* Live reading strip */}
                {live && (
                  <div style={{
                    padding: '8px 10px', background: 'var(--surface-2)', borderRadius: '8px',
                    border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    {live.sensors?.M1 && <div style={{ fontSize: '11px' }}><span style={{ color: 'var(--text-3)' }}>Vib: </span><strong style={{ color: 'var(--text-1)' }}>{live.sensors.M1.vibration_rms?.toFixed(2)} mm/s</strong></div>}
                    {live.sensors?.G1 && <div style={{ fontSize: '11px' }}><span style={{ color: 'var(--text-3)' }}>Vib: </span><strong style={{ color: 'var(--text-1)' }}>{live.sensors.G1.vibration_rms?.toFixed(2)} mm/s</strong></div>}
                    {live.sensors?.C1 && <div style={{ fontSize: '11px' }}><span style={{ color: 'var(--text-3)' }}>Vib: </span><strong style={{ color: 'var(--text-1)' }}>{live.sensors.C1.vibration_rms?.toFixed(2)} mm/s</strong></div>}
                    {live.sensors?.discharge_pressure_bar && <div style={{ fontSize: '11px' }}><span style={{ color: 'var(--text-3)' }}>Press: </span><strong style={{ color: 'var(--text-1)' }}>{live.sensors.discharge_pressure_bar?.toFixed(1)} bar</strong></div>}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fault !== 'none' ? (
                      <><AlertTriangle size={12} color="var(--red)" /><span style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>{fault.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</span></>
                    ) : (
                      <><CheckCircle size={12} color="var(--green)" /><span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>Normal</span></>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>
                    View details <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
