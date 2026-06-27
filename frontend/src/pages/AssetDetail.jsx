import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { assetsApi, telemetryApi } from '../services/api'
import { useWebSocket } from '../contexts/WebSocketContext'
import TrendChart from '../components/Charts/TrendChart'
import { ArrowLeft, Activity, AlertTriangle, Clock } from 'lucide-react'

const SENSOR_KEYS = {
  MOTOR: [
    { title: 'M1 Vibration', unit: 'mm/s', path: 'sensors.M1.vibration_rms', warning: 7.1, critical: 11.2 },
    { title: 'M1 Temperature', unit: '°C', path: 'sensors.M1.temperature_c', warning: 80, critical: 95 },
    { title: 'M2 Vibration', unit: 'mm/s', path: 'sensors.M2.vibration_rms', warning: 7.1, critical: 11.2 },
    { title: 'M2 Temperature', unit: '°C', path: 'sensors.M2.temperature_c', warning: 80, critical: 95 },
    { title: 'Motor RPM', unit: 'RPM', path: 'sensors.rpm' },
    { title: 'Current', unit: 'A', path: 'sensors.current_a' },
  ],
  GEARBOX: [
    { title: 'G1 Vibration', unit: 'mm/s', path: 'sensors.G1.vibration_rms', warning: 7.1, critical: 11.2 },
    { title: 'G1 Temperature', unit: '°C', path: 'sensors.G1.temperature_c', warning: 80, critical: 95 },
    { title: 'G2 Vibration', unit: 'mm/s', path: 'sensors.G2.vibration_rms', warning: 7.1, critical: 11.2 },
    { title: 'Oil Temperature', unit: '°C', path: 'sensors.oil_temperature_c', warning: 85, critical: 100 },
    { title: 'Input RPM', unit: 'RPM', path: 'sensors.input_rpm' },
    { title: 'Output RPM', unit: 'RPM', path: 'sensors.output_rpm' },
  ],
  COMPRESSOR: [
    { title: 'C1 Vibration', unit: 'mm/s', path: 'sensors.C1.vibration_rms', warning: 7.1, critical: 11.2 },
    { title: 'C1 Temperature', unit: '°C', path: 'sensors.C1.temperature_c', warning: 80, critical: 95 },
    { title: 'Discharge Pressure', unit: 'bar', path: 'sensors.discharge_pressure_bar', warning: 15, critical: 18 },
    { title: 'Flow Rate', unit: 'm³/h', path: 'sensors.flow_rate_m3h' },
    { title: 'Suction Pressure', unit: 'bar', path: 'sensors.suction_pressure_bar' },
    { title: 'Gas Temperature', unit: '°C', path: 'sensors.gas_temperature_c' },
  ],
}

function getNestedVal(obj, path) {
  return path.split('.').reduce((acc, k) => acc?.[k], obj)
}

