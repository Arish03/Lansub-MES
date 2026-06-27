import React, { useEffect, useState } from 'react'
import { maintenanceApi } from '../services/api'
import { formatDistanceToNow, format } from 'date-fns'
import { PlusCircle, Wrench, CheckCircle2, AlertCircle, Search, Filter, X } from 'lucide-react'

const TYPE_CONFIG = {
  preventive: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: '🛡️ Preventive' },
  corrective:  { color: '#e63946', bg: '#fff0f1', border: '#ffd6d8', label: '🔧 Corrective' },
  predictive:  { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: '🤖 Predictive' },
  inspection:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: '🔍 Inspection' },
}

const PRIORITY_MAP = {
  corrective:  'HIGH',
  inspection:  'MEDIUM',
  preventive:  'LOW',
  predictive:  'LOW',
}

const ASSET_NAMES = { MOTOR_01: 'Electric Motor', GEARBOX_01: 'Gearbox', COMPRESSOR_01: 'Compressor' }

function MaintenanceRow({ record }) {
  const [expanded, setExpanded] = useState(false)
  const tc = TYPE_CONFIG[record.type] || TYPE_CONFIG.inspection

  return (
    <div style={{ border: `1px solid ${tc.border}`, borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', transition: 'all 200ms' }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '13px 16px', cursor: 'pointer',
          background: expanded ? tc.bg : '#fff',
          borderLeft: `4px solid ${tc.color}`,
          transition: 'background 150ms',
        }}
      >
        {/* Type badge */}
        <span style={{
          fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '999px',
          background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{tc.label}</span>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
            {record.title}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{ASSET_NAMES[record.asset_id] || record.asset_id}</span>
            <span>·</span>
            <span>{record.date}</span>
            <span>·</span>
            <span>{record.technician}</span>
            <span>·</span>
            <span>{record.duration_hours}h</span>
            {record.cost_usd > 0 && <><span>·</span><span style={{ color: '#d97706', fontWeight: 600 }}>${record.cost_usd?.toLocaleString()}</span></>}
          </div>
        </div>

        {/* Work order */}
        {record.work_order && (
          <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-3)', flexShrink: 0 }}>
            {record.work_order}
          </span>
        )}

        <span style={{ color: 'var(--text-3)', fontSize: '16px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '16px 20px', background: tc.bg, borderTop: `1px solid ${tc.border}`, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>DESCRIPTION</div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6' }}>{record.description}</p>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>FINDINGS</div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6' }}>{record.findings || 'No findings recorded'}</p>
            </div>
          </div>

          {record.parts_replaced?.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>PARTS REPLACED</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {record.parts_replaced.map((p, i) => (
                  <span key={i} style={{
                    fontSize: '11px', padding: '3px 10px', background: '#fff',
                    border: `1px solid ${tc.border}`, borderRadius: '6px', color: 'var(--text-2)',
                  }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
            {record.next_due_date && (
              <div style={{ color: 'var(--text-3)' }}>
                <strong>Next Due:</strong> <span style={{ color: tc.color, fontWeight: 700 }}>{record.next_due_date}</span>
              </div>
            )}
            {record.created_by && (
              <div style={{ color: 'var(--text-3)' }}>
                <strong>Created by:</strong> {record.created_by}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AddRecordModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    asset_id: 'MOTOR_01', type: 'preventive', title: '', description: '',
    technician: '', date: new Date().toISOString().split('T')[0],
    duration_hours: 4, cost_usd: 0, findings: '', next_due_date: '', work_order: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title || !form.description || !form.technician) {
      alert('Please fill in required fields: Title, Description, Technician')
      return
    }
    setSaving(true)
    try {
      await maintenanceApi.add(form)
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', opts = null) => (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{label}</label>
      {type === 'select' ? (
        <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'vertical' }} />
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px' }} />
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '28px', width: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)' }}>Add Maintenance Record</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '20px' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          {field('Asset', 'asset_id', 'select', [
            { v: 'MOTOR_01', l: 'Electric Motor' }, { v: 'GEARBOX_01', l: 'Gearbox' }, { v: 'COMPRESSOR_01', l: 'Compressor' }
          ])}
          {field('Type', 'type', 'select', [
            { v: 'preventive', l: '🛡️ Preventive' }, { v: 'corrective', l: '🔧 Corrective' },
            { v: 'predictive', l: '🤖 Predictive' }, { v: 'inspection', l: '🔍 Inspection' },
          ])}
          {field('Date', 'date', 'date')}
          {field('Technician', 'technician')}
          {field('Duration (hours)', 'duration_hours', 'number')}
          {field('Cost (USD)', 'cost_usd', 'number')}
          {field('Work Order No.', 'work_order')}
          {field('Next Due Date', 'next_due_date', 'date')}
        </div>
        {field('Title', 'title')}
        <div style={{ height: '12px' }} />
        {field('Description', 'description', 'textarea')}
        <div style={{ height: '12px' }} />
        {field('Findings', 'findings', 'textarea')}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : '+ Add Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Maintenance() {
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState({ type: 'ALL', asset: 'ALL', search: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [recRes, statRes] = await Promise.all([maintenanceApi.list(), maintenanceApi.stats()])
      setRecords(recRes.data)
      setStats(statRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = records.filter(r => {
    if (filter.type !== 'ALL' && r.type !== filter.type) return false
    if (filter.asset !== 'ALL' && r.asset_id !== filter.asset) return false
    if (filter.search && !r.title?.toLowerCase().includes(filter.search.toLowerCase()) && !r.description?.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="animate-fade-in">
      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Records',     value: stats.total_records ?? 0,           color: '#2563eb' },
          { label: 'Preventive',        value: stats.preventive ?? 0,               color: '#16a34a' },
          { label: 'Corrective',        value: stats.corrective ?? 0,               color: '#e63946' },
          { label: 'Predictive',        value: stats.predictive ?? 0,               color: '#7c3aed' },
          { label: 'Total Cost',        value: `$${(stats.total_cost_usd ?? 0).toLocaleString()}`, color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color, marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'preventive', 'corrective', 'predictive', 'inspection'].map(t => (
            <button key={t} onClick={() => setFilter(p => ({ ...p, type: t }))}
              style={{
                padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                background: filter.type === t ? 'var(--text-1)' : 'var(--surface)',
                color: filter.type === t ? '#fff' : 'var(--text-2)',
                border: '1px solid var(--border)', transition: 'all 150ms', fontFamily: 'Inter, sans-serif',
              }}>
              {t === 'ALL' ? 'All Types' : TYPE_CONFIG[t]?.label}
            </button>
          ))}
          <select value={filter.asset} onChange={e => setFilter(p => ({ ...p, asset: e.target.value }))}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '12px', color: 'var(--text-2)', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            <option value="ALL">All Assets</option>
            <option value="MOTOR_01">Electric Motor</option>
            <option value="GEARBOX_01">Gearbox</option>
            <option value="COMPRESSOR_01">Compressor</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              type="text" placeholder="Search records..."
              value={filter.search}
              onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
              style={{ paddingLeft: '30px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', width: '220px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', background: 'var(--surface)', color: 'var(--text-1)' }}
            />
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ gap: '6px' }}>
            <PlusCircle size={13} /> Add Record
          </button>
        </div>
      </div>

      {/* Records */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', marginBottom: '12px' }}>
          Showing {filtered.length} of {records.length} records
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <CheckCircle2 size={48} color="var(--text-3)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-2)', fontSize: '14px', fontWeight: 600 }}>No records found</div>
          </div>
        ) : (
          filtered.map((r, i) => <MaintenanceRow key={i} record={r} />)
        )}
      </div>

      {showAdd && <AddRecordModal onClose={() => setShowAdd(false)} onSave={load} />}
    </div>
  )
}
