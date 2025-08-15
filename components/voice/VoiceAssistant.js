/**
 * Voice Assistant Component
 * Provides voice input/output capabilities for AI agents
 * Uses browser-native Web Speech API for privacy and zero cost
 */

import React, { useState, useEffect, useRef } from 'react'

export function VoiceAssistant({ 
  onTranscript, 
  onListeningChange,
  agentType = 'master_coach',
  autoSpeak = true,
  agentResponse = null 
}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const speechSynthesis = window.speechSynthesis
    
    if (SpeechRecognition && speechSynthesis) {
      setIsSupported(true)
      initializeRecognition(SpeechRecognition)
    } else {
      setIsSupported(false)
      setError('Voice features not supported in this browser. Please use Chrome or Edge.')
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  const initializeRecognition = (SpeechRecognition) => {
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = 'en-US'
    
    recognition.onstart = () => {
      console.log('🎤 Voice recognition started')
      setIsListening(true)
      setError(null)
      setTranscript('')
      if (onListeningChange) onListeningChange(true)
      
      timeoutRef.current = setTimeout(() => {
        stopListening()
      }, 10000)
    }
    
    recognition.onresult = (event) => {
      clearTimeout(timeoutRef.current)
      
      const current = event.resultIndex
      const transcriptText = event.results[current][0].transcript
      const confidenceScore = event.results[current][0].confidence || 0.9
      
      setTranscript(transcriptText)
      setConfidence(confidenceScore)
      
      if (event.results[current].isFinal) {
        console.log('📝 Final transcript:', transcriptText, 'Confidence:', confidenceScore)
        if (onTranscript && transcriptText.trim().length > 0) {
          onTranscript(transcriptText, confidenceScore)
        }
        stopListening()
      } else {
        timeoutRef.current = setTimeout(() => {
          stopListening()
        }, 3000)
      }
    }
    
    recognition.onerror = (event) => {
      console.error('❌ Voice recognition error:', event.error)
      setIsListening(false)
      if (onListeningChange) onListeningChange(false)
      
      switch(event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.')
          break
        case 'audio-capture':
          setError('Microphone not found. Please check your microphone.')
          break
        case 'not-allowed':
          setError('Microphone permission denied. Please allow microphone access.')
          break
        case 'network':
          setError('Network error. Please check your connection.')
          break
        default:
          setError(`Voice recognition error: ${event.error}`)
      }
    }
    
    recognition.onend = () => {
      console.log('🎤 Voice recognition ended')
      setIsListening(false)
      if (onListeningChange) onListeningChange(false)
      clearTimeout(timeoutRef.current)
    }
    
    recognitionRef.current = recognition
  }
  
  const startListening = async () => {
    if (!isSupported || !recognitionRef.current) {
      setError('Voice features not available')
      return
    }
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      setError(null)
      recognitionRef.current.start()
    } catch (err) {
      console.error('Microphone access error:', err)
      setError('Could not access microphone. Please check permissions.')
    }
  }
  
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      clearTimeout(timeoutRef.current)
    }
  }
  
  useEffect(() => {
    if (agentResponse && autoSpeak && isSupported && !isSpeaking) {
      speakResponse(agentResponse)
    }
  }, [agentResponse, autoSpeak, isSupported])
  
  const speakResponse = (text) => {
    if (!window.speechSynthesis) return
    
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    
    const voices = window.speechSynthesis.getVoices()
    const agentVoice = selectAgentVoice(voices, agentType)
    if (agentVoice) {
      utterance.voice = agentVoice
    }
    
    const voiceParams = getVoiceParameters(agentType)
    utterance.rate = voiceParams.rate
    utterance.pitch = voiceParams.pitch
    utterance.volume = voiceParams.volume
    
    utterance.onstart = () => {
      setIsSpeaking(true)
      console.log('🔊 Speaking:', agentType)
    }
    
    utterance.onend = () => {
      setIsSpeaking(false)
      console.log('🔇 Speech ended')
    }
    
    utterance.onerror = (event) => {
      setIsSpeaking(false)
      console.error('Speech synthesis error:', event)
    }
    
    window.speechSynthesis.speak(utterance)
  }
  
  const selectAgentVoice = (voices, agent) => {
    const agentVoicePreferences = {
      marcus: ['Google US English Male', 'Microsoft David', 'Alex'],
      sophia: ['Google US English Female', 'Microsoft Zira', 'Samantha'],
      david: ['Google UK English Male', 'Microsoft George', 'Daniel'],
      master_coach: ['Google US English Male', 'Microsoft Mark', 'Alex']
    }
    
    const preferences = agentVoicePreferences[agent] || agentVoicePreferences.master_coach
    
    for (const preference of preferences) {
      const voice = voices.find(v => v.name.includes(preference))
      if (voice) return voice
    }
    
    return voices.find(v => v.lang.startsWith('en')) || voices[0]
  }
  
  const getVoiceParameters = (agent) => {
    const parameters = {
      marcus: { rate: 0.9, pitch: 1.0, volume: 1.0 },  // Analytical, measured
      sophia: { rate: 1.1, pitch: 1.1, volume: 1.0 },  // Energetic, enthusiastic
      david: { rate: 0.95, pitch: 0.95, volume: 0.9 }, // Calm, methodical
      master_coach: { rate: 1.0, pitch: 1.0, volume: 1.0 } // Balanced, authoritative
    }
    
    return parameters[agent] || parameters.master_coach
  }
  
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }
  
  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }
  
  return (
    <div className="voice-assistant">
      <div className="flex items-center space-x-4">
        {/* Main Voice Button */}
        <button
          onClick={toggleListening}
          disabled={!isSupported}
          className={`
            relative px-6 py-3 rounded-full font-medium transition-all duration-200
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${!isSupported ? 'opacity-50 cursor-not-allowed' : 'shadow-lg hover:shadow-xl'}
          `}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          <span className="flex items-center space-x-2">
            {isListening ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span>Listening...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>Ask AI</span>
              </>
            )}
          </span>
        </button>
        
        {/* Speaker Control */}
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Stop speaking"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {/* Status Indicators */}
        <div className="flex items-center space-x-2 text-sm">
          {isListening && confidence > 0 && (
            <span className="text-gray-600">
              Confidence: {Math.round(confidence * 100)}%
            </span>
          )}
          {isSpeaking && (
            <span className="text-blue-600 flex items-center">
              <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              Speaking
            </span>
          )}
        </div>
      </div>
      
      {/* Transcript Display */}
      {transcript && (
        <div className="mt-3 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">You said:</span> {transcript}
          </p>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {/* Browser Support Notice */}
      {!isSupported && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Voice features work best in Chrome or Edge browsers.
          </p>
        </div>
      )}
    </div>
  )
}

export default VoiceAssistant