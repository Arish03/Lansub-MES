import React, { useState } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'

/* ─── Sensor config matching Lansub LANWi diagram exactly ─── */
const SENSORS = [
  // Motor sensors
  { id: 'M1',  label: 'Motor NDE',    asset: 'MOTOR_01',      sKey: 'M1',  x: 108, y: 88,  group: 'MOTOR' },
  { id: 'M2',  label: 'Motor DE',     asset: 'MOTOR_01',      sKey: 'M2',  x: 178, y: 88,  group: 'MOTOR' },
  // Coupling
  { id: 'CP1', label: 'Coupling',     asset: 'COMPRESSOR_01', sKey: 'CP1', x: 248, y: 110, group: 'COUPLING' },
  // Gearbox
  { id: 'G1',  label: 'GB Input',     asset: 'GEARBOX_01',    sKey: 'G1',  x: 330, y: 88,  group: 'GEARBOX' },
  { id: 'G2',  label: 'GB Output',    asset: 'GEARBOX_01',    sKey: 'G2',  x: 400, y: 88,  group: 'GEARBOX' },
  // Drive-End
  { id: 'CP2', label: 'Drive-End',    asset: 'COMPRESSOR_01', sKey: 'CP2', x: 470, y: 110, group: 'COUPLING' },
  // Compressor
  { id: 'C1',  label: 'Comp DE',      asset: 'COMPRESSOR_01', sKey: 'C1',  x: 560, y: 88,  group: 'COMPRESSOR' },
  { id: 'C2',  label: 'Comp NDE',     asset: 'COMPRESSOR_01', sKey: 'C2',  x: 635, y: 88,  group: 'COMPRESSOR' },
]

const GROUP_COLORS = {
  MOTOR:      { fill: '#dbeafe', stroke: '#2563eb', label: '#1d4ed8', dot: '#2563eb' },
  COUPLING:   { fill: '#f3e8ff', stroke: '#7c3aed', label: '#6d28d9', dot: '#7c3aed' },
  GEARBOX:    { fill: '#fef3c7', stroke: '#d97706', label: '#b45309', dot: '#d97706' },
  COMPRESSOR: { fill: '#fee2e2', stroke: '#e63946', label: '#b91c1c', dot: '#e63946' },
}

function getSensorVal(telemetry, sensor) {
  const d = telemetry[sensor.asset]?.sensors
  if (!d) return null
  return d[sensor.sKey] ?? null
}

function getStatus(sdata) {
  if (!sdata) return 'offline'
  const v = sdata.vibration_rms
  const t = sdata.temperature_c
  if ((v && v >= 11.2) || (t && t >= 95)) return 'critical'
  if ((v && v >= 7.1) || (t && t >= 80)) return 'warning'
  return 'good'
}

const STATUS_DOT = { good: '#16a34a', warning: '#d97706', critical: '#e63946', offline: '#9ca3af' }

