'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import {
  MicrophoneIcon as MicrophoneSolid
} from '@heroicons/react/24/solid'

export default function VoiceAssistant({ barbershop_id = 'demo' }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)

  const recognitionRef = useRef(null)
  const synthRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    // Check for browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const speechSynthesis = window.speechSynthesis
      
      if (!SpeechRecognition || !speechSynthesis) {
        setIsSupported(false)
        setError('Voice features not supported in this browser. Try Chrome or Safari.')
        return
      }

      // Initialize Speech Recognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
        setTranscript('')
      }
      
      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        setTranscript(finalTranscript || interimTranscript)
      }
      
      recognition.onend = () => {
        setIsListening(false)
        if (transcript.trim()) {
          processVoiceCommand(transcript.trim())
        }
      }
      
      recognition.onerror = (event) => {
        setIsListening(false)
        setError(`Speech recognition error: ${event.error}`)
      }
      
      recognitionRef.current = recognition

      // Initialize session
      const voiceSessionId = `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(voiceSessionId)
    }
  }, [transcript])

  const startListening = async () => {
    if (!isSupported || !recognitionRef.current) return
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })
      recognitionRef.current.start()
    } catch (err) {
      setError('Microphone access denied. Please enable microphone permissions.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const processVoiceCommand = async (command) => {
    setIsProcessing(true)
    try {
      // Enhanced voice command processing
      const processedCommand = preprocessVoiceCommand(command)
      
      const response = await fetch('/api/ai/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: processedCommand,
          original_command: command,
          session_id: sessionId,
          barbershop_id,
          context: 'voice_interaction'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResponse(data)
        
        // If response includes voice synthesis
        if (data.voice_response && data.voice_response.speak) {
          speakResponse(data.voice_response.text)
        }
        
        // Execute any actions
        if (data.actions && data.actions.length > 0) {
          executeVoiceActions(data.actions)
        }
      } else {
        setError(data.error || 'Failed to process voice command')
      }
    } catch (error) {
      console.error('Voice command processing failed:', error)
      setError('Failed to process voice command')
    } finally {
      setIsProcessing(false)
    }
  }

  const preprocessVoiceCommand = (command) => {
    // Convert common voice patterns to better text commands
    const patterns = [
      { pattern: /how are (bookings|appointments) looking/i, replacement: 'Show me today\'s booking status' },
      { pattern: /what('s| is) my revenue/i, replacement: 'Show me today\'s revenue' },
      { pattern: /create (a )?promotion/i, replacement: 'Create a promotional campaign' },
      { pattern: /send (a )?message to customers/i, replacement: 'Send message to customers' },
      { pattern: /how many customers/i, replacement: 'Show customer count and stats' },
      { pattern: /what('s| is) next/i, replacement: 'Show upcoming appointments' },
      { pattern: /business health/i, replacement: 'Show business health status' },
      { pattern: /tasks|to do/i, replacement: 'Show my pending tasks' }
    ]

    let processedCommand = command
    patterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(command)) {
        processedCommand = replacement
      }
    })

    return processedCommand
  }

  const speakResponse = (text) => {
    if (!window.speechSynthesis) return

    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    window.speechSynthesis.speak(utterance)
    synthRef.current = utterance
  }

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
    }
  }

  const executeVoiceActions = (actions) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'navigate':
          window.location.href = action.url
          break
        case 'display_data':
          // Data is already in response, handled by UI
          break
        case 'create_task':
          // Task creation handled by backend
          alert(`✅ Task created: ${action.title}`)
          break
        default:
          console.log('Unknown action:', action)
      }
    })
  }

  const getVoiceCommands = () => [
    { command: "How are bookings looking?", description: "Check today's appointments" },
    { command: "What's my revenue?", description: "Get revenue status" },
    { command: "Show business health", description: "Get health overview" },
    { command: "What are my tasks?", description: "List pending tasks" },
    { command: "Create a promotion", description: "Generate promotional campaign" },
    { command: "Send message to customers", description: "Customer outreach" }
  ]

  if (!isSupported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <XMarkIcon className="h-5 w-5 text-red-500" />
          <span className="text-red-800 font-medium">Voice Assistant Unavailable</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <SpeakerWaveIcon className="h-5 w-5 text-olive-500" />
          <h3 className="font-semibold text-gray-900">Voice Assistant</h3>
          {isListening && (
            <span className="bg-softred-100 text-softred-900 text-xs px-2 py-1 rounded-full animate-pulse">
              Listening...
            </span>
          )}
        </div>
        
        {isPlaying && (
          <button
            onClick={stopSpeaking}
            className="text-gray-600 hover:text-gray-800"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Voice Control Button */}
        <div className="text-center mb-6">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-olive-500 hover:bg-olive-600 hover:scale-105'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? (
              <ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
            ) : isListening ? (
              <MicrophoneSolid className="h-8 w-8 text-white" />
            ) : (
              <MicrophoneIcon className="h-8 w-8 text-white" />
            )}
            
            {isListening && (
              <div className="absolute -inset-1 rounded-full border-2 border-red-300 animate-ping"></div>
            )}
          </button>
          
          <p className="text-sm text-gray-600 mt-3">
            {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Tap to speak'}
          </p>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-xs text-gray-500 mb-1">You said:</div>
            <div className="text-sm font-medium text-gray-900">{transcript}</div>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="bg-olive-50 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs text-olive-500 mb-1">AI Assistant:</div>
                <div className="text-sm text-olive-900">{response.response || response.message}</div>
                
                {response.data && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="text-xs text-gray-500 mb-2">Retrieved Data:</div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                )}
                
                {response.suggestions && response.suggestions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-olive-500 mb-1">Try saying:</div>
                    <div className="space-y-1">
                      {response.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => processVoiceCommand(suggestion)}
                          className="block text-xs text-olive-700 hover:text-olive-900 hover:underline text-left"
                        >
                          "{suggestion}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {response.voice_response?.text && (
                <button
                  onClick={() => speakResponse(response.voice_response.text)}
                  className="ml-2 text-olive-600 hover:text-olive-800"
                  title="Play response"
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Voice Commands Help */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Try these voice commands:</h4>
          <div className="grid grid-cols-1 gap-2">
            {getVoiceCommands().map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => processVoiceCommand(cmd.command)}
                className="text-left p-2 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">"{cmd.command}"</div>
                <div className="text-xs text-gray-600">{cmd.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}