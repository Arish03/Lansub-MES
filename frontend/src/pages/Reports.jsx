import React, { useState, useEffect } from 'react'
import { reportsApi } from '../services/api'
import ReactMarkdown from 'react-markdown'
import { FileText, Sparkles, Clock, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const REPORT_TYPES = [
  { id: 'daily_summary',            label: 'Daily Summary',      icon: '📊', desc: 'Overall plant health, alarm summary, key findings', color: '#2563eb' },
  { id: 'fault_analysis',           label: 'Fault Analysis',     icon: '🔍', desc: 'Root cause analysis of active faults',              color: '#e63946' },
  { id: 'maintenance_recommendation',label: 'Maintenance Plan',  icon: '🔧', desc: 'Priority maintenance tasks and scheduling',         color: '#16a34a' },
]

function ReportCard({ report, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const rType = REPORT_TYPES.find(t => t.id === report.report_type)
  const color = rType?.color || '#2563eb'

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '10px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          borderLeft: `4px solid ${color}`,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>{rType?.icon || '📄'}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
              {rType?.label || report.report_type}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', display: 'flex', align: 'center', gap: '6px' }}>
              <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
              {report.generated_at ? formatDistanceToNow(new Date(report.generated_at), { addSuffix: true }) : '—'}
              &nbsp;·&nbsp;{report.generated_by}
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
      </div>

      {open && (
        <div style={{ padding: '22px', animation: 'fadeIn 0.25s ease' }}>
          <ReactMarkdown
            components={{
              h1: ({ node, ...p }) => <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-1)', marginBottom: '12px', marginTop: '0', letterSpacing: '-0.02em', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }} {...p} />,
              h2: ({ node, ...p }) => <h2 style={{ fontSize: '15px', fontWeight: 700, color: color, marginBottom: '8px', marginTop: '20px' }} {...p} />,
              h3: ({ node, ...p }) => <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px', marginTop: '14px' }} {...p} />,
              p:  ({ node, ...p }) => <p  style={{ marginBottom: '10px', color: 'var(--text-2)', lineHeight: '1.7', fontSize: '13px' }} {...p} />,
              strong: ({ node, ...p }) => <strong style={{ color: 'var(--text-1)', fontWeight: 700 }} {...p} />,
              table: ({ node, ...p }) => <div style={{ overflowX: 'auto', marginBottom: '12px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }} {...p} /></div>,
              th: ({ node, ...p }) => <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.08em', background: 'var(--surface-2)' }} {...p} />,
              td: ({ node, ...p }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }} {...p} />,
              li: ({ node, ...p }) => <li style={{ marginBottom: '4px', color: 'var(--text-2)', fontSize: '13px' }} {...p} />,
              ul: ({ node, ...p }) => <ul style={{ paddingLeft: '20px', marginBottom: '10px' }} {...p} />,
              ol: ({ node, ...p }) => <ol style={{ paddingLeft: '20px', marginBottom: '10px' }} {...p} />,
              code: ({ node, ...p }) => <code style={{ background: 'var(--surface-2)', color: color, padding: '1px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', border: '1px solid var(--border)' }} {...p} />,
              hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />,
              blockquote: ({ node, ...p }) => <blockquote style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px', margin: '12px 0', color: 'var(--text-2)', fontStyle: 'italic', background: 'var(--surface-2)', padding: '10px 12px', borderRadius: '0 8px 8px 0' }} {...p} />,
            }}
          >
            {report.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [reports, setReports] = useState([])
  const [generating, setGenerating] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    reportsApi.list().then(({ data }) => setReports(data)).catch(() => {})
  }, [])

  const generate = async (type) => {
    setGenerating(type)
    setError('')
    try {
      const { data } = await reportsApi.generate(type)
      setReports(prev => [data, ...prev])
    } catch (e) {
      setError('Report generation failed. Please try again.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>
          Lansub AI generates professional condition monitoring reports from live telemetry data
        </div>
      </div>

      {/* Generate Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {REPORT_TYPES.map(({ id, label, icon, desc, color }) => (
          <div
            key={id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '22px',
              boxShadow: 'var(--shadow-sm)',
              borderTop: `4px solid ${color}`,
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>{desc}</div>
            <button
              onClick={() => generate(id)}
              disabled={!!generating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: generating === id ? `${color}22` : color,
                color: generating === id ? color : '#fff',
                fontSize: '12px', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)', fontFamily: 'Inter, sans-serif',
                opacity: generating && generating !== id ? 0.6 : 1,
              }}
            >
              {generating === id ? (
                <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating...</>
              ) : (
                <><Sparkles size={12} /> Generate Report</>
              )}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--red-light)', border: '1px solid var(--red-mid)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--red)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Report History */}
      {reports.length > 0 ? (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} />
            Report History ({reports.length})
          </div>
          {reports.map((report, i) => (
            <ReportCard key={i} report={report} defaultOpen={i === 0} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <FileText size={48} color="var(--text-3)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>No reports generated yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Click a Generate button above to create your first AI report</div>
        </div>
      )}
    </div>
  )
}
