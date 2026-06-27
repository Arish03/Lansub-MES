import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Animated counter hook ─────────────────────────────── */
function useCounter(target, duration = 2000, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return val
}

const STATS = [
  { value: 200000, suffix: 'hrs',  label: 'Design Life Monitored',  color: '#e63946' },
  { value: 8,      suffix: '+',    label: 'Sensor Points Per Train', color: '#2563eb' },
  { value: 99.2,   suffix: '%',    label: 'Platform Uptime',         color: '#16a34a', decimal: 1 },
  { value: 35,     suffix: '%',    label: 'OPEX Reduction Target',   color: '#d97706' },
]

const FEATURES = [
  {
    icon: '🏭',
    title: 'Digital Twin Engine',
    desc: 'Real-time digital replica of Motor, Gearbox, Compressor, Pump & Turbine with physics-based simulation and OEM datasheet integration.',
    color: '#e63946',
  },
  {
    icon: '⚡',
    title: 'Predictive AI',
    desc: 'Weibull-based failure probability, bearing defect frequency analysis, and AI-powered RUL prediction with 30-day advance warning.',
    color: '#2563eb',
  },
  {
    icon: '📊',
    title: 'OEE & Energy Analytics',
    desc: 'Real-time OEE (Availability × Performance × Quality), power consumption monitoring (√3×V×I×PF/1000), and energy cost analysis.',
    color: '#16a34a',
  },
  {
    icon: '🔩',
    title: 'Asset Aging Model',
    desc: 'ISO 13379 compliant aging calculation: Running Hours / Design Life × 100. Component-level RUL for bearings, gears, impellers and stator.',
    color: '#7c3aed',
  },
  {
    icon: '📡',
    title: 'Multi-Protocol Ingestion',
    desc: 'OPC UA, Modbus TCP, MQTT, REST API, CSV Upload, SCADA and PLC integration with real-time data normalization and validation.',
    color: '#d97706',
  },
  {
    icon: '🛡️',
    title: 'ISO 10816 Compliance',
    desc: 'Automated vibration severity assessment (Zones A-D), temperature trending, and alarm escalation per international standards.',
    color: '#0891b2',
  },
]

const ASSETS_COVERED = [
  { icon: '⚡', name: 'Electric Motors',    color: '#2563eb', bg: '#eff6ff',  items: ['ABB', 'Siemens', 'WEG'] },
  { icon: '⚙️', name: 'Gearboxes',          color: '#d97706', bg: '#fffbeb',  items: ['Flender', 'SEW', 'Renk'] },
  { icon: '🔧', name: 'Gas Compressors',    color: '#e63946', bg: '#fff0f1',  items: ['Siemens', 'GE', 'Atlas'] },
  { icon: '💧', name: 'Pumps',              color: '#0891b2', bg: '#ecfeff',  items: ['Sulzer', 'KSB', 'Flowserve'] },
  { icon: '🌬️', name: 'Blowers & Fans',     color: '#16a34a', bg: '#f0fdf4',  items: ['HOWDEN', 'TLT', 'Clarage'] },
  { icon: '🔥', name: 'Turbines',           color: '#7c3aed', bg: '#f5f3ff',  items: ['GE', 'Siemens', 'Solar'] },
]

const METRICS = [
  { label: 'Asset Aging Index',      formula: 'RH / DLH × 100',    color: '#e63946' },
  { label: 'Remaining Useful Life',  formula: 'DLH − Running Hrs',  color: '#2563eb' },
  { label: 'Health Index (6-factor)',formula: 'Vib·Temp·Pwr·Brg·Lub·Age', color: '#16a34a' },
  { label: 'OEE',                    formula: 'A × P × Q',          color: '#d97706' },
  { label: 'Failure Probability',    formula: 'Weibull (β=2.5)',     color: '#7c3aed' },
  { label: 'MTBF / MTTR',           formula: 'TOT / N failures',    color: '#0891b2' },
]

const PROTOCOLS = [
  { name: 'OPC UA',   icon: '📡', bg: '#eff6ff', color: '#2563eb' },
  { name: 'Modbus TCP', icon: '🔌', bg: '#f0fdf4', color: '#16a34a' },
  { name: 'MQTT',     icon: '📶', bg: '#fff0f1', color: '#e63946' },
  { name: 'REST API', icon: '🌐', bg: '#f5f3ff', color: '#7c3aed' },
  { name: 'CSV Upload', icon: '📂', bg: '#fffbeb', color: '#d97706' },
  { name: 'SCADA',    icon: '🖥️', bg: '#ecfeff', color: '#0891b2' },
  { name: 'PLC',      icon: '⚙️', bg: '#fdf2f8', color: '#be185d' },
]

