'use client'

import { useEffect } from 'react'
import axios from 'axios'

/**
 * ServerKeepAlive Component
 * 
 * This component is responsible for periodically pinging the backend /health/ endpoint
 * to prevent the Render free-tier service from spinning down due to inactivity.
 * 
 * It pings every 5 minutes while the user has the application open.
 */
export default function ServerKeepAlive() {
  useEffect(() => {
    // Render free tier spins down after ~15 minutes of inactivity.
    // Pinging every 5 minutes (300000ms) keeps it active.
    const PING_INTERVAL = 300000 
    
    // Clean up the base URL and ensure /health/ is appended correctly
    // NEXT_PUBLIC_API_URL might be http://127.0.0.1:8000 or http://127.0.0.1:8000/api/v1
    const baseUrlRaw = process.env.NEXT_PUBLIC_API_URL || 'https://balkanji-backend.onrender.com'
    const baseUrlClean = baseUrlRaw.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
    const healthUrl = `${baseUrlClean}/health/`

    const pingServer = async () => {
      try {
        console.log(`[KeepAlive] Pinging backend: ${healthUrl} at ${new Date().toLocaleTimeString()}...`)
        const response = await axios.get(healthUrl, { timeout: 15000 })
        if (response.data && response.data.status === 'ok') {
          console.log('[KeepAlive] Backend is active and healthy.')
        } else {
          console.log('[KeepAlive] Backend responded but status is:', response.data?.status)
        }
      } catch (err: any) {
        if (err.code === 'ERR_NETWORK') {
          console.error('[KeepAlive] Network Error: Could not reach the backend. Is it running at ' + baseUrlClean + '?')
        } else if (err.code === 'ECONNABORTED') {
          console.warn('[KeepAlive] Search Timeout: Backend is very slow to respond.')
        } else {
          console.warn('[KeepAlive] Ping failed:', err.message)
        }
      }
    }

    // Initial ping on mount
    pingServer()

    // Setup interval for periodic pinging
    const intervalId = setInterval(pingServer, PING_INTERVAL)

    // Cleanup on unmount
    return () => clearInterval(intervalId)
  }, [])

  // This component doesn't render any UI
  return null
}