/* ─── SVG Schematic ─────────────────────────────────────── */
function SchematicDiagram({ telemetry, activeSensor, onSelect }) {
  return (
    <svg viewBox="0 0 760 220" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        {/* Motor body gradient */}
        <linearGradient id="motorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="gearGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fecaca" />
          <stop offset="100%" stopColor="#f87171" />
        </linearGradient>
        <linearGradient id="shaftGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
        <AnimatePulse />
      </defs>

      {/* ── Section labels ── */}
      {[
        { label: 'MOTOR',      x: 143, color: '#1d4ed8' },
        { label: 'GEARBOX',   x: 365, color: '#b45309' },
        { label: 'COMPRESSOR',x: 597, color: '#b91c1c' },
      ].map(s => (
        <text key={s.label} x={s.x} y={16} textAnchor="middle"
          fontSize="9" fontWeight="800" fill={s.color} letterSpacing="1.5">
          {s.label}
        </text>
      ))}

      {/* ── Main shaft (connecting rod) ── */}
      <rect x="90" y="113" width="580" height="10" fill="url(#shaftGrad)" stroke="#94a3b8" strokeWidth="0.5" rx="2" />

      {/* ── MOTOR body ── */}
      <rect x="75" y="50" width="180" height="78" rx="8" fill="url(#motorGrad)" stroke="#3b82f6" strokeWidth="1.5" filter="url(#shadow)" />
      {/* Motor fins */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={77} y={52 + i*10} width={176} height="6" fill="rgba(147,197,253,0.5)" rx="1" />
      ))}
      {/* Motor label */}
      <text x="165" y="100" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e40af">Electric Motor</text>
      <text x="165" y="113" textAnchor="middle" fontSize="8" fill="#3b82f6">1480 RPM | 132kW</text>
      {/* Motor end caps */}
      <rect x="75" y="60" width="16" height="58" rx="3" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
      <rect x="239" y="60" width="16" height="58" rx="3" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />

      {/* ── COUPLING 1 ── */}
      <rect x="258" y="98" width="30" height="26" rx="4" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.5" />
      <text x="273" y="113" textAnchor="middle" fontSize="7" fontWeight="700" fill="#6d28d9">CPL</text>

      {/* ── GEARBOX body ── */}
      <rect x="300" y="55" width="155" height="72" rx="8" fill="url(#gearGrad)" stroke="#d97706" strokeWidth="1.5" filter="url(#shadow)" />
      {/* Gear teeth suggestion */}
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={305 + i*22} y={58} width="14" height="8" rx="2" fill="rgba(251,191,36,0.6)" />
      ))}
      <text x="377" y="100" textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400e">Gearbox</text>
      <text x="377" y="113" textAnchor="middle" fontSize="8" fill="#b45309">Ratio 3.2:1</text>

      {/* ── COUPLING 2 ── */}
      <rect x="462" y="98" width="30" height="26" rx="4" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.5" />
      <text x="477" y="113" textAnchor="middle" fontSize="7" fontWeight="700" fill="#6d28d9">CPL</text>

      {/* ── COMPRESSOR body ── */}
      <rect x="500" y="50" width="168" height="78" rx="8" fill="url(#compGrad)" stroke="#e63946" strokeWidth="1.5" filter="url(#shadow)" />
      {/* Compressor volutes */}
      {[0,1,2].map(i => (
        <ellipse key={i} cx={516 + i * 45} cy={89} rx={16} ry={28} fill="rgba(248,113,113,0.3)" stroke="rgba(220,38,38,0.3)" strokeWidth="1" />
      ))}
      <text x="584" y="100" textAnchor="middle" fontSize="10" fontWeight="700" fill="#991b1b">Compressor</text>
      <text x="584" y="113" textAnchor="middle" fontSize="8" fill="#b91c1c">12.5 bar | 850 m³/h</text>
      {/* Inlet/Outlet pipes */}
      <rect x="500" y="78" width="14" height="18" rx="2" fill="#fca5a5" stroke="#e63946" strokeWidth="1" />
      <rect x="655" y="78" width="14" height="18" rx="2" fill="#fca5a5" stroke="#e63946" strokeWidth="1" />
      <text x="507" y="108" fontSize="7" fill="#b91c1c">IN</text>
      <text x="659" y="108" fontSize="7" fill="#b91c1c">OUT</text>

      {/* ── Sensor badges ── */}
      {SENSORS.map(sensor => {
        const sdata = getSensorVal(telemetry, sensor)
        const status = getStatus(sdata)
        const dotColor = STATUS_DOT[status]
        const gc = GROUP_COLORS[sensor.group]
        const isActive = activeSensor?.id === sensor.id
        const vib = sdata?.vibration_rms

        return (
          <g key={sensor.id} onClick={() => onSelect(sensor)} style={{ cursor: 'pointer' }}>
            {/* Connector line from sensor to shaft */}
            <line
              x1={sensor.x} y1={sensor.y + 18}
              x2={sensor.x} y2={118}
              stroke={dotColor} strokeWidth="1" strokeDasharray="3,2" opacity="0.6"
            />

            {/* Badge background */}
            <rect
              x={sensor.x - 26} y={sensor.y - 18}
              width="52" height="36" rx="6"
              fill={isActive ? gc.stroke : gc.fill}
              stroke={gc.stroke} strokeWidth={isActive ? 2 : 1}
              filter={isActive ? "url(#shadow)" : "none"}
            />

            {/* Sensor ID */}
            <text
              x={sensor.x} y={sensor.y - 4}
              textAnchor="middle" fontSize="9" fontWeight="800"
              fill={isActive ? '#fff' : gc.label}>
              {sensor.id}
            </text>

            {/* Live value */}
            <text
              x={sensor.x} y={sensor.y + 8}
              textAnchor="middle" fontSize="8" fontWeight="500"
              fill={isActive ? 'rgba(255,255,255,0.9)' : '#374151'}>
              {vib !== null && vib !== undefined ? `${vib.toFixed(1)} mm/s` : '— mm/s'}
            </text>

            {/* Status dot */}
            <circle
              cx={sensor.x + 20} cy={sensor.y - 14}
              r="5" fill={dotColor}
              opacity={status === 'offline' ? 0.4 : 1}>
              {status !== 'offline' && (
                <animate attributeName="opacity" values="1;0.3;1" dur={status === 'critical' ? '0.8s' : '2.5s'} repeatCount="indefinite" />
              )}
            </circle>

            {/* WiFi sensor antenna (matching Lansub diagram) */}
            <g opacity={status === 'offline' ? 0.3 : 0.7}>
              <path
                d={`M${sensor.x-4},${sensor.y-22} Q${sensor.x},${sensor.y-28} ${sensor.x+4},${sensor.y-22}`}
                fill="none" stroke={gc.stroke} strokeWidth="1.2" strokeLinecap="round"
              />
              <path
                d={`M${sensor.x-7},${sensor.y-25} Q${sensor.x},${sensor.y-33} ${sensor.x+7},${sensor.y-25}`}
                fill="none" stroke={gc.stroke} strokeWidth="1.2" strokeLinecap="round"
              />
            </g>
          </g>
        )
      })}

      {/* ── Wireless gateway icon ── */}
      <rect x="695" y="70" width="50" height="60" rx="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
      <text x="720" y="95" textAnchor="middle" fontSize="7" fontWeight="700" fill="#475569">WIFI</text>
      <text x="720" y="107" textAnchor="middle" fontSize="7" fill="#94a3b8">GW</text>
      {/* wifi arcs */}
      {[8,14,20].map(r => (
        <path key={r} d={`M${720-r},${88} Q${720},${88-r} ${720+r},${88}`}
          fill="none" stroke="#2563eb" strokeWidth="1" opacity={1 - r/28}>
          <animate attributeName="opacity" values={`${1-r/28};0.1;${1-r/28}`} dur="2s" repeatCount="indefinite" begin={`${r/10}s`} />
        </path>
      ))}
      {/* connection arrow */}
      <line x1="668" y1="97" x2="693" y2="97" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2" markerEnd="url(#arrow)" />

      {/* ── Legend row at bottom ── */}
      {[
        { label: 'Normal', color: '#16a34a' },
        { label: 'Warning', color: '#d97706' },
        { label: 'Critical', color: '#e63946' },
        { label: 'Offline', color: '#9ca3af' },
      ].map((s, i) => (
        <g key={s.label}>
          <circle cx={10 + i * 65} cy={205} r="5" fill={s.color} />
          <text x={20 + i * 65} y={209} fontSize="8" fill="#6b7280" fontWeight="500">{s.label}</text>
        </g>
      ))}
      <text x="750" y="209" textAnchor="end" fontSize="7" fill="#9ca3af">LANSUB SCADA</text>
    </svg>
  )
}