export default function Landing() {
  const navigate = useNavigate()
  const statsRef = useRef(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true) }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => { obs.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [])

  const c0 = useCounter(STATS[0].value, 2200, statsVisible)
  const c1 = useCounter(STATS[1].value, 1500, statsVisible)
  const c2 = useCounter(99, 1800, statsVisible)
  const c3 = useCounter(STATS[3].value, 1600, statsVisible)
  const counters = [c0, c1, c2, c3]

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8fafc', overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrollY > 40 ? 'rgba(255,255,255,0.97)' : 'transparent',
        backdropFilter: scrollY > 40 ? 'blur(12px)' : 'none',
        borderBottom: scrollY > 40 ? '1px solid #e8ecf0' : 'none',
        transition: 'all 300ms ease',
        padding: '0 48px',
        height: '68px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/lansub_logo.png" alt="Lansub Technologies" style={{ height: '38px', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '9px 22px', borderRadius: '8px', border: '1.5px solid #e63946',
              background: 'transparent', color: '#e63946', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
              transition: 'all 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e63946'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e63946' }}
          >Sign In</button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '9px 22px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #e63946, #f4814a)',
              color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 12px rgba(230,57,70,0.35)',
              transition: 'all 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(230,57,70,0.45)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(230,57,70,0.35)' }}
          >Launch Platform →</button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #0f2847 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '100px 48px 80px',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Animated grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '900px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.3)',
            borderRadius: '999px', padding: '6px 18px', marginBottom: '28px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e63946', animation: 'pulse-dot 2s infinite' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fca5a5', letterSpacing: '0.08em' }}>
              DIGITAL TWIN · PREDICTIVE MAINTENANCE · OIL & GAS
            </span>
          </div>

          {/* Logo */}
          <div style={{ marginBottom: '24px' }}>
            <img src="/lansub_logo.png" alt="Lansub Technologies"
              style={{ height: '64px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900, color: '#fff',
            lineHeight: 1.1, letterSpacing: '-0.03em',
            marginBottom: '20px',
          }}>
            Asset Reliability &{' '}
            <span style={{ background: 'linear-gradient(135deg, #e63946, #f4814a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Predictive Maintenance
            </span>
            {' '}Platform
          </h1>
          <p style={{
            fontSize: '18px', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, maxWidth: '680px', margin: '0 auto 40px',
          }}>
            Digital Twin–powered condition monitoring for Gas Compressors, Electric Motors, Gearboxes,
            Pumps, Blowers and Turbines. From OEM datasheet to real-time AI predictions.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '15px 36px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #e63946, #f4814a)',
                color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 8px 28px rgba(230,57,70,0.4)',
                transition: 'all 250ms', fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(230,57,70,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(230,57,70,0.4)' }}
            >Launch Platform →</button>
            <button
              style={{
                padding: '15px 36px', borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)',
                color: '#fff', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                backdropFilter: 'blur(8px)', fontFamily: 'Inter, sans-serif',
                transition: 'all 250ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >View Brochure</button>
          </div>

          {/* Protocol badges */}
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {PROTOCOLS.map(p => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '5px 12px', fontSize: '12px',
                color: 'rgba(255,255,255,0.7)', fontWeight: 500,
              }}>
                <span>{p.icon}</span> {p.name}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', animation: 'fadeIn 1s ease 1s both' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>SCROLL TO EXPLORE</span>
            <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }} />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────── */}
      <section ref={statsRef} style={{
        background: '#fff', padding: '80px 48px',
        borderBottom: '1px solid #e8ecf0',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '54px', fontWeight: 900, color: s.color,
                letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '8px',
              }}>
                {counters[i].toLocaleString()}{s.suffix}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────── */}
      <section style={{ padding: '100px 48px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <SectionLabel>PLATFORM CAPABILITIES</SectionLabel>
          <h2 style={{ fontSize: '40px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '14px' }}>
            Everything you need for<br />predictive reliability
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '64px', maxWidth: '600px' }}>
            Built specifically for Oil & Gas rotating equipment. From motor datasheet to failure prediction in one integrated platform.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {FEATURES.map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HEALTH INDEX FORMULA ──────────────────────── */}
      <section style={{ padding: '100px 48px', background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <SectionLabel light>RELIABILITY CALCULATIONS</SectionLabel>
          <h2 style={{ fontSize: '40px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '14px' }}>
            6-Factor Health Index
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', marginBottom: '56px', maxWidth: '600px' }}>
            Weighted scoring model combining all critical machine health indicators into a single KPI.
          </p>

          {/* Health Index Formula Visual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
            <div>
              {[
                { label: 'Vibration (ISO 10816)', weight: 30, color: '#e63946' },
                { label: 'Temperature',           weight: 20, color: '#f4814a' },
                { label: 'Power Consumption',     weight: 15, color: '#2563eb' },
                { label: 'Bearing Condition',     weight: 15, color: '#7c3aed' },
                { label: 'Lubrication',           weight: 10, color: '#16a34a' },
                { label: 'Asset Ageing',          weight: 10, color: '#d97706' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: item.color }}>{item.weight}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${item.weight * 2.5}%`, background: item.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { range: '80–100', label: 'Excellent', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
                { range: '60–80',  label: 'Good',      color: '#2563eb', bg: 'rgba(37,99,235,0.15)' },
                { range: '40–60',  label: 'Poor',      color: '#d97706', bg: 'rgba(217,119,6,0.15)' },
                { range: '0–40',   label: 'Critical',  color: '#e63946', bg: 'rgba(230,57,70,0.15)' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}44`, borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.range}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              ))}

              {/* Aging formula */}
              <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>ASSET AGING FORMULA</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', color: '#fbbf24', marginBottom: '8px' }}>
                  Aging (%) = RH / DLH × 100
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  62,000 hrs / 200,000 hrs × 100 = <span style={{ color: '#fb923c', fontWeight: 700 }}>31%</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#86efac', marginTop: '4px' }}>
                  RUL = 200,000 − 62,000 = <span style={{ fontWeight: 700 }}>138,000 hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ASSET COVERAGE ────────────────────────────── */}
      <section style={{ padding: '100px 48px', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <SectionLabel>ASSET COVERAGE</SectionLabel>
          <h2 style={{ fontSize: '40px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '56px' }}>
            Every rotating asset,<br />fully monitored
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {ASSETS_COVERED.map(a => (
              <div key={a.name} style={{
                background: a.bg, border: `1px solid ${a.color}33`,
                borderRadius: '18px', padding: '28px',
                borderTop: `4px solid ${a.color}`,
                transition: 'all 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${a.color}20` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{a.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>{a.name}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {a.items.map(item => (
                    <span key={item} style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                      background: `${a.color}18`, color: a.color, borderRadius: '999px',
                      border: `1px solid ${a.color}33`,
                    }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METRICS PREVIEW ───────────────────────────── */}
      <section style={{ padding: '100px 48px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <SectionLabel>CALCULATED KPIs</SectionLabel>
          <h2 style={{ fontSize: '40px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '56px' }}>
            10 reliability metrics,<br />calculated automatically
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {METRICS.map((m, i) => (
              <div key={m.label} style={{
                background: '#fff', border: '1px solid #e8ecf0',
                borderRadius: '14px', padding: '22px',
                borderLeft: `4px solid ${m.color}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  KPI {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>{m.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: m.color, background: `${m.color}10`, padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                  {m.formula}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section style={{
        padding: '100px 48px',
        background: 'linear-gradient(160deg, #e63946 0%, #f4814a 100%)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '16px' }}>
            Ready to predict failures<br />before they happen?
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '40px' }}>
            Start monitoring your Gas Compressor Train today with the Lansub Asset Reliability Platform.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '16px 48px', borderRadius: '12px', border: 'none',
              background: '#fff', color: '#e63946', fontSize: '16px', fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              transition: 'all 250ms', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)' }}
          >Launch Platform →</button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer style={{ background: '#0f172a', padding: '40px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/lansub_logo.png" alt="Lansub Technologies"
              style={{ height: '32px', filter: 'brightness(0) invert(1)', opacity: 0.8, objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
            © {new Date().getFullYear()} Lansub Technologies. Asset Reliability Platform v2.0
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            ISO 13379 · ISO 10816 · ISO 55000
          </div>
        </div>
      </footer>

    </div>
  )
}

function SectionLabel({ children, light = false }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 800,
      color: light ? 'rgba(255,255,255,0.4)' : '#e63946',
      textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '14px',
    }}>{children}</div>
  )
}

function FeatureCard({ icon, title, desc, color }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', border: `1px solid ${hov ? color + '44' : '#e8ecf0'}`,
        borderRadius: '18px', padding: '28px',
        transition: 'all 250ms ease',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov ? `0 16px 40px ${color}18` : '0 2px 8px rgba(0,0,0,0.05)',
        cursor: 'default',
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: `${color}12`, border: `1.5px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', marginBottom: '16px',
        transition: 'all 250ms',
        transform: hov ? 'scale(1.1)' : 'scale(1)',
      }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.65' }}>{desc}</p>
    </div>
  )
}
