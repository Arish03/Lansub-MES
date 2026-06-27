import React, { useEffect, useState } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import { assetsApi, alarmsApi } from '../services/api'
import ScadaViewer from '../components/SCADA3D/ScadaViewer'
import KPICard from '../components/KPICards/KPICard'
import TrendChart from '../components/Charts/TrendChart'
import { Activity, AlertTriangle, Cpu, Zap, TrendingUp, CheckCircle } from 'lucide-react'

function AssetMiniCard({ asset, telemetry }) {
  const live = telemetry[asset?.asset_id]
  const health = live?.health_score ?? asset?.health_score ?? 100
  const fault = live?.fault_type ?? 'none'
  const color = health >= 80 ? 'var(--green)' : health >= 50 ? 'var(--amber)' : 'var(--red)'
  const bgColor = health >= 80 ? 'var(--green-light)' : health >= 50 ? 'var(--amber-light)' : 'var(--red-light)'
  const borderColor = health >= 80 ? 'var(--green-mid)' : health >= 50 ? 'var(--amber-mid)' : 'var(--red-mid)'

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${borderColor}`,
      borderRadius: '12px', padding: '14px',
      transition: 'var(--transition)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{asset?.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{asset?.asset_id}</div>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '3px 10px',
          background: bgColor, color, border: `1px solid ${borderColor}`,
          borderRadius: '999px', textTransform: 'uppercase',
        }}>
          {health >= 80 ? 'Good' : health >= 50 ? 'Degraded' : 'Critical'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Health</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color }}>{health.toFixed(1)}%</span>
        </div>
        <div style={{ height: '5px', background: 'var(--bg-2)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${health}%`, background: color, borderRadius: '3px', transition: 'width 500ms ease' }} />
        </div>
      </div>

      {fault !== 'none' ? (
        <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-light)', borderRadius: '6px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={10} /> {fault.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={10} /> Normal Operation
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { latestTelemetry, latestAnalysis, connected } = useWebSocket()
  const [assets, setAssets] = useState([])
  const [alarmSummary, setAlarmSummary] = useState({ critical_count: 0, warning_count: 0, total_unacknowledged: 0 })
  const [vibHistory, setVibHistory] = useState([])

  useEffect(() => {
    assetsApi.list().then(({ data }) => setAssets(data)).catch(() => {})
    alarmsApi.summary().then(({ data }) => setAlarmSummary(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      alarmsApi.summary().then(({ data }) => setAlarmSummary(data)).catch(() => {})
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const motor = latestTelemetry['MOTOR_01']
    if (!motor) return
    const ts = new Date()
    const time = `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`
    setVibHistory(prev => [
      ...prev.slice(-80),
      {
        time,
        'Motor M1': motor.sensors?.M1?.vibration_rms,
        'Motor M2': motor.sensors?.M2?.vibration_rms,
        'Gearbox G1': latestTelemetry['GEARBOX_01']?.sensors?.G1?.vibration_rms,
        'Comp C1':   latestTelemetry['COMPRESSOR_01']?.sensors?.C1?.vibration_rms,
      },
    ])
  }, [latestTelemetry['MOTOR_01']])

  const motorHealth   = latestTelemetry['MOTOR_01']?.health_score ?? 100
  const gearboxHealth = latestTelemetry['GEARBOX_01']?.health_score ?? 100
  const compHealth    = latestTelemetry['COMPRESSOR_01']?.health_score ?? 100
  const avgHealth     = ((motorHealth + gearboxHealth + compHealth) / 3).toFixed(1)

  const runningAssets  = assets.filter(a => a.status === 'running').length
  const criticalAssets = assets.filter(a => (a.health_score ?? 100) < 50).length

  return (
    <div className="animate-fade-in">
      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KPICard
          title="Plant Health Index"
          value={avgHealth}
          unit="%"
          icon={Activity}
          accentColor={Number(avgHealth) >= 80 ? 'green' : Number(avgHealth) >= 50 ? 'amber' : 'red'}
          subtitle="Average across all 3 assets"
        />
        <KPICard
          title="Motor Speed"
          value={latestTelemetry['MOTOR_01']?.sensors?.rpm?.toFixed(0) ?? '—'}
          unit="RPM"
          icon={Zap}
          accentColor="blue"
          subtitle="Live reading"
        />
        <KPICard
          title="Active Alarms"
          value={alarmSummary.total_unacknowledged}
          icon={AlertTriangle}
          accentColor={alarmSummary.critical_count > 0 ? 'red' : alarmSummary.warning_count > 0 ? 'amber' : 'green'}
          subtitle={`${alarmSummary.critical_count} critical · ${alarmSummary.warning_count} warning`}
        />
        <KPICard
          title="Discharge Pressure"
          value={latestTelemetry['COMPRESSOR_01']?.sensors?.discharge_pressure_bar?.toFixed(1) ?? '—'}
          unit="bar"
          icon={TrendingUp}
          accentColor="purple"
          subtitle="Compressor outlet"
        />
      </div>

      {/* SCADA 3D Viewer */}
      <div style={{ marginBottom: '24px' }}>
        <ScadaViewer height="500px" />
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
        {/* Asset Status */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={15} color="var(--blue)" />
            Asset Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assets.map(asset => (
              <AssetMiniCard key={asset.asset_id} asset={asset} telemetry={latestTelemetry} />
            ))}
          </div>
        </div>

        {/* Live Trend + AI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={15} color="var(--red)" />
                Live Vibration Trends
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="sensor-live" />
                <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>Real-time</span>
              </div>
            </div>
            <TrendChart
              data={vibHistory}
              lines={[
                { key: 'Motor M1', label: 'Motor M1', color: '#2563eb' },
                { key: 'Motor M2', label: 'Motor M2', color: '#e63946' },
                { key: 'Gearbox G1', label: 'Gearbox G1', color: '#d97706' },
                { key: 'Comp C1', label: 'Compressor C1', color: '#16a34a' },
              ]}
              unit="mm/s RMS"
              warningThreshold={7.1}
              criticalThreshold={11.2}
              height={220}
            />
          </div>

          {/* Lansub AI Panel */}
          {Object.entries(latestAnalysis).some(([k, v]) => v?.fault_type && v.fault_type !== 'none') ? (
            <div style={{ background: 'var(--red-light)', border: '1px solid var(--red-mid)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <AlertTriangle size={15} /> Lansub AI — Active Fault Detections
              </div>
              {Object.entries(latestAnalysis).filter(([k, v]) => v?.fault_type && v.fault_type !== 'none').map(([assetId, analysis]) => (
                <div key={assetId} style={{ marginBottom: '8px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid var(--red-mid)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>{assetId}</span>
                    <span style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 600 }}>RUL: {analysis.rul_days} days</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{analysis.fault_analysis?.detail}</div>
                  <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px', fontWeight: 500 }}>
                    ⚡ {analysis.fault_analysis?.action}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--green-light)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={28} color="var(--green)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '13px' }}>All Systems Normal</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Lansub AI monitoring all 8 sensor points — no faults detected</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
