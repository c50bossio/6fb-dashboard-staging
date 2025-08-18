/**
 * Emotion Recognition Service
 * Advanced emotion detection for text and voice interactions
 */

class EmotionRecognitionService {
  constructor() {
    this.emotionTypes = {
      HAPPY: 'happy',
      FRUSTRATED: 'frustrated', 
      CONFUSED: 'confused',
      SATISFIED: 'satisfied',
      ANGRY: 'angry',
      ANXIOUS: 'anxious',
      EXCITED: 'excited',
      NEUTRAL: 'neutral'
    }

    this.emotionPatterns = {
      happy: {
        keywords: ['great', 'awesome', 'love', 'perfect', 'amazing', 'excellent', 'wonderful', 'fantastic', 'pleased', 'delighted'],
        phrases: ['thank you', 'so good', 'really happy', 'love it', 'exactly what'],
        punctuation: ['!', '😊', '😃', '🎉', '❤️', '👍'],
        weight: 1.2
      },
      frustrated: {
        keywords: ['frustrated', 'annoying', 'ridiculous', 'stupid', 'waste', 'pointless', 'useless', 'horrible'],
        phrases: ['not working', 'keeps failing', 'so annoying', 'this is ridiculous', 'waste of time'],
        punctuation: ['!!!', '😤', '😠', '🙄'],
        weight: 1.5
      },
      confused: {
        keywords: ['confused', 'unclear', 'understand', 'explain', 'help', 'lost', 'what', 'how'],
        phrases: ["don't understand", "not clear", "can you explain", "i'm lost", "what does", "how do i"],
        punctuation: ['?', '???', '🤔', '😕'],
        weight: 1.0
      },
      satisfied: {
        keywords: ['satisfied', 'good', 'fine', 'okay', 'works', 'solved', 'resolved', 'fixed'],
        phrases: ['that works', 'good enough', 'problem solved', 'got it working'],
        punctuation: ['👌', '✅', '☑️'],
        weight: 1.0
      },
      angry: {
        keywords: ['angry', 'mad', 'furious', 'terrible', 'awful', 'worst', 'hate', 'disgusting', 'pathetic'],
        phrases: ['really angry', 'so mad', 'absolutely terrible', 'worst service', 'hate this'],
        punctuation: ['!!!', '😡', '🤬', '💢'],
        weight: 2.0
      },
      anxious: {
        keywords: ['worried', 'concerned', 'nervous', 'anxious', 'scared', 'afraid', 'uncertain'],
        phrases: ["i'm worried", "concerned about", "not sure if", "what if", "scared that"],
        punctuation: ['😰', '😟', '😱'],
        weight: 1.3
      },
      excited: {
        keywords: ['excited', 'thrilled', 'amazing', 'incredible', 'wow', 'fantastic', 'outstanding'],
        phrases: ["can't wait", "so excited", "this is amazing", "absolutely incredible"],
        punctuation: ['!!', '🎉', '🤩', '🔥', '✨'],
        weight: 1.4
      }
    }

    this.voiceIndicators = {
      pitch: { high: ['excited', 'anxious'], low: ['sad', 'frustrated'] },
      tempo: { fast: ['excited', 'anxious'], slow: ['confused', 'sad'] },
      volume: { loud: ['angry', 'excited'], quiet: ['anxious', 'sad'] }
    }
  }

  /**
   * Analyze text sentiment and return emotion analysis
   * @param {string} text - Text to analyze
   * @param {Object} context - Additional context (user history, etc.)
   * @returns {Object} Emotion analysis results
   */
  async analyzeSentiment(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return this.createEmotionResult(this.emotionTypes.NEUTRAL, 0.5, 'No text provided');
    }

    const normalizedText = text.toLowerCase().trim();
    const emotionScores = {};

    Object.keys(this.emotionPatterns).forEach(emotion => {
      emotionScores[emotion] = 0;
    });

    Object.entries(this.emotionPatterns).forEach(([emotion, pattern]) => {
      let score = 0;

      pattern.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (normalizedText.match(regex) || []).length;
        score += matches * 0.3;
      });

      pattern.phrases.forEach(phrase => {
        if (normalizedText.includes(phrase)) {
          score += 0.5;
        }
      });

      pattern.punctuation.forEach(punct => {
        const count = (text.match(new RegExp(punct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += count * 0.2;
      });

      emotionScores[emotion] = score * pattern.weight;
    });

    if (context.previousEmotion) {
      this.applyContextualAdjustments(emotionScores, context);
    }

    const dominantEmotion = this.getDominantEmotion(emotionScores);
    const confidence = this.calculateConfidence(emotionScores, dominantEmotion);

    const analysis = {
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
      punctuationIntensity: this.getPunctuationIntensity(text),
      emotionalWords: this.getEmotionalWords(text),
      sentiment_polarity: this.calculatePolarity(emotionScores)
    };

    return this.createEmotionResult(dominantEmotion, confidence, 'Text analysis completed', {
      allScores: emotionScores,
      analysis,
      suggestions: this.getResponseSuggestions(dominantEmotion, confidence)
    });
  }

