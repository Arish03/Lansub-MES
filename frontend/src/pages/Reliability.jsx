import React, { useEffect, useState } from 'react'
import { reliabilityApi } from '../services/api'
import { useWebSocket } from '../contexts/WebSocketContext'
import {
  RadialBarChart, RadialBar, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { AlertTriangle, CheckCircle, Zap, Clock, TrendingDown, Shield, Wrench } from 'lucide-react'

const ASSET_IDS = ['MOTOR_01', 'GEARBOX_01', 'COMPRESSOR_01']
const ASSET_NAMES = { MOTOR_01: 'Electric Motor', GEARBOX_01: 'Gearbox', COMPRESSOR_01: 'Compressor' }
const ASSET_ICONS = { MOTOR_01: '⚡', GEARBOX_01: '⚙️', COMPRESSOR_01: '🔧' }

const PRIORITY_COLORS = { CRITICAL: '#e63946', HIGH: '#d97706', MEDIUM: '#2563eb', LOW: '#16a34a' }
const RISK_COLORS = { Critical: '#e63946', High: '#d97706', Medium: '#2563eb', Low: '#16a34a' }

/* ── Circular gauge ─────────────────────── */
function GaugeRing({ value, max = 100, color, size = 120, label, unit }) {
  const r = size / 2 - 12
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const c = size / 2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-225deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-2)" strokeWidth="10"
          strokeDasharray={circ * 0.75} strokeDashoffset={0} strokeLinecap="round" />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${circ * 0.75 * pct} ${circ}`}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 800ms ease' }} />
        <text x={c} y={c + 4}
          style={{ transform: `rotate(225deg)`, transformOrigin: `${c}px ${c}px`, fill: color, fontSize: size / 7, fontWeight: 900, fontFamily: 'Inter, sans-serif', textAnchor: 'middle', dominantBaseline: 'middle' }}>
          {typeof value === 'number' ? value.toFixed(value >= 10 ? 1 : 2) : value}
        </text>
      </svg>
      {unit && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '-6px', fontWeight: 500 }}>{unit}</div>}
      {label && <div style={{ fontSize: '11px', color: 'var(--text-2)', textAlign: 'center', marginTop: '4px', fontWeight: 600 }}>{label}</div>}
    </div>
  )
}

/* ── Asset Reliability Card ─────────────── */
function ReliabilityCard({ assetId, data, onClick, isActive }) {
  if (!data) return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
      <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading...</div>
    </div>
  )

  const hi = data.health?.health_index ?? 0
  const aging = data.aging?.aging_pct ?? 0
  const rul = data.aging?.rul_years ?? 0
  const risk = data.failure_prediction?.risk_level ?? 'Low'
  const riskColor = RISK_COLORS[risk]
  const hiColor = hi >= 80 ? '#16a34a' : hi >= 60 ? '#2563eb' : hi >= 40 ? '#d97706' : '#e63946'

  return (
    <div
      onClick={() => onClick(assetId)}
      style={{
        background: 'var(--surface)', border: `1.5px solid ${isActive ? hiColor : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: '20px', cursor: 'pointer',
        transition: 'all 200ms ease', borderTop: `4px solid ${hiColor}`,
        boxShadow: isActive ? `0 8px 24px ${hiColor}22` : 'var(--shadow-sm)',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = 'var(--shadow)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '22px', marginBottom: '4px' }}>{ASSET_ICONS[assetId]}</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{ASSET_NAMES[assetId]}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{assetId}</div>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px',
          background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}33`,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{risk} Risk</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: 'Health Index', value: `${hi.toFixed(1)}%`, color: hiColor },
          { label: 'Aging', value: `${aging.toFixed(1)}%`, color: aging > 60 ? '#e63946' : aging > 40 ? '#d97706' : '#16a34a' },
          { label: 'RUL', value: `${rul.toFixed(1)} yrs`, color: rul < 2 ? '#e63946' : rul < 5 ? '#d97706' : '#16a34a' },
          { label: 'Fail. Prob.', value: `${data.failure_prediction?.failure_probability_pct?.toFixed(1) ?? 0}%`, color: riskColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Mini aging bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Design Life Consumed</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: hiColor }}>{aging.toFixed(1)}%</span>
        </div>
        <div style={{ height: '5px', background: 'var(--bg-2)', borderRadius: '3px' }}>
          <div style={{ height: '100%', width: `${aging}%`, background: `linear-gradient(90deg, #16a34a, ${hiColor})`, borderRadius: '3px' }} />
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px', fontFamily: 'JetBrains Mono, monospace' }}>
          {data.aging?.running_hours?.toLocaleString()} / {data.aging?.design_life_hours?.toLocaleString()} hrs
        </div>
      </div>
    </div>
  )
}

