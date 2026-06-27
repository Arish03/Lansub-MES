import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

const COLORS = ['#e63946', '#2563eb', '#16a34a', '#d97706', '#7c3aed']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '6px', fontSize: '11px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-2)' }}>{p.name}:</span>
          <strong style={{ color: 'var(--text-1)' }}>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data = [], lines = [], title, unit, warningThreshold, criticalThreshold, height = 200 }) {
  return (
    <div>
      {title && (
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {title}
          {unit && <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400 }}>({unit})</span>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--text-3)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--text-3)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {lines.length > 1 && (
            <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-2)' }} />
          )}
          {criticalThreshold && (
            <ReferenceLine y={criticalThreshold} stroke="#e63946" strokeDasharray="4 4"
              label={{ value: 'Critical', fill: '#e63946', fontSize: 10, position: 'insideTopRight' }} />
          )}
          {warningThreshold && (
            <ReferenceLine y={warningThreshold} stroke="#d97706" strokeDasharray="4 4"
              label={{ value: 'Warning', fill: '#d97706', fontSize: 10, position: 'insideTopRight' }} />
          )}
          {lines.map((line, i) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label || line.key}
              stroke={line.color || COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: line.color || COLORS[i % COLORS.length] }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
