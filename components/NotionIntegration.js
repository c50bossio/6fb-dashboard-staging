'use client'

import { useState, useEffect } from 'react'

import { Button, Badge, Alert } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Using emoji alternatives instead of lucide-react for Node.js compatibility
const Database = () => <span>🗄️</span>
const Download = () => <span>⬇️</span>
const CheckCircle = () => <span>✅</span>
const AlertCircle = () => <span>⚠️</span>
const Loader2 = ({ className }) => <span className={`${className} inline-block animate-spin`}>⭕</span>
const Eye = () => <span>👁️</span>
const Settings = () => <span>⚙️</span>
const BookOpen = () => <span>📚</span>
const Brain = () => <span>🧠</span>
const TrendingUp = () => <span>📈</span>
const Zap = () => <span>⚡</span>

export default function NotionIntegration() {
  const [notionToken, setNotionToken] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResults, setExtractionResults] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [demoData, setDemoData] = useState(null)

  useEffect(() => {
    loadDemoData()
  }, [])

  const loadDemoData = async () => {
    try {
      const response = await fetch('/api/admin/notion/demo-data')
      const data = await response.json()
      if (data.success) {
        setDemoData(data.demo_data)
      }
    } catch (error) {
      console.error('Failed to load demo data:', error)
    }
  }

  const testConnection = async () => {
    if (!notionToken.trim()) {
      alert('Please enter your Notion API token first')
      return
    }

    setConnectionStatus('testing')

    try {
      const response = await fetch('/api/admin/notion/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notion_token: notionToken.trim() })
      })

      const result = await response.json()
      setConnectionStatus(result.success ? 'connected' : 'failed')

      if (!result.success) {
        alert(`Connection failed: ${result.error || 'Unknown error'}`)
      }

    } catch (error) {
      setConnectionStatus('failed')
      alert(`Connection test failed: ${error.message}`)
    }
  }

  const extractKnowledge = async () => {
    if (!notionToken.trim()) {
      alert('Please enter your Notion API token first')
      return
    }

    if (connectionStatus !== 'connected') {
      alert('Please test your connection first')
      return
    }

    setIsExtracting(true)
    setExtractionResults(null)

    try {
      const response = await fetch('/api/admin/notion/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notion_token: notionToken.trim(),
          query: null // Extract all business-related pages
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setExtractionResults(result)
        alert(`Success! Imported ${result.entries_imported} knowledge entries from your Notion workspace.`)
      } else {
        throw new Error(result.error || 'Extraction failed')
      }

    } catch (error) {
      alert(`Knowledge extraction failed: ${error.message}`)
      setExtractionResults({ success: false, error: error.message })
    } finally {
      setIsExtracting(false)
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-olive-600" />
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Settings className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6 text-gold-600" />
        <h2 className="text-2xl font-bold text-gray-900">Notion Knowledge Extraction</h2>
        <Badge className="bg-gold-100 text-gold-800 px-2 py-1 rounded text-xs">Automated</Badge>
      </div>

      <Alert className="p-4 border border-olive-200 bg-olive-50 rounded-lg">
        <Brain className="h-4 w-4" />
        <div className="ml-2">
          <strong>Intelligent Knowledge Import:</strong> This will automatically scan your Notion workspace, 
          extract barbershop business knowledge, categorize it by domain, and import it to your global AI knowledge base.
          All customers will benefit immediately from your expertise!
        </div>
      </Alert>

      {/* Setup Guide Toggle */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Setup Integration</CardTitle>
              <CardDescription>
                Connect your Notion workspace to extract business knowledge
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showSetupGuide ? 'Hide' : 'Show'} Setup Guide
            </Button>
          </div>
        </CardHeader>
        
        {showSetupGuide && (
          <CardContent className="border-t pt-4">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">📋 3-Step Setup Process:</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-olive-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <div>
                      <p className="font-medium">Create Notion Integration</p>
                      <p className="text-sm text-gray-600">
                        Go to <a href="https://www.notion.so/my-integrations" target="_blank" className="text-olive-600 underline">notion.so/my-integrations</a> → 
                        "New Integration" → Name it "6FB AI Knowledge" → Copy the token
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-olive-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <div>
                      <p className="font-medium">Share Pages with Integration</p>
                      <p className="text-sm text-gray-600">
                        On your business pages → Click "Share" → Invite "6FB AI Knowledge" → Grant "Read" access
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-olive-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <div>
                      <p className="font-medium">Extract Knowledge</p>
                      <p className="text-sm text-gray-600">
                        Paste token below → Test connection → Extract knowledge (automatic!)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="font-medium text-green-800 mb-1">✅ Will Extract:</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Standard Operating Procedures</li>
                    <li>• Staff training materials</li>
                    <li>• Customer service protocols</li>
                    <li>• Marketing strategies</li>
                    <li>• Pricing guidelines</li>
                  </ul>
                </div>
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="font-medium text-red-800 mb-1">🔒 Won't Access:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Personal information</li>
                    <li>• Financial details</li>
                    <li>• Private customer data</li>
                    <li>• Unshared pages</li>
                    <li>• Non-business content</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Connection Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Notion API Connection</CardTitle>
          <CardDescription>
            Enter your Notion integration token to connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Notion Integration Token</label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={notionToken}
                onChange={(e) => setNotionToken(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
              />
              <Button
                onClick={testConnection}
                disabled={!notionToken.trim() || connectionStatus === 'testing'}
                className="bg-olive-600 text-white hover:bg-olive-700 px-4 py-2 rounded flex items-center gap-2"
              >
                {getConnectionStatusIcon()}
                Test
              </Button>
            </div>
            {connectionStatus === 'connected' && (
              <p className="text-sm text-green-600">✅ Connection successful! Ready to extract knowledge.</p>
            )}
            {connectionStatus === 'failed' && (
              <p className="text-sm text-red-600">❌ Connection failed. Check your token and try again.</p>
            )}
          </div>

          <Button
            onClick={extractKnowledge}
            disabled={connectionStatus !== 'connected' || isExtracting}
            className="w-full bg-gold-700 text-white hover:bg-gold-700 px-4 py-2 rounded flex items-center justify-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting Knowledge...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Extract All Business Knowledge
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Extraction Results */}
      {extractionResults && (
        <Card>
          <CardHeader>
            <CardTitle>
              {extractionResults.success ? '✅ Extraction Complete!' : '❌ Extraction Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extractionResults.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-olive-50 p-4 rounded-lg text-center">
                    <BookOpen className="h-8 w-8 text-olive-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-olive-900">{extractionResults.entries_imported}</p>
                    <p className="text-sm text-olive-700">Entries Imported</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">{extractionResults.domains_covered?.length || 0}</p>
                    <p className="text-sm text-green-700">Domains Covered</p>
                  </div>
                  <div className="bg-gold-50 p-4 rounded-lg text-center">
                    <Brain className="h-8 w-8 text-gold-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gold-900">{Math.round((extractionResults.average_confidence || 0) * 100)}%</p>
                    <p className="text-sm text-gold-700">Avg Confidence</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <Zap className="h-8 w-8 text-amber-800 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-900">Immediate</p>
                    <p className="text-sm text-yellow-700">AI Improvement</p>
                  </div>
                </div>

                {extractionResults.domains_covered && extractionResults.domains_covered.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Business Domains Imported:</p>
                    <div className="flex flex-wrap gap-2">
                      {extractionResults.domains_covered.map((domain, index) => (
                        <Badge key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {domain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <div className="ml-2">
                    <strong>Success!</strong> Your Notion knowledge has been imported and is now enhancing 
                    AI responses for all barbershop customers. The AI will immediately provide more accurate, 
                    personalized recommendations based on your proven strategies.
                  </div>
                </Alert>
              </div>
            ) : (
              <Alert className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <strong>Extraction Failed:</strong> {extractionResults.error}
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demo/Preview Data */}
      {demoData && !extractionResults && (
        <Card>
          <CardHeader>
            <CardTitle>Preview: What Would Be Extracted</CardTitle>
            <CardDescription>
              Sample of the type of knowledge that would be extracted from a typical barbershop Notion workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoData.sample_extractions?.slice(0, 2).map((sample, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{sample.page_title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className="px-2 py-1 text-xs bg-olive-100 text-olive-800 rounded">
                        {sample.detected_domain.replace('_', ' ')}
                      </Badge>
                      <Badge className="px-2 py-1 text-xs bg-moss-100 text-moss-900 rounded">
                        {Math.round(sample.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{sample.extracted_content}</p>
                  <div className="flex flex-wrap gap-1">
                    {sample.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-4 bg-olive-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-olive-900">{demoData.extraction_summary?.knowledge_entries_created}</p>
                    <p className="text-sm text-olive-700">Knowledge Entries</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-olive-900">{Math.round((demoData.extraction_summary?.average_confidence_score || 0) * 100)}%</p>
                    <p className="text-sm text-olive-700">Avg Confidence</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-olive-900">{demoData.extraction_summary?.domains_covered?.length}</p>
                    <p className="text-sm text-olive-700">Business Domains</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}