/* ── Detailed view ──────────────────────── */
function AssetDetail({ assetId, data }) {
  if (!data) return null
  const { aging, health, oee, energy, reliability, failure_prediction, recommendations } = data

  const hiColor = (health?.health_index ?? 0) >= 80 ? '#16a34a' : (health?.health_index ?? 0) >= 60 ? '#2563eb' : (health?.health_index ?? 0) >= 40 ? '#d97706' : '#e63946'
  const riskColor = RISK_COLORS[failure_prediction?.risk_level] || '#16a34a'

  const healthComponents = Object.entries(health?.components || {}).map(([k, v]) => ({
    name: k.replace('_score', '').replace('_', ' '),
    value: v,
    fill: v >= 80 ? '#16a34a' : v >= 60 ? '#2563eb' : v >= 40 ? '#d97706' : '#e63946',
  }))

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Top metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Health Index', value: health?.health_index?.toFixed(1), unit: '%', icon: Shield, color: hiColor, sub: health?.status },
          { label: 'OEE', value: oee?.oee_pct?.toFixed(1), unit: '%', icon: TrendingDown, color: oee?.world_class ? '#16a34a' : '#d97706', sub: oee?.world_class ? 'World Class ✅' : `Gap: ${oee?.gap_to_world_class}%` },
          { label: 'Running Hours', value: aging?.running_hours?.toLocaleString(), unit: 'hrs', icon: Clock, color: '#2563eb', sub: `${aging?.aging_pct?.toFixed(1)}% of design life` },
          { label: 'Power Usage', value: energy?.calculated_power_kw?.toFixed(1), unit: 'kW', icon: Zap, color: '#d97706', sub: `${energy?.energy_kwh?.toLocaleString()} kWh total` },
        ].map(({ label, value, unit, icon: Icon, color, sub }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', borderTop: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <Icon size={14} color={color} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value ?? '—'}<span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-3)', marginLeft: '3px' }}>{unit}</span></div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '5px' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Health Components Gauge */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '14px' }}>Health Components</div>
          {Object.entries(health?.components || {}).map(([k, v]) => {
            const c = v >= 80 ? '#16a34a' : v >= 60 ? '#2563eb' : v >= 40 ? '#d97706' : '#e63946'
            return (
              <div key={k} style={{ marginBottom: '9px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'capitalize' }}>{k.replace(/_score/, '').replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c }}>{v}%</span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg-2)', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${v}%`, background: c, borderRadius: '3px', transition: 'width 600ms ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* OEE Chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '14px' }}>OEE Breakdown</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '16px' }}>
            {[
              { label: 'Availability', val: oee?.availability_pct, color: '#2563eb' },
              { label: 'Performance',  val: oee?.performance_pct,  color: '#16a34a' },
              { label: 'Quality',      val: oee?.quality_pct,      color: '#7c3aed' },
            ].map(({ label, val, color }) => (
              <GaugeRing key={label} value={val ?? 0} color={color} size={80} label={label} unit="%" />
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '10px', background: oee?.world_class ? 'var(--green-light)' : 'var(--amber-light)', borderRadius: '10px', border: `1px solid ${oee?.world_class ? 'var(--green-mid)' : 'var(--amber-mid)'}` }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: oee?.world_class ? 'var(--green)' : 'var(--amber)' }}>{oee?.oee_pct?.toFixed(1)}%</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>OEE {oee?.world_class ? '✅ World Class' : `(target 85%)`}</div>
          </div>
        </div>

        {/* Aging & Reliability */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '14px' }}>Aging & Reliability</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Running Hours',   val: `${aging?.running_hours?.toLocaleString()} hrs`, color: '#2563eb' },
              { label: 'Design Life',     val: `${aging?.design_life_hours?.toLocaleString()} hrs`, color: '#6b7280' },
              { label: 'Aging',          val: `${aging?.aging_pct?.toFixed(1)}%`, color: aging?.aging_pct > 60 ? '#e63946' : '#d97706' },
              { label: 'RUL',            val: `${aging?.rul_hours?.toLocaleString()} hrs`, color: '#16a34a' },
              { label: 'RUL (days)',     val: `${aging?.rul_days?.toLocaleString()} days`, color: '#16a34a' },
              { label: 'Fail. Date',     val: aging?.predicted_failure, color: '#d97706' },
              { label: 'MTBF',           val: `${reliability?.mtbf_hours?.toFixed(0)} hrs`, color: '#2563eb' },
              { label: 'MTTR',           val: `${reliability?.mttr_hours?.toFixed(1)} hrs`, color: '#d97706' },
              { label: 'Availability',   val: `${reliability?.availability_pct?.toFixed(1)}%`, color: '#16a34a' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{val ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Failure Prediction + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
        {/* Failure Probability */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '14px' }}>Failure Prediction (Lansub AI)</div>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <GaugeRing
              value={failure_prediction?.failure_probability_pct ?? 0}
              color={riskColor} size={140}
              label="Failure Probability" unit="%"
            />
          </div>
          <div style={{ padding: '12px', background: `${riskColor}10`, border: `1px solid ${riskColor}33`, borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: riskColor }}>
              {failure_prediction?.risk_level} Risk
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
              Weibull β=2.5 · Aging={failure_prediction?.base_aging_probability?.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wrench size={13} /> Maintenance Recommendations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(recommendations || []).map((rec, i) => {
              const c = PRIORITY_COLORS[rec.priority] || '#6b7280'
              return (
                <div key={i} style={{ padding: '12px', background: `${c}08`, border: `1px solid ${c}33`, borderRadius: '10px', borderLeft: `4px solid ${c}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>{rec.action}</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: c, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{rec.priority}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '3px' }}>{rec.reason}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>⏱ {rec.timeframe}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────── */
export default function Reliability() {
  const [reliData, setReliData] = useState({})
  const [activeAsset, setActiveAsset] = useState('MOTOR_01')
  const [loading, setLoading] = useState(true)
  const { latestTelemetry } = useWebSocket()

  const fetchAll = async () => {
    try {
      const results = await Promise.all(ASSET_IDS.map(id => reliabilityApi.get(id)))
      const map = {}
      ASSET_IDS.forEach((id, i) => { map[id] = results[i].data })
      setReliData(map)
    } catch (e) {
      console.warn('Reliability API error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
          Digital Twin–powered reliability metrics: Aging, RUL, Health Index, OEE, MTBF/MTTR and AI Failure Prediction
        </p>
      </div>

      {/* Asset cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {ASSET_IDS.map(id => (
          <ReliabilityCard
            key={id}
            assetId={id}
            data={reliData[id]}
            onClick={setActiveAsset}
            isActive={activeAsset === id}
          />
        ))}
      </div>

      {/* Detailed view for selected asset */}
      {activeAsset && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '22px' }}>{ASSET_ICONS[activeAsset]}</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-1)' }}>{ASSET_NAMES[activeAsset]} — Digital Twin</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{activeAsset} · Predictive Maintenance Analysis</div>
            </div>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Loading reliability data...</div>
          ) : (
            <AssetDetail assetId={activeAsset} data={reliData[activeAsset]} />
          )}
        </div>
      )}
    </div>
  )
}