export default function AssetDetail() {
  const { id } = useParams()
  const { latestTelemetry, latestAnalysis } = useWebSocket()
  const [asset, setAsset] = useState(null)
  const [history, setHistory] = useState([])
  const [trendData, setTrendData] = useState([])

  useEffect(() => {
    assetsApi.get(id).then(({ data }) => setAsset(data)).catch(() => {})
    telemetryApi.get(id, 1, 200).then(({ data }) => {
      setHistory(data)
      buildTrendData(data)
    }).catch(() => {})
  }, [id])

  const buildTrendData = useCallback((raw) => {
    setTrendData(raw.map(d => {
      const ts = new Date(d.timestamp)
      return {
        time: `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`,
        ...d.sensors,
        m1_vib: d.sensors?.M1?.vibration_rms,
        m1_temp: d.sensors?.M1?.temperature_c,
        m2_vib: d.sensors?.M2?.vibration_rms,
        g1_vib: d.sensors?.G1?.vibration_rms,
        g1_temp: d.sensors?.G1?.temperature_c,
        g2_vib: d.sensors?.G2?.vibration_rms,
        c1_vib: d.sensors?.C1?.vibration_rms,
        c1_temp: d.sensors?.C1?.temperature_c,
        health_score: d.health_score,
      }
    }))
  }, [])

  // Append live data
  useEffect(() => {
    const live = latestTelemetry[id]
    if (!live) return
    const ts = new Date()
    const point = {
      time: `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`,
      ...live.sensors,
      m1_vib: live.sensors?.M1?.vibration_rms,
      m1_temp: live.sensors?.M1?.temperature_c,
      m2_vib: live.sensors?.M2?.vibration_rms,
      g1_vib: live.sensors?.G1?.vibration_rms,
      g2_vib: live.sensors?.G2?.vibration_rms,
      c1_vib: live.sensors?.C1?.vibration_rms,
      c1_temp: live.sensors?.C1?.temperature_c,
      health_score: live.health_score,
    }
    setTrendData(prev => [...prev.slice(-200), point])
  }, [latestTelemetry[id]])

  const live = latestTelemetry[id]
  const analysis = latestAnalysis[id]
  const health = live?.health_score ?? asset?.health_score ?? 100
  const fault = live?.fault_type ?? 'none'
  const color = health >= 80 ? '#10b981' : health >= 50 ? '#f59e0b' : '#ef4444'
  const assetType = asset?.asset_type

  const chartConfigs = {
    MOTOR: [
      { title: 'Vibration', lines: [{ key: 'm1_vib', label: 'M1 NDE', color: '#00d4ff' }, { key: 'm2_vib', label: 'M2 DE', color: '#10b981' }], unit: 'mm/s', warning: 7.1, critical: 11.2 },
      { title: 'Temperature', lines: [{ key: 'm1_temp', label: 'M1', color: '#f59e0b' }], unit: '°C', warning: 80, critical: 95 },
      { title: 'RPM', lines: [{ key: 'rpm', label: 'Motor RPM', color: '#7c3aed' }], unit: 'RPM' },
      { title: 'Health Score', lines: [{ key: 'health_score', label: 'Health %', color: color }], unit: '%' },
    ],
    GEARBOX: [
      { title: 'Vibration', lines: [{ key: 'g1_vib', label: 'G1 Input', color: '#00d4ff' }, { key: 'g2_vib', label: 'G2 Output', color: '#10b981' }], unit: 'mm/s', warning: 7.1, critical: 11.2 },
      { title: 'Oil Temperature', lines: [{ key: 'oil_temperature_c', label: 'Oil Temp', color: '#f59e0b' }], unit: '°C', warning: 85, critical: 100 },
      { title: 'RPM', lines: [{ key: 'input_rpm', label: 'Input', color: '#00d4ff' }, { key: 'output_rpm', label: 'Output', color: '#7c3aed' }], unit: 'RPM' },
      { title: 'Health Score', lines: [{ key: 'health_score', label: 'Health %', color }], unit: '%' },
    ],
    COMPRESSOR: [
      { title: 'Vibration', lines: [{ key: 'c1_vib', label: 'C1 DE', color: '#00d4ff' }], unit: 'mm/s', warning: 7.1, critical: 11.2 },
      { title: 'Pressure', lines: [{ key: 'discharge_pressure_bar', label: 'Discharge', color: '#f59e0b' }, { key: 'suction_pressure_bar', label: 'Suction', color: '#10b981' }], unit: 'bar' },
      { title: 'Flow Rate', lines: [{ key: 'flow_rate_m3h', label: 'Flow', color: '#7c3aed' }], unit: 'm³/h' },
      { title: 'Health Score', lines: [{ key: 'health_score', label: 'Health %', color }], unit: '%' },
    ],
  }

  const charts = chartConfigs[assetType] || []

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link to="/assets" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#8bafc8', textDecoration: 'none', fontSize: '13px', marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Assets
      </Link>

      {/* Asset Header */}
      <div style={{
        background: 'rgba(22,45,72,0.5)',
        border: `1px solid ${color}33`, borderRadius: '16px', padding: '24px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8f4fd', marginBottom: '4px' }}>
            {asset?.name ?? id}
          </div>
          <div style={{ fontSize: '13px', color: '#8bafc8' }}>{asset?.manufacturer} · {asset?.model} · {asset?.location}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {asset?.sensor_points?.map(sp => (
              <span key={sp} style={{ fontSize: '11px', padding: '2px 8px', background: `${color}15`, color, border: `1px solid ${color}33`, borderRadius: '999px', fontWeight: 700 }}>{sp}</span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '40px', fontWeight: 800, color, lineHeight: 1 }}>{health.toFixed(1)}%</div>
          <div style={{ fontSize: '12px', color: '#8bafc8', marginTop: '4px' }}>Health Score</div>
          <div style={{
            marginTop: '8px', fontSize: '12px', fontWeight: 600,
            color: fault !== 'none' ? '#ef4444' : '#10b981',
            display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end',
          }}>
            {fault !== 'none' ? <AlertTriangle size={12} /> : <Activity size={12} />}
            {fault !== 'none' ? fault.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Normal Operation'}
          </div>
          {analysis && <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>RUL: {analysis.rul_days} days</div>}
        </div>
      </div>

      {/* Lansub AI Panel */}
      {analysis?.fault_type && analysis.fault_type !== 'none' && (
        <div style={{
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '14px', padding: '18px', marginBottom: '20px',
        }}>
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> Lansub AI Fault Detection
          </div>
          <div style={{ fontSize: '13px', color: '#e8f4fd', fontWeight: 600 }}>{analysis.fault_analysis?.title}</div>
          <div style={{ fontSize: '13px', color: '#8bafc8', marginTop: '4px' }}>{analysis.fault_analysis?.detail}</div>
          <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px', fontWeight: 500 }}>
            ⚡ Recommended Action: {analysis.fault_analysis?.action}
          </div>
        </div>
      )}

      {/* Live Sensor Values */}
      {live && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8f4fd', marginBottom: '12px' }}>Live Sensor Readings</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {SENSOR_KEYS[assetType]?.map(({ title, unit, path, warning, critical }) => {
              const val = getNestedVal(live, path)
              if (val === undefined) return null
              const isWarn = warning && val >= warning
              const isCrit = critical && val >= critical
              const vColor = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981'
              return (
                <div key={title} style={{
                  background: 'rgba(22,45,72,0.5)', border: `1px solid ${vColor}33`,
                  borderRadius: '12px', padding: '14px',
                }}>
                  <div style={{ fontSize: '11px', color: '#8bafc8', marginBottom: '4px' }}>{title}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: vColor }}>
                    {typeof val === 'number' ? val.toFixed(2) : val}
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#8bafc8', marginLeft: '4px' }}>{unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trend Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {charts.map(chart => (
          <div key={chart.title} style={{ background: 'rgba(22,45,72,0.4)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: '14px', padding: '18px' }}>
            <TrendChart
              data={trendData}
              lines={chart.lines}
              title={chart.title}
              unit={chart.unit}
              warningThreshold={chart.warning}
              criticalThreshold={chart.critical}
              height={180}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
