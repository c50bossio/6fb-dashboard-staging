'use client'

import { useState } from 'react'
import VoiceEnabledAIChat from '../../components/ai/VoiceEnabledAIChat'

export default function TestVoicePage() {
  const [testResults, setTestResults] = useState([])
  const [isTestingBrowser, setIsTestingBrowser] = useState(false)

  // Test browser compatibility
  const testBrowserSupport = () => {
    setIsTestingBrowser(true)
    const results = []

    // Test Speech Recognition
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    results.push({
      feature: 'Speech Recognition',
      supported: hasSpeechRecognition,
      status: hasSpeechRecognition ? '✅ Supported' : '❌ Not Supported'
    })

    // Test Speech Synthesis
    const hasSpeechSynthesis = 'speechSynthesis' in window
    results.push({
      feature: 'Speech Synthesis',
      supported: hasSpeechSynthesis,
      status: hasSpeechSynthesis ? '✅ Supported' : '❌ Not Supported'
    })

    // Test Microphone API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          results.push({
            feature: 'Microphone Access',
            supported: true,
            status: '✅ Granted'
          })
          setTestResults(results)
        })
        .catch((err) => {
          results.push({
            feature: 'Microphone Access',
            supported: false,
            status: `❌ ${err.message}`
          })
          setTestResults(results)
        })
    } else {
      results.push({
        feature: 'Microphone Access',
        supported: false,
        status: '❌ Not Available'
      })
    }

    // List available voices
    if (hasSpeechSynthesis) {
      const voices = speechSynthesis.getVoices()
      results.push({
        feature: 'Available Voices',
        supported: true,
        status: `✅ ${voices.length} voices found`
      })
    }

    setTestResults(results)
    setIsTestingBrowser(false)
  }

  // Test voice commands
  const testCommands = [
    { command: "Hey Marcus, what's my revenue?", agent: 'Marcus', category: 'Financial' },
    { command: "Sophia, marketing ideas", agent: 'Sophia', category: 'Marketing' },
    { command: "David, show my schedule", agent: 'David', category: 'Operations' },
    { command: "Hey Coach, business advice", agent: 'Master Coach', category: 'Strategy' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Assistant Testing Page 🎤</h1>
        <p className="text-gray-600 mb-8">Test and debug the voice assistant features</p>

        {/* Browser Compatibility Test */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Browser Compatibility Check</h2>
          
          <button
            onClick={testBrowserSupport}
            disabled={isTestingBrowser}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isTestingBrowser ? 'Testing...' : 'Run Browser Tests'}
          </button>

          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{result.feature}</span>
                  <span className={result.supported ? 'text-green-600' : 'text-red-600'}>
                    {result.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Recommended Browsers:</strong> Chrome or Edge for best compatibility
            </p>
          </div>
        </div>

        {/* Voice Command Examples */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Voice Command Examples</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCommands.map((test, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">{test.category}</span>
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {test.agent}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">"{test.command}"</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> Click the microphone button and speak any of these commands
            </p>
          </div>
        </div>

        {/* Voice Testing Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          
          <ol className="space-y-3 text-gray-700">
            <li className="flex">
              <span className="font-bold mr-2">1.</span>
              Click the microphone button in the chat below
            </li>
            <li className="flex">
              <span className="font-bold mr-2">2.</span>
              Wait for the listening indicator (red pulsing button)
            </li>
            <li className="flex">
              <span className="font-bold mr-2">3.</span>
              Speak clearly using one of the example commands
            </li>
            <li className="flex">
              <span className="font-bold mr-2">4.</span>
              Watch for the transcript to appear
            </li>
            <li className="flex">
              <span className="font-bold mr-2">5.</span>
              Listen for the AI agent's voice response
            </li>
          </ol>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-1">Good Environment</h3>
              <p className="text-sm text-green-700">Quiet room, clear speech</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-1">Moderate Noise</h3>
              <p className="text-sm text-yellow-700">Background music, some talking</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-1">Challenging</h3>
              <p className="text-sm text-red-700">Loud environment, multiple voices</p>
            </div>
          </div>
        </div>

        {/* Voice Personality Test */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Agent Voice Personalities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <h3 className="font-bold text-green-900 mb-2">💰 Marcus</h3>
              <p className="text-sm text-green-700 mb-2">Financial Coach</p>
              <ul className="text-xs text-green-600 space-y-1">
                <li>• Slower pace (0.9x)</li>
                <li>• Analytical tone</li>
                <li>• Measured delivery</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <h3 className="font-bold text-purple-900 mb-2">📱 Sophia</h3>
              <p className="text-sm text-purple-700 mb-2">Marketing Expert</p>
              <ul className="text-xs text-purple-600 space-y-1">
                <li>• Faster pace (1.1x)</li>
                <li>• Higher pitch</li>
                <li>• Energetic delivery</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-2">📋 David</h3>
              <p className="text-sm text-blue-700 mb-2">Operations Manager</p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Calm pace (0.95x)</li>
                <li>• Lower pitch</li>
                <li>• Methodical delivery</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
              <h3 className="font-bold text-amber-900 mb-2">🎯 Coach</h3>
              <p className="text-sm text-amber-700 mb-2">Strategic Advisor</p>
              <ul className="text-xs text-amber-600 space-y-1">
                <li>• Balanced pace (1.0x)</li>
                <li>• Normal pitch</li>
                <li>• Authoritative delivery</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Voice-Enabled Chat Component */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Voice Assistant Chat Interface</h2>
          <VoiceEnabledAIChat />
        </div>

        {/* Debug Information */}
        <div className="mt-8 bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm">
          <h3 className="text-white font-bold mb-4">Debug Console</h3>
          <p>Open Browser DevTools (F12) to see:</p>
          <ul className="mt-2 space-y-1">
            <li>🎤 Voice recognition events</li>
            <li>📝 Transcript confidence scores</li>
            <li>🤖 Agent detection logs</li>
            <li>🔊 Speech synthesis events</li>
            <li>🔴 Error messages if any</li>
          </ul>
        </div>
      </div>
    </div>
  )
}