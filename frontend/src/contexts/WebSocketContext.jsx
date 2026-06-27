import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import wsService from '../services/websocket'

const WsContext = createContext(null)

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [latestTelemetry, setLatestTelemetry] = useState({})
  const [latestAnalysis, setLatestAnalysis] = useState({})

  useEffect(() => {
    wsService.connect()

    const unsubConn = wsService.on('connection', ({ connected }) => setConnected(connected))
    const unsubMsg = wsService.on('telemetry', ({ payload, analysis }) => {
      if (payload?.asset_id) {
        setLatestTelemetry((prev) => ({ ...prev, [payload.asset_id]: payload }))
        setLatestAnalysis((prev) => ({ ...prev, [payload.asset_id]: analysis }))
      }
    })

    return () => {
      unsubConn()
      unsubMsg()
      wsService.disconnect()
    }
  }, [])

  return (
    <WsContext.Provider value={{ connected, latestTelemetry, latestAnalysis }}>
      {children}
    </WsContext.Provider>
  )
}

export const useWebSocket = () => useContext(WsContext)