/* dummy component for defs */
function AnimatePulse() { return null }

/* ─── Sensor Detail Panel ─────────────────────────────── */
function SensorDetailPanel({ sensor, telemetry, onClose }) {
  if (!sensor) return null
  const sdata = getSensorVal(telemetry, sensor)
  const assetData = telemetry[sensor.asset]
  const status = getStatus(sdata)
  const gc = GROUP_COLORS[sensor.group]
  const statusColors = { good: 'var(--green)', warning: 'var(--amber)', critical: 'var(--red)', offline: 'var(--text-3)' }
  const statusBg = { good: 'var(--green-light)', warning: 'var(--amber-light)', critical: 'var(--red-light)', offline: 'var(--surface-2)' }

  return (
    <div style={{
      background: '#fff', border: `2px solid ${gc.stroke}`,
      borderRadius: '14px', padding: '18px',
      animation: 'fadeIn 0.2s ease',
      minWidth: '220px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: gc.fill, border: `1.5px solid ${gc.stroke}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 900, color: gc.label,
            }}>{sensor.id}</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{sensor.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{sensor.asset}</div>
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-3)', lineHeight: 1 }}>×</button>
      </div>

      {/* Status */}
      <div style={{
        padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
        background: statusBg[status], border: `1px solid ${gc.stroke}22`,
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: statusColors[status], textTransform: 'uppercase' }}>
          {status === 'good' ? '✅ Normal' : status === 'warning' ? '⚠️ Warning' : status === 'critical' ? '🚨 Critical' : '○ Offline'}
        </span>
      </div>

      {/* Values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'VIBRATION', value: sdata?.vibration_rms?.toFixed(3), unit: 'mm/s RMS', color: status === 'critical' ? 'var(--red)' : status === 'warning' ? 'var(--amber)' : 'var(--text-1)' },
          { label: 'TEMPERATURE', value: sdata?.temperature_c?.toFixed(1), unit: '°C', color: sdata?.temperature_c >= 80 ? 'var(--red)' : 'var(--text-1)' },
          sdata?.vibration_x !== undefined ? { label: 'VIB X', value: sdata?.vibration_x?.toFixed(3), unit: 'mm/s', color: 'var(--text-2)' } : null,
          sdata?.vibration_z !== undefined ? { label: 'VIB Z', value: sdata?.vibration_z?.toFixed(3), unit: 'mm/s', color: 'var(--text-2)' } : null,
        ].filter(Boolean).map(({ label, value, unit, color }) => (
          <div key={label} style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '8px' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: value ? color : 'var(--text-3)', lineHeight: 1 }}>{value ?? '—'}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '1px' }}>{unit}</div>
          </div>
        ))}
      </div>

      {/* Asset fault */}
      {assetData?.fault_type && assetData.fault_type !== 'none' && (
        <div style={{ padding: '8px', background: 'var(--red-light)', borderRadius: '8px', border: '1px solid var(--red-mid)', fontSize: '11px' }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: '2px' }}>🔴 Active Fault</div>
          <div style={{ color: 'var(--text-2)' }}>{assetData.fault_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
          {assetData.rul_days && <div style={{ color: 'var(--amber)', marginTop: '3px', fontWeight: 600 }}>RUL: {assetData.rul_days} days</div>}
        </div>
      )}
    </div>
  )
}

