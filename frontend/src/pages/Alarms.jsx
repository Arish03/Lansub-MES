import React, { useEffect, useState } from 'react'
import { alarmsApi } from '../services/api'
import { AlertTriangle, CheckCircle, RefreshCw, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function AlarmRow({ alarm, onAck }) {
  const cfg = {
    CRITICAL: { bg: 'var(--red-light)',   border: 'var(--red-mid)',   text: 'var(--red)',   iconBg: '#ffd6d8' },
    WARNING:  { bg: 'var(--amber-light)', border: 'var(--amber-mid)', text: 'var(--amber)', iconBg: '#fde68a' },
    INFO:     { bg: 'var(--blue-light)',  border: 'var(--blue-mid)',  text: 'var(--blue)',  iconBg: '#bfdbfe' },
  }
  const c = cfg[alarm.severity] || cfg.INFO

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '13px 16px',
      background: alarm.acknowledged ? 'var(--surface-2)' : c.bg,
      border: `1px solid ${alarm.acknowledged ? 'var(--border)' : c.border}`,
      borderRadius: '10px', marginBottom: '8px',
      opacity: alarm.acknowledged ? 0.65 : 1,
      transition: 'all 200ms ease',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: alarm.acknowledged ? 'var(--bg-2)' : c.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: alarm.severity === 'CRITICAL' && !alarm.acknowledged ? 'alarmPulse 1.5s infinite' : 'none',
      }}>
        <AlertTriangle size={16} color={alarm.acknowledged ? 'var(--text-3)' : c.text} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>
          {alarm.message}
        </div>
        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-3)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{alarm.asset_id}</span>
          <span>·</span>
          <span>{alarm.sensor_point}</span>
          <span>·</span>
          <span>{alarm.timestamp ? formatDistanceToNow(new Date(alarm.timestamp), { addSuffix: true }) : '—'}</span>
        </div>
      </div>

      <span style={{
        fontSize: '10px', fontWeight: 800, padding: '3px 10px',
        background: alarm.acknowledged ? 'var(--bg-2)' : c.iconBg,
        color: alarm.acknowledged ? 'var(--text-3)' : c.text,
        border: `1px solid ${alarm.acknowledged ? 'var(--border)' : c.border}`,
        borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
      }}>
        {alarm.severity}
      </span>

      {!alarm.acknowledged ? (
        <button
          onClick={() => onAck(alarm._id)}
          style={{
            padding: '6px 14px', borderRadius: '8px',
            border: '1px solid var(--green-mid)', background: 'var(--green-light)',
            color: 'var(--green)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, flexShrink: 0,
          }}
        >ACK</button>
      ) : (
        <CheckCircle size={16} color="var(--green)" style={{ flexShrink: 0 }} />
      )}
    </div>
  )
}

export default function Alarms() {
  const [alarms, setAlarms] = useState([])
  const [summary, setSummary] = useState({ critical_count: 0, warning_count: 0, total_unacknowledged: 0 })
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter !== 'ALL') params.severity = filter
      const [alarmRes, sumRes] = await Promise.all([
        alarmsApi.list({ ...params, limit: 100 }),
        alarmsApi.summary(),
      ])
      setAlarms(alarmRes.data)
      setSummary(sumRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t) }, [filter])

  const handleAck = async (id) => {
    await alarmsApi.acknowledge(id)
    await load()
  }

  return (
    <div className="animate-fade-in">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Critical Alarms',      value: summary.critical_count,         bg: 'var(--red-light)',   border: 'var(--red-mid)',   text: 'var(--red)',   stripe: '#e63946' },
          { label: 'Warning Alarms',        value: summary.warning_count,          bg: 'var(--amber-light)', border: 'var(--amber-mid)', text: 'var(--amber)', stripe: '#d97706' },
          { label: 'Total Unacknowledged',  value: summary.total_unacknowledged,   bg: 'var(--blue-light)',  border: 'var(--blue-mid)',  text: 'var(--blue)',  stripe: '#2563eb' },
        ].map(({ label, value, bg, border, text, stripe }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: `1px solid ${border}`,
            borderRadius: 'var(--radius-lg)', padding: '20px',
            borderTop: `4px solid ${stripe}`,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '40px', fontWeight: 900, color: text, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                background: filter === f ? 'var(--text-1)' : 'var(--surface)',
                color: filter === f ? '#fff' : 'var(--text-2)',
                fontWeight: 600, fontSize: '12px', border: '1px solid var(--border)',
                transition: 'var(--transition)',
              }}
            >{f}</button>
          ))}
        </div>
        <button onClick={load} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* List */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
        {alarms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '15px' }}>No alarms active</div>
            <div style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>All systems operating normally</div>
          </div>
        ) : (
          alarms.map(alarm => (
            <AlarmRow key={alarm._id} alarm={alarm} onAck={handleAck} />
          ))
        )}
      </div>
    </div>
  )
}
