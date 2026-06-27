const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

class WebSocketService {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.reconnectTimer = null
    this.isConnected = false
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const token = localStorage.getItem('lansub_token')
    this.ws = new WebSocket(`${WS_URL}/ws`)

    this.ws.onopen = () => {
      this.isConnected = true
      this._emit('connection', { connected: true })
      console.log('[WS] Connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this._emit('message', data)
        if (data.type) {
          this._emit(data.type, data)
        }
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    this.ws.onclose = () => {
      this.isConnected = false
      this._emit('connection', { connected: false })
      console.log('[WS] Disconnected. Reconnecting in 3s...')
      this.reconnectTimer = setTimeout(() => this.connect(), 3000)
    }

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err)
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  _emit(event, data) {
    this.listeners.get(event)?.forEach((cb) => cb(data))
  }
}

export const wsService = new WebSocketService()
export default wsService