/* ─── Health Bar ─────────────────────────────────────── */
function HealthBar({ label, assetId, telemetry }) {
  const d = telemetry[assetId]
  const health = d?.health_score ?? 100
  const fault = d?.fault_type ?? 'none'
  const color = health >= 80 ? '#16a34a' : health >= 50 ? '#d97706' : '#e63946'
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
          {fault !== 'none' && <div style={{ fontSize: '9px', color: 'var(--red)', fontWeight: 600 }}>{fault.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</div>}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 900, color }}>{health.toFixed(0)}%</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-2)', borderRadius: '3px' }}>
        <div style={{ height: '100%', width: `${health}%`, background: color, borderRadius: '3px', transition: 'width 600ms ease' }} />
      </div>
    </div>
  )
}

const SketchfabViewer = React.memo(() => {
  return (
    <iframe
      title="Industrial Machinery 3D"
      frameBorder="0"
      allowFullScreen
      allow="autoplay; fullscreen; xr-spatial-tracking"
      style={{ width: '100%', height: '320px', border: 'none', display: 'block', background: '#f8fafc' }}
      src="https://sketchfab.com/models/898a8e389c6a449f9a8b1c11eae5fd50/embed?ui_theme=light&autostart=1&autospin=0.15&ui_infos=0&ui_controls=1&ui_stop=0&preload=1&dnt=1"
    />
  )
})

