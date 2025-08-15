/**
 * Voice Personalities for AI Agents
 * Defines voice characteristics for each agent personality
 */

export const agentVoiceProfiles = {
  marcus: {
    name: 'Marcus - Financial Coach',
    voicePreferences: [
      'Google US English Male',
      'Microsoft David Desktop',
      'Alex',
      'Daniel'
    ],
    parameters: {
      rate: 0.9,      // Slightly slower for analytical precision
      pitch: 1.0,     // Normal pitch
      volume: 1.0     // Full volume
    },
    personality: 'analytical, measured, confident',
    samplePhrases: [
      'Let me analyze your revenue data',
      'Based on your financial metrics',
      'Your profit margin shows'
    ],
    wakeWords: ['hey marcus', 'marcus', 'financial coach']
  },
  
  sophia: {
    name: 'Sophia - Marketing Expert',
    voicePreferences: [
      'Google US English Female',
      'Microsoft Zira Desktop',
      'Samantha',
      'Victoria'
    ],
    parameters: {
      rate: 1.1,      // Slightly faster for energy
      pitch: 1.1,     // Slightly higher for enthusiasm
      volume: 1.0     // Full volume
    },
    personality: 'energetic, creative, enthusiastic',
    samplePhrases: [
      'Great marketing opportunity here',
      'Your customers would love',
      'Let\'s boost your social presence'
    ],
    wakeWords: ['hey sophia', 'sophia', 'marketing expert']
  },
  
  david: {
    name: 'David - Operations Manager',
    voicePreferences: [
      'Google UK English Male',
      'Microsoft George Desktop',
      'Daniel',
      'Oliver'
    ],
    parameters: {
      rate: 0.95,     // Methodical pace
      pitch: 0.95,    // Slightly lower for calm authority
      volume: 0.9     // Slightly quieter for calm presence
    },
    personality: 'calm, systematic, detail-oriented',
    samplePhrases: [
      'Your schedule optimization shows',
      'Operationally speaking',
      'Let me streamline your workflow'
    ],
    wakeWords: ['hey david', 'david', 'operations manager']
  },
  
  master_coach: {
    name: 'Master Coach - Strategic Advisor',
    voicePreferences: [
      'Google US English Male',
      'Microsoft Mark Desktop',
      'Alex',
      'Richard'
    ],
    parameters: {
      rate: 1.0,      // Balanced pace
      pitch: 1.0,     // Balanced pitch
      volume: 1.0     // Full volume
    },
    personality: 'wise, balanced, strategic',
    samplePhrases: [
      'Looking at the bigger picture',
      'Strategically, you should consider',
      'Let me coordinate the team\'s insights'
    ],
    wakeWords: ['hey coach', 'master coach', 'coach']
  }
}

/**
 * Voice command patterns for different business contexts
 */
export const voiceCommands = {
  revenue: {
    patterns: [
      'what\'s my revenue',
      'how much did I make',
      'show me the money',
      'revenue today',
      'sales numbers'
    ],
    agent: 'marcus'
  },
  
  appointments: {
    patterns: [
      'what\'s my schedule',
      'appointments today',
      'who\'s coming in',
      'next appointment',
      'available slots'
    ],
    agent: 'david'
  },
  
  marketing: {
    patterns: [
      'marketing ideas',
      'how to get customers',
      'social media tips',
      'promotion ideas',
      'customer acquisition'
    ],
    agent: 'sophia'
  },
  
  general: {
    patterns: [
      'help me',
      'what should I do',
      'business advice',
      'recommendations',
      'how to improve'
    ],
    agent: 'master_coach'
  }
}

/**
 * Voice interaction settings
 */
