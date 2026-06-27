import React, { useEffect, useState } from 'react'
import { telemetryApi } from '../services/api'
import { useWebSocket } from '../contexts/WebSocketContext'
import TrendChart from '../components/Charts/TrendChart'

const ASSETS = ['MOTOR_01', 'GEARBOX_01', 'COMPRESSOR_01']

const TREND_GROUPS = [
  { title: 'Vibration — All Assets',     unit: 'mm/s', warning: 7.1,  critical: 11.2,
    lines: [{ key: 'motor_vib', label: 'Motor M1', color: '#2563eb' }, { key: 'gearbox_vib', label: 'Gearbox G1', color: '#d97706' }, { key: 'comp_vib', label: 'Compressor C1', color: '#e63946' }] },
  { title: 'Temperature — All Assets',   unit: '°C',   warning: 80,   critical: 95,
    lines: [{ key: 'motor_temp', label: 'Motor', color: '#2563eb' }, { key: 'gearbox_temp', label: 'Gearbox', color: '#d97706' }, { key: 'comp_temp', label: 'Compressor', color: '#e63946' }] },
  { title: 'Motor RPM',                  unit: 'RPM',
    lines: [{ key: 'motor_rpm', label: 'Motor RPM', color: '#7c3aed' }] },
  { title: 'Compressor Pressure',        unit: 'bar',  warning: 15,   critical: 18,
    lines: [{ key: 'discharge_pressure', label: 'Discharge', color: '#e63946' }, { key: 'suction_pressure', label: 'Suction', color: '#16a34a' }] },
  { title: 'Flow Rate',                  unit: 'm³/h',
    lines: [{ key: 'flow_rate', label: 'Flow', color: '#7c3aed' }] },
  { title: 'Health Scores',              unit: '%',
    lines: [{ key: 'motor_health', label: 'Motor', color: '#2563eb' }, { key: 'gearbox_health', label: 'Gearbox', color: '#d97706' }, { key: 'comp_health', label: 'Compressor', color: '#16a34a' }] },
]

export default function Trends() {
  const { latestTelemetry } = useWebSocket()
  const [trendData, setTrendData] = useState([])
  const [timeRange, setTimeRange] = useState(1)

  useEffect(() => {
    Promise.all(ASSETS.map(id => telemetryApi.get(id, timeRange, 300)))
      .then(results => {
        const byTime = {}
        results.forEach(({ data }, idx) => {
          const id = ASSETS[idx]
          data.forEach(d => {
            const ts = new Date(d.timestamp)
            const key = ts.getTime()
            if (!byTime[key]) byTime[key] = {
              time: `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`
            }
            if (id === 'MOTOR_01') {
              byTime[key].motor_vib    = d.sensors?.M1?.vibration_rms
              byTime[key].motor_temp   = d.sensors?.M1?.temperature_c
              byTime[key].motor_rpm    = d.sensors?.rpm
              byTime[key].motor_health = d.health_score
            } else if (id === 'GEARBOX_01') {
              byTime[key].gearbox_vib    = d.sensors?.G1?.vibration_rms
              byTime[key].gearbox_temp   = d.sensors?.G1?.temperature_c
              byTime[key].gearbox_health = d.health_score
            } else if (id === 'COMPRESSOR_01') {
              byTime[key].comp_vib          = d.sensors?.C1?.vibration_rms
              byTime[key].comp_temp         = d.sensors?.C1?.temperature_c
              byTime[key].discharge_pressure = d.sensors?.discharge_pressure_bar
              byTime[key].suction_pressure   = d.sensors?.suction_pressure_bar
              byTime[key].flow_rate          = d.sensors?.flow_rate_m3h
              byTime[key].comp_health        = d.health_score
            }
          })
        })
        setTrendData(Object.entries(byTime).sort((a, b) => a[0] - b[0]).map(([, v]) => v))
      }).catch(() => {})
  }, [timeRange])

  useEffect(() => {
    const m = latestTelemetry['MOTOR_01']
    const g = latestTelemetry['GEARBOX_01']
    const c = latestTelemetry['COMPRESSOR_01']
    if (!m && !g && !c) return
    const ts = new Date()
    const time = `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`
    setTrendData(prev => [...prev.slice(-500), {
      time,
      motor_vib:          m?.sensors?.M1?.vibration_rms,
      motor_temp:         m?.sensors?.M1?.temperature_c,
      motor_rpm:          m?.sensors?.rpm,
      motor_health:       m?.health_score,
      gearbox_vib:        g?.sensors?.G1?.vibration_rms,
      gearbox_temp:       g?.sensors?.G1?.temperature_c,
      gearbox_health:     g?.health_score,
      comp_vib:           c?.sensors?.C1?.vibration_rms,
      comp_temp:          c?.sensors?.C1?.temperature_c,
      discharge_pressure: c?.sensors?.discharge_pressure_bar,
      suction_pressure:   c?.sensors?.suction_pressure_bar,
      flow_rate:          c?.sensors?.flow_rate_m3h,
      comp_health:        c?.health_score,
    }])
  }, [latestTelemetry['MOTOR_01'], latestTelemetry['GEARBOX_01'], latestTelemetry['COMPRESSOR_01']])

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>Historical and live parameter trends for all 3 assets</p>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 4, 24, 72].map(h => (
            <button
              key={h}
              onClick={() => setTimeRange(h)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer',
                background: timeRange === h ? 'var(--text-1)' : 'var(--surface)',
                color: timeRange === h ? '#fff' : 'var(--text-2)',
                fontSize: '12px', fontWeight: 600, transition: 'var(--transition)',
              }}
            >{h}h</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {TREND_GROUPS.map(group => (
          <div key={group.title} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)',
          }}>
            <TrendChart
              data={trendData}
              lines={group.lines}
              title={group.title}
              unit={group.unit}
              warningThreshold={group.warning}
              criticalThreshold={group.critical}
              height={190}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