/* ─── Main SCADA Component ─────────────────────────────── */
export default function ScadaViewer({ height = '520px' }) {
  const { latestTelemetry } = useWebSocket()
  const [activeSensor, setActiveSensor] = useState(null)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #1a2742 0%, #2d3f6b 100%)',
        borderBottom: '2px solid #e63946',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', animation: 'pulse-dot 2s infinite', boxShadow: '0 0 8px #16a34a' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
            LANSUB SCADA — GAS COMPRESSOR TRAIN
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          <span>8 Sensor Points</span>
          <span>·</span>
          <span>LANWi Wireless Mesh</span>
          <span>·</span>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>● LIVE</span>
        </div>
      </div>

      {/* Main area: Sketchfab 3D + SVG side-by-side OR stacked */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Left: Sketchfab 3D model */}
        <div style={{ position: 'relative', borderRight: '1px solid var(--border)' }}>
          <div style={{
            position: 'absolute', top: '8px', left: '8px', zIndex: 10,
            background: 'rgba(26,39,66,0.85)', color: '#fff',
            fontSize: '10px', fontWeight: 700, padding: '4px 10px',
            borderRadius: '6px', letterSpacing: '0.05em',
          }}>
            3D MODEL — MACHINERY
          </div>
          <SketchfabViewer />
        </div>

        {/* Right: SVG schematic (fixed, never rotates) + sensor detail panel */}
        <div style={{ padding: '16px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeSensor ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                SENSOR DETAIL
              </div>
              <SensorDetailPanel
                sensor={activeSensor}
                telemetry={latestTelemetry}
                onClose={() => setActiveSensor(null)}
              />
              <button
                onClick={() => setActiveSensor(null)}
                style={{
                  padding: '7px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--surface)', cursor: 'pointer', fontSize: '12px',
                  color: 'var(--text-2)', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                }}
              >
                ← Back to Schematic
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                CLICK A SENSOR FOR LIVE DATA
              </div>
              {/* Sensor grid cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {SENSORS.map(sensor => {
                  const sdata = getSensorVal(latestTelemetry, sensor)
                  const status = getStatus(sdata)
                  const gc = GROUP_COLORS[sensor.group]
                  const dotColor = STATUS_DOT[status]
                  const vib = sdata?.vibration_rms
                  return (
                    <div
                      key={sensor.id}
                      onClick={() => setActiveSensor(sensor)}
                      style={{
                        background: '#fff', border: `1.5px solid ${gc.stroke}55`,
                        borderLeft: `4px solid ${gc.stroke}`,
                        borderRadius: '8px', padding: '8px',
                        cursor: 'pointer', transition: 'all 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 3px 10px ${gc.stroke}22`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: gc.label }}>{sensor.id}</span>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor }}>
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px' }}>{sensor.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: status === 'critical' ? 'var(--red)' : status === 'warning' ? 'var(--amber)' : 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {vib !== null && vib !== undefined ? `${vib.toFixed(2)}` : '—'}
                        <span style={{ fontSize: '9px', fontWeight: 400, color: 'var(--text-3)', fontFamily: 'Inter, sans-serif' }}> mm/s</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-width SVG schematic */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          GAS COMPRESSOR TRAIN — SENSOR SCHEMATIC
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-2)' }}>
          <SchematicDiagram
            telemetry={latestTelemetry}
            activeSensor={activeSensor}
            onSelect={s => setActiveSensor(prev => prev?.id === s.id ? null : s)}
          />
        </div>
      </div>

      {/* Equipment health bars */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          EQUIPMENT HEALTH SCORES
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <HealthBar label="Electric Motor" assetId="MOTOR_01" telemetry={latestTelemetry} />
          <div style={{ width: '1px', background: 'var(--border)' }} />
          <HealthBar label="Gearbox" assetId="GEARBOX_01" telemetry={latestTelemetry} />
          <div style={{ width: '1px', background: 'var(--border)' }} />
          <HealthBar label="Compressor" assetId="COMPRESSOR_01" telemetry={latestTelemetry} />
        </div>
      </div>
    </div>
  )
}