export const voiceSettings = {
  recognition: {
    continuous: false,           // Stop after each phrase
    interimResults: true,        // Show partial results
    maxAlternatives: 3,          // Number of alternatives to consider
    lang: 'en-US',              // Primary language
    alternativeLanguages: [      // Additional language support
      'en-GB',
      'es-US',
      'fr-FR'
    ]
  },
  
  synthesis: {
    defaultRate: 1.0,
    defaultPitch: 1.0,
    defaultVolume: 1.0,
    preloadVoices: true,
    cacheResponses: true
  },
  
  interaction: {
    autoListen: false,           // Don't auto-start listening
    autoSpeak: true,            // Auto-speak responses
    confirmationBeep: true,      // Beep when starting/stopping
    maxListeningTime: 10000,    // 10 seconds max
    silenceTimeout: 3000,       // 3 seconds of silence ends input
    wakeWordTimeout: 30000      // 30 seconds for wake word mode
  },
  
  noiseHandling: {
    enableNoiseSupression: true,
    minimumConfidence: 0.7,     // Minimum confidence to accept
    barbershopMode: true,       // Special handling for noisy environment
    commonNoises: [             // Filter these common barbershop sounds
      'buzzing',
      'clippers',
      'hair dryer',
      'background music'
    ]
  }
}

/**
 * Get voice profile for a specific agent
 */
export function getVoiceProfile(agentType) {
  return agentVoiceProfiles[agentType] || agentVoiceProfiles.master_coach
}

/**
 * Determine agent from voice command
 */
export function detectAgentFromCommand(transcript) {
  const lower = transcript.toLowerCase()
  
  for (const [agent, profile] of Object.entries(agentVoiceProfiles)) {
    for (const wakeWord of profile.wakeWords) {
      if (lower.includes(wakeWord)) {
        return agent
      }
    }
  }
  
  for (const [context, config] of Object.entries(voiceCommands)) {
    for (const pattern of config.patterns) {
      if (lower.includes(pattern)) {
        return config.agent
      }
    }
  }
  
  return 'master_coach'
}

/**
 * Format text for better speech synthesis
 */
export function formatForSpeech(text, agentType) {
  let speechText = text
    .replace(/\*\*/g, '')  // Bold
    .replace(/\*/g, '')    // Italic
    .replace(/#/g, '')     // Headers
    .replace(/`/g, '')     // Code
    .replace(/\n\n/g, '. ') // Paragraphs
    .replace(/\n/g, ', ')  // Line breaks
  
  speechText = speechText.replace(/(\d+\.|\-|\•)/g, '... $1')
  
  const profile = getVoiceProfile(agentType)
  
  if (agentType === 'marcus') {
    speechText = speechText.replace(/\$(\d+)/g, '$1 dollars')
    speechText = speechText.replace(/(\d+)%/g, '$1 percent')
  } else if (agentType === 'sophia') {
    speechText = speechText.replace(/!/g, '!...')
  } else if (agentType === 'david') {
    speechText = speechText.replace(/First,/g, 'First...')
    speechText = speechText.replace(/Second,/g, 'Second...')
    speechText = speechText.replace(/Finally,/g, 'Finally...')
  }
  
  return speechText
}

/**
 * Generate SSML for advanced speech synthesis (future enhancement)
 */
export function generateSSML(text, agentType) {
  const profile = getVoiceProfile(agentType)
  
  return `
    <speak>
      <prosody rate="${profile.parameters.rate}" pitch="${profile.parameters.pitch}">
        ${formatForSpeech(text, agentType)}
      </prosody>
    </speak>
  `
}

/**
 * Voice feedback sounds (using Web Audio API)
 */
export const voiceFeedback = {
  startListening: () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)
  },
  
  stopListening: () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 600
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)
  },
  
  error: () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 300
    oscillator.type = 'square'
    gainNode.gain.value = 0.05
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.2)
  }
}

export default {
  agentVoiceProfiles,
  voiceCommands,
  voiceSettings,
  getVoiceProfile,
  detectAgentFromCommand,
  formatForSpeech,
  generateSSML,
  voiceFeedback
}