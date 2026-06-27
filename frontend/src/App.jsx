import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import Trends from './pages/Trends'
import Alarms from './pages/Alarms'
import Reports from './pages/Reports'
import Reliability from './pages/Reliability'
import Maintenance from './pages/Maintenance'

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <img src="/lansub_logo.png" alt="Lansub" style={{ height: '28px', objectFit: 'contain', opacity: 0.6, display: 'block', margin: '0 auto 8px' }} />
          <div style={{ color: 'var(--text-3)', fontSize: '13px', fontWeight: 500 }}>Initializing Platform...</div>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return (
    <WebSocketProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content" style={{ marginLeft: '240px' }}>
          <Header />
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/login"   element={<Login />} />

          {/* Protected routes */}
          <Route path="/"             element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/assets"       element={<ProtectedLayout><Assets /></ProtectedLayout>} />
          <Route path="/assets/:id"   element={<ProtectedLayout><AssetDetail /></ProtectedLayout>} />
          <Route path="/trends"       element={<ProtectedLayout><Trends /></ProtectedLayout>} />
          <Route path="/alarms"       element={<ProtectedLayout><Alarms /></ProtectedLayout>} />
          <Route path="/reports"      element={<ProtectedLayout><Reports /></ProtectedLayout>} />
          <Route path="/reliability"  element={<ProtectedLayout><Reliability /></ProtectedLayout>} />
          <Route path="/maintenance"  element={<ProtectedLayout><Maintenance /></ProtectedLayout>} />

          {/* Default: go to landing */}
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
