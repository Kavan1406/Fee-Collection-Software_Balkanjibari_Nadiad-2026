'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, XCircle, Copy, RefreshCw, TestTube, Zap } from 'lucide-react'
import { toast } from 'sonner'
import apiClient, { API_BASE_URL } from '@/lib/api/client'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
  timestamp: string
  duration?: number
  error?: string
}

export default function RazorpayTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [testAmount, setTestAmount] = useState('610')
  const [testEmail, setTestEmail] = useState('test@balkanji.local')
  const [razorpayConfig, setRazorpayConfig] = useState<any>(null)

  // Get Razorpay configuration from backend
  const fetchRazorpayConfig = async () => {
    try {
      const response = await apiClient.get('/api/v1/payments/razorpay-config/')
      setRazorpayConfig(response.data?.data || response.data)
      addTestResult('RAZORPAY_CONFIG', 'success', 'Config retrieved successfully', response.data)
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      addTestResult('RAZORPAY_CONFIG', 'error', `Failed to get config: ${errMsg}`, err)
    }
  }

  // Test API connectivity
  const testAPIConnectivity = async () => {
    try {
      const start = Date.now()
      const response = await apiClient.get('/health/')
      const duration = Date.now() - start
      addTestResult(
        'API_CONNECTIVITY',
        'success',
        `API responding (${duration}ms)`,
        { status: response.status, duration }
      )
    } catch (err: any) {
      addTestResult(
        'API_CONNECTIVITY',
        'error',
        `API unreachable: ${err.message}`,
        err
      )
    }
  }

  // Test CORS
  const testCORS = async () => {
    try {
      const start = Date.now()
      const response = await fetch(`${API_BASE_URL}/api/v1/subjects/`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      })
      const duration = Date.now() - start
      const corsHeader = response.headers.get('Access-Control-Allow-Origin')
      if (corsHeader) {
        addTestResult(
          'CORS',
          'success',
          `CORS enabled (${duration}ms) - Allowed Origin: ${corsHeader}`,
          { corsHeader, status: response.status }
        )
      } else {
        addTestResult('CORS', 'error', 'CORS header not found', { status: response.status })
      }
    } catch (err: any) {
      addTestResult('CORS', 'error', `CORS test failed: ${err.message}`, err)
    }
  }

  // Test Razorpay order creation
  const testOrderCreation = async () => {
    try {
      const start = Date.now()
      const response = await apiClient.post('/api/v1/payments/create-order/', {
        amount: parseInt(testAmount),
        description: 'Razorpay Integration Test',
        email: testEmail,
        phone: '9876543210',
      })
      const duration = Date.now() - start
      const data = response.data?.data || response.data
      addTestResult(
        'ORDER_CREATION',
        'success',
        `Order created (${duration}ms) - ID: ${data.order_id}`,
        data
      )
    } catch (err: any) {
      addTestResult(
        'ORDER_CREATION',
        'error',
        `Order creation failed: ${err.response?.data?.error || err.message}`,
        err.response?.data
      )
    }
  }

  // Test authentication
  const testAuthentication = async () => {
    try {
      const start = Date.now()
      const response = await apiClient.get('/api/v1/auth/me/')
      const duration = Date.now() - start
      addTestResult(
        'AUTHENTICATION',
        'success',
        `Authenticated (${duration}ms) - User: ${response.data?.data?.email || 'unknown'}`,
        { user: response.data?.data }
      )
    } catch (err: any) {
      addTestResult(
        'AUTHENTICATION',
        'error',
        `Auth failed: ${err.response?.data?.error || err.message}`,
        err
      )
    }
  }

  // Run all tests
  const runAllTests = async () => {
    setTestResults([])
    setRunning(true)

    try {
      await testAPIConnectivity()
      await new Promise(resolve => setTimeout(resolve, 500))

      await testCORS()
      await new Promise(resolve => setTimeout(resolve, 500))

      await testAuthentication()
      await new Promise(resolve => setTimeout(resolve, 500))

      await fetchRazorpayConfig()
      await new Promise(resolve => setTimeout(resolve, 500))

      await testOrderCreation()
    } finally {
      setRunning(false)
    }
  }

  const addTestResult = (
    name: string,
    status: 'success' | 'error' | 'pending',
    message: string,
    data?: any
  ) => {
    const result: TestResult = {
      name,
      status,
      message,
      timestamp: new Date().toLocaleTimeString('en-IN'),
    }
    setTestResults(prev => [result, ...prev])
  }

  return (
    <div className="space-y-6 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Razorpay Integration Test</h1>
          <p className="text-sm text-gray-600 mt-1">Test payment gateway connectivity and configuration</p>
        </div>
        <button
          onClick={runAllTests}
          disabled={running}
          className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap size={18} />
          {running ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure test parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Amount (₹)
              </label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="610"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="test@balkanji.local"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Tests</CardTitle>
          <CardDescription>Run individual test components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={testAPIConnectivity}
              className="px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition font-medium"
            >
              Test API Connectivity
            </button>
            <button
              onClick={testCORS}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition font-medium"
            >
              Test CORS
            </button>
            <button
              onClick={testAuthentication}
              className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition font-medium"
            >
              Test Authentication
            </button>
            <button
              onClick={fetchRazorpayConfig}
              className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg border border-orange-200 hover:bg-orange-100 transition font-medium"
            >
              Fetch Razorpay Config
            </button>
            <button
              onClick={testOrderCreation}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 transition font-medium"
            >
              Test Order Creation
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Real-time test execution logs</CardDescription>
            </div>
            {testResults.length > 0 && (
              <button
                onClick={() => setTestResults([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Logs
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TestTube className="mx-auto mb-3 opacity-50" size={32} />
              <p>No test results yet. Run a test to see results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : result.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div>
                      {result.status === 'success' && (
                        <CheckCircle className="text-green-600 mt-1" size={20} />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="text-red-600 mt-1" size={20} />
                      )}
                      {result.status === 'pending' && (
                        <AlertCircle className="text-yellow-600 mt-1 animate-spin" size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-sm text-gray-900">{result.name}</h4>
                        <span className="text-xs text-gray-500">{result.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                      {result.error && (
                        <details className="mt-2 text-xs text-gray-600">
                          <summary className="cursor-pointer font-medium">Error Details</summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {typeof result.error === 'string'
                              ? result.error
                              : JSON.stringify(result.error, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Razorpay Configuration Details */}
      {razorpayConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Razorpay Configuration</CardTitle>
            <CardDescription>Active Razorpay settings from backend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-gray-800 font-mono">
                {JSON.stringify(razorpayConfig, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(razorpayConfig, null, 2))
                toast.success('Config copied to clipboard!')
              }}
              className="mt-3 flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
            >
              <Copy size={16} />
              Copy Config
            </button>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>System and environment details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">API Base URL</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{API_BASE_URL}</code>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Frontend URL</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
              </code>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Auth Token Stored</span>
              <span className={typeof window !== 'undefined' && (sessionStorage.getItem('access_token') || localStorage.getItem('access_token')) ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {typeof window !== 'undefined' && (sessionStorage.getItem('access_token') || localStorage.getItem('access_token'))
                  ? '✓ Yes'
                  : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Browser</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'N/A'}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