  /**
   * Analyze voice emotion (placeholder for future implementation)
   * @param {Object} voiceData - Voice analysis data
   * @returns {Object} Voice emotion analysis
   */
  async analyzeVoiceEmotion(voiceData) {
    // - Pitch patterns
    // - Speaking rate
    // - Volume variations
    // - Voice tremor/stability
    
    return {
      emotion: this.emotionTypes.NEUTRAL,
      confidence: 0.7,
      voiceFeatures: {
        pitch: voiceData.pitch || 'normal',
        tempo: voiceData.tempo || 'normal',
        volume: voiceData.volume || 'normal'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate empathetic response based on detected emotion
   * @param {string} emotion - Detected emotion
   * @param {number} confidence - Confidence level
   * @param {string} originalMessage - Original user message
   * @param {Object} businessContext - Business context
   * @returns {Object} Empathetic response suggestions
   */
  generateEmpatheticResponse(emotion, confidence, originalMessage, businessContext = {}) {
    const responseStrategies = {
      happy: {
        tone: 'enthusiastic and supportive',
        phrases: ["That's wonderful to hear!", "I'm so glad you're happy!", "Your enthusiasm is contagious!"],
        approach: 'amplify positive energy, build on success',
        followUp: 'What other ways can we help maintain this positive experience?'
      },
      frustrated: {
        tone: 'calm and understanding',
        phrases: ["I understand your frustration.", "Let me help resolve this for you.", "I can see why this would be frustrating."],
        approach: 'acknowledge feelings, focus on solutions',
        followUp: 'What specific aspect is causing the most frustration so I can address it directly?'
      },
      confused: {
        tone: 'patient and explanatory',
        phrases: ["Let me clarify that for you.", "I'll explain this step by step.", "No worries, this can be confusing."],
        approach: 'simplify explanations, use examples',
        followUp: 'Would you like me to break this down into smaller steps?'
      },
      satisfied: {
        tone: 'warm and professional',
        phrases: ["I'm pleased this is working well for you.", "Great to hear you're satisfied!", "Excellent! You're all set."],
        approach: 'reinforce success, offer additional value',
        followUp: 'Is there anything else I can help optimize for you?'
      },
      angry: {
        tone: 'empathetic and solution-focused',
        phrases: ["I sincerely apologize for this experience.", "Let me make this right for you.", "I understand how upsetting this must be."],
        approach: 'validate feelings, immediate action, follow-up commitment',
        followUp: 'What would be the most helpful way to resolve this situation for you?'
      },
      anxious: {
        tone: 'reassuring and supportive',
        phrases: ["I'm here to help guide you through this.", "Let's take this one step at a time.", "You're in good hands."],
        approach: 'provide reassurance, clear next steps, reduce uncertainty',
        followUp: 'What specific concerns can I address to help you feel more confident?'
      },
      excited: {
        tone: 'energetic and celebratory',
        phrases: ["That's fantastic!", "I love your enthusiasm!", "This is going to be great!"],
        approach: 'match energy level, capitalize on momentum',
        followUp: 'What aspects are you most excited about? Let me help you maximize that!'
      },
      neutral: {
        tone: 'professional and helpful',
        phrases: ["I'm here to help.", "Let me assist you with that.", "What can I help you with today?"],
        approach: 'standard helpful approach, probe for more context',
        followUp: 'How can I best support your business goals today?'
      }
    };

    const strategy = responseStrategies[emotion] || responseStrategies.neutral;
    
    let contextualAdjustments = '';
    if (businessContext.isOwner) {
      contextualAdjustments = 'As a business owner, ';
    } else if (businessContext.isStaff) {
      contextualAdjustments = 'In your role as staff, ';
    }

    return {
      emotion,
      confidence,
      strategy: {
        ...strategy,
        contextualAdjustments,
        recommendedResponse: this.craftResponse(emotion, strategy, businessContext),
        emergencyEscalation: this.shouldEscalate(emotion, confidence),
        trackingRecommended: confidence > 0.8 // High confidence emotions should be tracked
      },
      metadata: {
        timestamp: new Date().toISOString(),
        originalMessage: originalMessage.substring(0, 100),
        analysisVersion: '2.0'
      }
    };
  }

  /**
   * Track sentiment over time for analytics
   * @param {string} userId - User identifier
   * @param {Object} emotionResult - Emotion analysis result
   * @param {Object} context - Additional context
   */
  async trackSentiment(userId, emotionResult, context = {}) {
    const sentimentRecord = {
      userId,
      emotion: emotionResult.emotion,
      confidence: emotionResult.confidence,
      timestamp: new Date().toISOString(),
      context: {
        messageLength: context.messageLength || 0,
        sessionId: context.sessionId,
        businessContext: context.businessContext,
        previousEmotion: context.previousEmotion
      },
      metadata: emotionResult.metadata || {}
    };

    
    try {
      const existingData = localStorage.getItem('sentiment_tracking') || '[]';
      const sentimentHistory = JSON.parse(existingData);
      sentimentHistory.push(sentimentRecord);
      
      if (sentimentHistory.length > 100) {
        sentimentHistory.splice(0, sentimentHistory.length - 100);
      }
      
      localStorage.setItem('sentiment_tracking', JSON.stringify(sentimentHistory));
    } catch (error) {
      console.warn('Could not save sentiment tracking data:', error);
    }

    return sentimentRecord;
  }

  /**
   * Get sentiment history for analytics
   * @param {string} userId - User identifier
   * @param {number} days - Number of days to retrieve
   * @returns {Array} Sentiment history
   */
  getSentimentHistory(userId, days = 30) {
    try {
      const sentimentHistory = JSON.parse(localStorage.getItem('sentiment_tracking') || '[]');
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      
      return sentimentHistory
        .filter(record => record.userId === userId)
        .filter(record => new Date(record.timestamp) > cutoffDate)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.warn('Could not retrieve sentiment history:', error);
      return [];
    }
  }

  getDominantEmotion(scores) {
    const entries = Object.entries(scores);
    const maxEntry = entries.reduce((max, current) => current[1] > max[1] ? current : max);
    return maxEntry[1] > 0.1 ? maxEntry[0] : this.emotionTypes.NEUTRAL;
  }

  calculateConfidence(scores, dominantEmotion) {
    const maxScore = scores[dominantEmotion] || 0;
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    if (totalScore === 0) return 0.5;
    
    const confidence = maxScore / totalScore;
    return Math.min(Math.max(confidence, 0.1), 0.95); // Clamp between 0.1 and 0.95
  }

  calculatePolarity(scores) {
    const positiveEmotions = ['happy', 'satisfied', 'excited'];
    const negativeEmotions = ['frustrated', 'angry', 'anxious'];
    
    const positiveScore = positiveEmotions.reduce((sum, emotion) => sum + (scores[emotion] || 0), 0);
    const negativeScore = negativeEmotions.reduce((sum, emotion) => sum + (scores[emotion] || 0), 0);
    
    const totalScore = positiveScore + negativeScore;
    if (totalScore === 0) return 0;
    
    return (positiveScore - negativeScore) / totalScore;
  }

  getPunctuationIntensity(text) {
    const intensePunctuation = text.match(/[!]{2,}|[?]{2,}|[.]{3,}/g) || [];
    return intensePunctuation.length;
  }

  getEmotionalWords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const emotionalWords = [];
    
    Object.entries(this.emotionPatterns).forEach(([emotion, pattern]) => {
      words.forEach(word => {
        if (pattern.keywords.includes(word)) {
          emotionalWords.push({ word, emotion });
        }
      });
    });
    
    return emotionalWords;
  }

  applyContextualAdjustments(scores, context) {
    if (context.previousEmotion === 'frustrated' && scores.frustrated < 0.5) {
      scores.satisfied += 0.3;
    }
    
    if (context.sentimentTrend === 'declining') {
      ['frustrated', 'angry', 'anxious'].forEach(emotion => {
        scores[emotion] *= 1.2;
      });
    }
  }

  getResponseSuggestions(emotion, confidence) {
    if (confidence < 0.6) {
      return ['Ask clarifying questions to better understand the emotional context'];
    }

    const suggestions = {
      happy: ['Capitalize on positive momentum', 'Offer additional value-add services'],
      frustrated: ['Focus on immediate problem-solving', 'Provide clear next steps'],
      confused: ['Simplify explanations', 'Offer step-by-step guidance'],
      satisfied: ['Reinforce positive experience', 'Suggest related services'],
      angry: ['Prioritize immediate resolution', 'Consider management escalation'],
      anxious: ['Provide reassurance and clear information', 'Offer additional support'],
      excited: ['Match enthusiasm level', 'Present relevant opportunities'],
      neutral: ['Probe for more emotional context', 'Use standard professional approach']
    };

    return suggestions[emotion] || suggestions.neutral;
  }

  craftResponse(emotion, strategy, businessContext) {
    const phrases = strategy.phrases;
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    let response = randomPhrase + ' ';
    
    if (businessContext.shopName) {
      response += `As someone who cares about ${businessContext.shopName}'s success, `;
    }
    
    response += strategy.followUp;
    
    return response;
  }

  shouldEscalate(emotion, confidence) {
    return (emotion === 'angry' && confidence > 0.8) || 
           (emotion === 'frustrated' && confidence > 0.9);
  }

  createEmotionResult(emotion, confidence, message, additionalData = {}) {
    return {
      emotion,
      confidence: Math.round(confidence * 100) / 100,
      message,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
  }
}

const emotionService = new EmotionRecognitionService();
export default emotionService;