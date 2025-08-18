'use client'

import { 
  SparklesIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  ArrowsPointingOutIcon,
  MicrophoneIcon,
  HeartIcon,
  FaceSmileIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '../lib/supabase/client'
import { useAuth } from './SupabaseAuthProvider'

export default function FloatingAIChat() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [position, setPosition] = useState('bottom-right') // bottom-right, bottom-left, top-right, top-left
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const widgetRef = useRef(null)
  const [shopData, setShopData] = useState(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState(null)
  const [businessContext, setBusinessContext] = useState(null)
  const [contextLoaded, setContextLoaded] = useState(false)
  const formatCurrency = (value) => {
    if (!value) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getProactiveGreeting = () => {
    const hour = new Date().getHours()
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    
    let greeting = ''
    if (hour < 12) {
      greeting = '☀️ Good morning!'
    } else if (hour < 17) {
      greeting = '👋 Good afternoon!'
    } else {
      greeting = '🌙 Good evening!'
    }
    
    let proactiveSuggestion = ''
    if (dayOfWeek === 'Monday') {
      proactiveSuggestion = "It's Monday - would you like to see last week's performance summary?"
    } else if (dayOfWeek === 'Friday') {
      proactiveSuggestion = "Happy Friday! Want to check your weekend appointment schedule?"
    } else if (hour < 10) {
      proactiveSuggestion = "Ready to check today's appointments?"
    } else if (hour > 16) {
      proactiveSuggestion = "Want to see today's revenue summary?"
    } else {
      proactiveSuggestion = "How can I help optimize your business today?"
    }
    
    return `${greeting} ${proactiveSuggestion}`
  }
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: getProactiveGreeting(),
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showRating, setShowRating] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const getQuickActions = () => {
    if (contextLoaded && businessContext) {
      const actions = []
      
      if (businessContext.analytics?.revenue) {
        actions.push({
          icon: '💰',
          text: `Today's Revenue (${formatCurrency(businessContext.analytics.revenue.daily)})`,
          query: `My daily revenue is ${formatCurrency(businessContext.analytics.revenue.daily)}. How does this compare to optimal levels?`
        })
      }
      
      if (businessContext.analytics?.bookings?.today) {
        actions.push({
          icon: '📅',
          text: `Today's Bookings (${businessContext.analytics.bookings.today})`,
          query: `I have ${businessContext.analytics.bookings.today} bookings today. What insights can you provide about my schedule?`
        })
      }
      
      if (businessContext.alerts?.active_alerts?.length > 0) {
        actions.push({
          icon: '⚠️',
          text: `Active Alerts (${businessContext.alerts.active_alerts.length})`,
          query: `I have ${businessContext.alerts.active_alerts.length} active business alerts. What should I prioritize?`
        })
      }
      
      if (businessContext.predictions?.revenue_forecast) {
        actions.push({
          icon: '🔮',
          text: 'Revenue Forecast',
          query: 'Based on my current trends, what does my revenue forecast look like for next week?'
        })
      }
      
      if (businessContext.analytics?.customers) {
        actions.push({
          icon: '👥',
          text: `Customers (${businessContext.analytics.customers.total})`,
          query: `I have ${businessContext.analytics.customers.total} total customers. What insights can you share about retention and growth?`
        })
      }
      
      return actions.slice(0, 5) // Limit to 5 actions
    }
    
    return [
      { icon: '💰', text: "Today's Revenue", query: "How much revenue have I made today?" },
      { icon: '📅', text: 'Next Appointments', query: "Show me my next appointments" },
      { icon: '👥', text: 'Customer Insights', query: "Tell me about my customer trends" },
      { icon: '📈', text: 'Growth Tips', query: "How can I grow my business?" },
      { icon: '🎯', text: 'Marketing Ideas', query: "Give me marketing suggestions for this week" }
    ]
  }
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const recognitionRef = useRef(null)
  
  const [emotionAnalysis, setEmotionAnalysis] = useState(null)
  const [isAnalyzingEmotion, setIsAnalyzingEmotion] = useState(false)
  const [userEmotionHistory, setUserEmotionHistory] = useState([])
  const [currentMood, setCurrentMood] = useState('neutral')

  useEffect(() => {
    const fetchShopData = async () => {
      if (!user) return
      
      const supabase = createClient()
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, shop_name, email')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError) {
          console.warn('Profile query warning:', profileError.message)
        }
        
        if (profileData?.shop_id) {
          
          const [shopInfo, analytics, predictions, alerts] = await Promise.allSettled([
            supabase.from('barbershops').select('*').eq('id', profileData.shop_id).single(),
            
            fetch(`/api/analytics/live-data?barbershop_id=${profileData.shop_id}`).then(r => r.json()),
            
            fetch(`/api/ai/predictive?type=comprehensive&shopId=${profileData.shop_id}`).then(r => r.json()),
            
            fetch(`/api/alerts/intelligent?barbershop_id=${profileData.shop_id}`).then(r => r.json())
          ])

          const shopData = shopInfo.status === 'fulfilled' ? shopInfo.value.data : null
          const analyticsData = analytics.status === 'fulfilled' && analytics.value.success ? analytics.value.data : null
          const predictionsData = predictions.status === 'fulfilled' && predictions.value.success ? predictions.value.predictions : null
          const alertsData = alerts.status === 'fulfilled' && alerts.value.success ? alerts.value : null

          const { data: customers } = await supabase
            .from('customers')
            .select('total_spent, total_visits, created_at')
            .eq('shop_id', profileData.shop_id)
          
          const { data: bookings } = await supabase
            .from('bookings')
            .select('price, status, service_name, start_time, created_at')
            .eq('shop_id', profileData.shop_id)
            .gte('start_time', new Date().toISOString().split('T')[0])
          
          const totalRevenue = customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0
          const totalCustomers = customers?.length || 0
          const todayAppointments = bookings?.filter(a => a.status === 'confirmed').length || 0
          const weeklyRevenue = analyticsData?.weekly_revenue || Math.round(totalRevenue * 0.1)
          
          setShopData({
            ...shopData,
            shop_name: shopData?.name || profileData.shop_name,
            shop_id: profileData.shop_id,
            user_role: profileData.role,
            location: shopData?.location || shopData?.address || 'Main Location',
            staff_count: shopData?.staff_count || 1
          })
          
          setRealTimeMetrics({
            total_revenue: totalRevenue,
            total_customers: totalCustomers,
            today_appointments: todayAppointments,
            monthly_revenue: analyticsData?.monthly_revenue || Math.round(totalRevenue / 12),
            weekly_revenue: weeklyRevenue,
            avg_daily_bookings: Math.round(todayAppointments / 7),
            customer_satisfaction: analyticsData?.avg_rating || 4.5,
            capacity_utilization: analyticsData?.capacity_utilization || 0.75
          })

          setBusinessContext({
            shop: {
              name: shopData?.name || profileData.shop_name,
              id: profileData.shop_id,
              location: shopData?.location || 'Main Location',
              staff_count: shopData?.staff_count || 1,
              operating_hours: shopData?.operating_hours || '9 AM - 7 PM',
              services: shopData?.services || ['Haircut', 'Beard Trim', 'Shampoo']
            },
            analytics: analyticsData ? {
              revenue: {
                daily: analyticsData.daily_revenue || weeklyRevenue / 7,
                weekly: weeklyRevenue,
                monthly: analyticsData.monthly_revenue || totalRevenue,
                growth_rate: analyticsData.revenue_growth || 0.05
              },
              customers: {
                total: totalCustomers,
                new_this_month: analyticsData.new_customers || Math.round(totalCustomers * 0.1),
                retention_rate: analyticsData.retention_rate || 0.78,
                satisfaction: analyticsData.avg_rating || 4.5
              },
              bookings: {
                today: todayAppointments,
                this_week: analyticsData.weekly_bookings || todayAppointments * 7,
                capacity_utilization: analyticsData.capacity_utilization || 0.75,
                popular_services: analyticsData.popular_services || ['Haircut', 'Beard Trim']
              }
            } : null,
            predictions: predictionsData ? {
              revenue_forecast: predictionsData.revenueForecast,
              customer_behavior: predictionsData.customerBehavior,
              seasonal_patterns: predictionsData.seasonalAnalysis,
              pricing_recommendations: predictionsData.dynamicPricing
            } : null,
            alerts: alertsData ? {
              active_alerts: alertsData.alerts || [],
              priority_actions: alertsData.priorityActions || [],
              insights: alertsData.insights || []
            } : null,
            last_updated: new Date().toISOString()
          })
          
          setContextLoaded(true)
        }
      } catch (error) {
        console.error('Error fetching shop data:', error)
      }
    }
    
    fetchShopData()
  }, [user])

  useEffect(() => {
    let existingSession = null
    let savedPosition = 'bottom-right'
    
    try {
      existingSession = localStorage.getItem('ai_chat_session_id')
      savedPosition = localStorage.getItem('ai_chat_widget_position') || 'bottom-right'
    } catch (e) {
      console.warn('LocalStorage not available')
    }
    
    setPosition(savedPosition)
    
    if (existingSession) {
      setSessionId(existingSession)
    } else {
      const newSessionId = `persistent_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      try {
        localStorage.setItem('ai_chat_session_id', newSessionId)
      } catch (e) {
        console.warn('Could not save session ID to localStorage')
      }
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getPositionClasses = (pos) => {
    switch(pos) {
      case 'top-left':
        return 'top-6 left-6'
      case 'top-right':
        return 'top-6 right-6'
      case 'bottom-left':
        return 'bottom-6 left-6'
      case 'bottom-right':
      default:
        return 'bottom-6 right-6'
    }
  }

  const savePosition = (newPosition) => {
    setPosition(newPosition)
    try {
      localStorage.setItem('ai_chat_widget_position', newPosition)
    } catch (e) {
      console.warn('Could not save widget position to localStorage')
    }
  }

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true)
      const rect = widgetRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
      e.preventDefault()
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && widgetRef.current) {
      const x = e.clientX - dragOffset.x
      const y = e.clientY - dragOffset.y
      
      widgetRef.current.style.left = `${x}px`
      widgetRef.current.style.top = `${y}px`
      widgetRef.current.style.right = 'auto'
      widgetRef.current.style.bottom = 'auto'
    }
  }

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false)
      
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const rect = widgetRef.current?.getBoundingClientRect()
      
      if (rect) {
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        let newPosition = 'bottom-right'
        
        if (centerX < windowWidth / 2 && centerY < windowHeight / 2) {
          newPosition = 'top-left'
        } else if (centerX >= windowWidth / 2 && centerY < windowHeight / 2) {
          newPosition = 'top-right'
        } else if (centerX < windowWidth / 2 && centerY >= windowHeight / 2) {
          newPosition = 'bottom-left'
        } else {
          newPosition = 'bottom-right'
        }
        
        savePosition(newPosition)
        
        widgetRef.current.style.left = ''
        widgetRef.current.style.top = ''
        widgetRef.current.style.right = ''
        widgetRef.current.style.bottom = ''
      }
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const analyzeMessageEmotion = async (messageText) => {
    if (!messageText.trim()) return null

    setIsAnalyzingEmotion(true)
    
    try {
      const response = await fetch('/api/ai/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          action: 'analyze',
          userId: user?.id || 'demo_user',
          context: {
            sessionId: sessionId,
            previousEmotion: currentMood,
            businessContext: businessContext
          },
          businessContext: {
            shopName: shopData?.shop_name,
            isOwner: shopData?.user_role === 'owner',
            isStaff: shopData?.user_role !== 'owner'
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        const analysis = data.analysis
        setEmotionAnalysis(analysis)
        setCurrentMood(analysis.emotion)
        
        setUserEmotionHistory(prev => [...prev, {
          emotion: analysis.emotion,
          confidence: analysis.confidence,
          timestamp: new Date(),
          message: messageText.substring(0, 50)
        }].slice(-10)) // Keep last 10 emotions
        
        return analysis
      }
    } catch (error) {
      console.warn('Emotion analysis failed:', error)
    } finally {
      setIsAnalyzingEmotion(false)
    }
    
    return null
  }

  const getEmotionIcon = (emotion) => {
    const icons = {
      happy: '😊',
      satisfied: '😌',
      excited: '🤩',
      frustrated: '😤',
      angry: '😠',
      confused: '😕',
      anxious: '😰',
      neutral: '😐'
    }
    return icons[emotion] || '😐'
  }

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: 'text-green-600',
      satisfied: 'text-blue-600',
      excited: 'text-orange-600',
      frustrated: 'text-yellow-600',
      angry: 'text-red-600',
      confused: 'text-gray-600',
      anxious: 'text-purple-600',
      neutral: 'text-gray-400'
    }
    return colors[emotion] || 'text-gray-400'
  }

  const processAutomatedTriggers = async (emotionAnalysis, messageText) => {
    try {
      
      const triggerContext = {
        message: messageText,
        emotion: emotionAnalysis.emotion,
        emotionConfidence: emotionAnalysis.confidence,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        businessEvent: detectBusinessEvent(messageText, emotionAnalysis)
      }

      const response = await fetch('/api/ai/task-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_triggers',
          context: triggerContext,
          userId: user?.id,
          businessContext: businessContext
        })
      })

      const result = await response.json()
      
      if (result.success) {
        
        if (result.result.triggers_processed > 0) {
          showAutomationNotification(result.result.triggers_processed, emotionAnalysis.emotion)
        }
      } else {
        console.warn('⚠️ Automated trigger processing failed:', result.error)
      }
      
    } catch (error) {
      console.error('❌ Error processing automated triggers:', error)
    }
  }

  const detectBusinessEvent = (messageText, emotionAnalysis) => {
    const text = messageText.toLowerCase()
    
    if (text.includes('cancel') && (text.includes('appointment') || text.includes('booking'))) {
      return {
        type: 'appointment_cancellation',
        data: {
          message: messageText,
          emotion: emotionAnalysis.emotion,
          confidence: emotionAnalysis.confidence
        }
      }
    }
    
    if ((text.includes('payment') || text.includes('pay') || text.includes('bill')) && 
        (emotionAnalysis.emotion === 'frustrated' || emotionAnalysis.emotion === 'angry')) {
      return {
        type: 'payment_issue',
        data: {
          message: messageText,
          emotion: emotionAnalysis.emotion,
          confidence: emotionAnalysis.confidence
        }
      }
    }
    
    if ((text.includes('service') || text.includes('quality') || text.includes('disappointed')) && 
        (emotionAnalysis.emotion === 'angry' || emotionAnalysis.emotion === 'frustrated')) {
      return {
        type: 'service_complaint',
        data: {
          message: messageText,
          emotion: emotionAnalysis.emotion,
          confidence: emotionAnalysis.confidence
        }
      }
    }
    
    if ((text.includes('love') || text.includes('amazing') || text.includes('excellent')) && 
        (emotionAnalysis.emotion === 'happy' || emotionAnalysis.emotion === 'excited')) {
      return {
        type: 'positive_feedback',
        data: {
          message: messageText,
          emotion: emotionAnalysis.emotion,
          confidence: emotionAnalysis.confidence
        }
      }
    }
    
    return null
  }

  const showAutomationNotification = (triggerCount, emotion) => {
    const notification = {
      id: Date.now(),
      type: 'automation',
      content: `🤖 ${triggerCount} automated action${triggerCount > 1 ? 's' : ''} triggered based on your ${emotion} message`,
      timestamp: new Date(),
      icon: '⚡'
    }
    
    setMessages(prev => [...prev, notification])
    
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== notification.id))
    }, 5000)
  }

  const analyzeVoiceEmotion = async (transcript, speechEvent) => {
    try {
      const confidence = speechEvent.results?.[0]?.[0]?.confidence || 0.8
      
      const voiceFeatures = {
        confidence: confidence,
        transcript: transcript,
        pitch: 'normal',
        tempo: 'normal', 
        volume: 'normal'
      }

      const response = await fetch('/api/ai/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'voice_emotion',
          voiceData: voiceFeatures
        })
      })

      const data = await response.json()
      
      if (data.success) {
        return data.voice_emotion
      }
    } catch (error) {
      console.warn('Voice emotion analysis failed:', error)
    }
    
    return null
  }

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || !sessionId) return

    const currentMessage = message
    setMessage('')
    setIsLoading(true)

    const emotionAnalysis = await analyzeMessageEmotion(currentMessage)

    if (emotionAnalysis) {
      await processAutomatedTriggers(emotionAnalysis, currentMessage)
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
      emotion: emotionAnalysis ? {
        type: emotionAnalysis.emotion,
        confidence: emotionAnalysis.confidence,
        icon: getEmotionIcon(emotionAnalysis.emotion)
      } : null
    }

    setMessages(prev => [...prev, userMessage])

    try {
      const startTime = Date.now()
      
      const enhancedBusinessContext = {
        ...businessContext,
        current_emotion: emotionAnalysis ? {
          emotion: emotionAnalysis.emotion,
          confidence: emotionAnalysis.confidence,
          empathetic_strategy: emotionAnalysis.empathetic_response.strategy
        } : null,
        emotion_history: userEmotionHistory.slice(-3), // Last 3 emotions for context
        mood_trend: currentMood
      }
      
      const response = await fetch('/api/ai/analytics-enhanced-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          session_id: sessionId,
          business_context: enhancedBusinessContext && contextLoaded ? {
            shop: enhancedBusinessContext.shop,
            analytics: enhancedBusinessContext.analytics,
            predictions: enhancedBusinessContext.predictions,
            alerts: enhancedBusinessContext.alerts,
            
            current_emotion: enhancedBusinessContext.current_emotion,
            emotion_history: enhancedBusinessContext.emotion_history,
            mood_trend: enhancedBusinessContext.mood_trend,
            
            shop_name: shopData?.shop_name || user?.email?.split('@')[0] + "'s Shop",
            customer_count: realTimeMetrics?.total_customers || 0,
            monthly_revenue: realTimeMetrics?.monthly_revenue || 0,
            location: shopData?.location || 'Main Location',
            staff_count: shopData?.staff_count || 1,
            barbershop_id: shopData?.shop_id || user?.id,
            user_role: shopData?.user_role || 'owner',
            today_appointments: realTimeMetrics?.today_appointments || 0,
            total_revenue: realTimeMetrics?.total_revenue || 0,
            
            context_version: '2.1', // Updated for emotion support
            context_loaded: contextLoaded,
            emotion_enabled: true,
            last_updated: businessContext?.last_updated,
            data_sources: {
              analytics: !!businessContext?.analytics,
              predictions: !!businessContext?.predictions,
              alerts: !!businessContext?.alerts,
              real_time_metrics: !!realTimeMetrics,
              emotion_analysis: !!emotionAnalysis
            }
          } : {
            shop_name: shopData?.shop_name || user?.email?.split('@')[0] + "'s Shop",
            customer_count: realTimeMetrics?.total_customers || 0,
            monthly_revenue: realTimeMetrics?.monthly_revenue || 0,
            location: shopData?.location || 'Main Location',
            staff_count: shopData?.staff_count || 1,
            barbershop_id: shopData?.shop_id || user?.id,
            user_role: shopData?.user_role || 'owner',
            today_appointments: realTimeMetrics?.today_appointments || 0,
            total_revenue: realTimeMetrics?.total_revenue || 0,
            context_version: '1.0',
            context_loaded: false
          },
          barbershop_id: shopData?.shop_id || user?.id
        })
      })

      const data = await response.json()
      const responseTime = (Date.now() - startTime) / 1000 // Convert to seconds
      
      const responseText = data.response || data.message || "I'm here to help! What would you like to know about your business?"
      const smartActions = []
      
      if (responseText.toLowerCase().includes('appointment') || responseText.toLowerCase().includes('booking')) {
        smartActions.push({ text: 'Open Calendar', link: '/dashboard/calendar', icon: '📅' })
      }
      if (responseText.toLowerCase().includes('revenue') || responseText.toLowerCase().includes('money') || responseText.toLowerCase().includes('earnings')) {
        smartActions.push({ text: 'View Analytics', link: '/dashboard/analytics-enhanced', icon: '📊' })
      }
      if (responseText.toLowerCase().includes('customer') || responseText.toLowerCase().includes('client')) {
        smartActions.push({ text: 'Customer List', link: '/dashboard/customers', icon: '👥' })
      }
      if (responseText.toLowerCase().includes('marketing') || responseText.toLowerCase().includes('promotion')) {
        smartActions.push({ text: 'Marketing Tools', link: '/dashboard/campaigns', icon: '🎯' })
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: responseText,
        timestamp: new Date(),
        actions: smartActions
      }

      setMessages(prev => [...prev, aiMessage])
      
      try {
        await fetch('/api/ai/analytics/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track_conversation',
            data: {
              agent: data.agent_details?.primary_agent || 'FloatingChat',
              topic: data.message_type || 'general',
              userId: 'demo_user',
              sessionId: `floating_${Date.now()}`
            }
          })
        })
        
        await fetch('/api/ai/analytics/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track_response_time',
            data: {
              responseTime: responseTime,
              agent: data.agent_details?.primary_agent || 'FloatingChat'
            }
          })
        })
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError)
      }
    } catch (error) {
      console.error('AI Chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: "I'm having trouble connecting right now. Try asking me about your bookings, revenue, or customer insights!",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (query) => {
    setMessage(query)
    handleSendMessage()
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    recognition.onstart = () => {
      setIsVoiceListening(true)
    }
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setMessage(transcript)
      setIsVoiceListening(false)
      
      const voiceEmotionHint = await analyzeVoiceEmotion(transcript, event)
      if (voiceEmotionHint) {
      }
    }
    
    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error)
      setIsVoiceListening(false)
    }
    
    recognition.onend = () => {
      setIsVoiceListening(false)
    }
    
    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsVoiceListening(false)
    }
  }

  const handleRating = async (messageId, rating) => {
    try {
      await fetch('/api/ai/analytics/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_satisfaction',
          data: {
            rating: rating,
            agent: 'FloatingChat',
            topic: 'general'
          }
        })
      })
      
      setShowRating(null)
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, rated: rating }
          : msg
      ))
    } catch (error) {
      console.warn('Rating tracking failed:', error)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          ref={widgetRef}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (!isDragging) setIsOpen(true)
          }}
          className={`fixed ${getPositionClasses(position)} bg-amber-600 hover:bg-amber-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 z-40 group ${isDragging ? 'cursor-move' : 'cursor-pointer'}`}
        >
          <SparklesIcon className="h-6 w-6" />
          <div className="absolute -top-2 -left-2 bg-moss-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            AI
          </div>
          
          {/* Drag handle indicator */}
          <div className="drag-handle absolute -top-1 -right-1 bg-gray-300 hover:bg-gray-400 text-gray-600 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
            <ArrowsPointingOutIcon className="h-2 w-2" />
          </div>
          
          {/* Tooltip - position based on corner */}
          <div className={`absolute bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
            position.includes('right') ? 'right-16' : 'left-16'
          } ${
            position.includes('top') ? 'top-1/2 transform -translate-y-1/2' : 'top-1/2 transform -translate-y-1/2'
          }`}>
            Chat with AI Assistant
          </div>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className={`fixed ${getPositionClasses(position)} w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
              <div className="bg-green-400 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold">
                Online
              </div>
              {contextLoaded && businessContext && (
                <div className="bg-olive-400 text-olive-900 text-xs px-2 py-0.5 rounded-full font-bold" title="Enhanced with comprehensive business context">
                  Enhanced
                </div>
              )}
              {currentMood !== 'neutral' && (
                <div 
                  className="bg-purple-400 text-purple-900 text-xs px-2 py-0.5 rounded-full font-bold flex items-center space-x-1" 
                  title={`Current mood: ${currentMood}`}
                >
                  <span>{getEmotionIcon(currentMood)}</span>
                  <span className="capitalize">{currentMood}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.type === 'user'
                      ? 'bg-amber-700 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      {msg.content}
                    </div>
                    {/* Emotion Indicator for User Messages */}
                    {msg.type === 'user' && msg.emotion && (
                      <div className="flex-shrink-0">
                        <div 
                          className="flex items-center space-x-1 bg-white/20 rounded-full px-2 py-1"
                          title={`Detected emotion: ${msg.emotion.type} (${Math.round(msg.emotion.confidence * 100)}% confidence)`}
                        >
                          <span className="text-xs">{msg.emotion.icon}</span>
                          <span className={`text-xs ${getEmotionColor(msg.emotion.type)}`}>
                            {msg.emotion.type}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Smart Actions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {msg.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => window.location.href = action.link}
                            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded-full transition-colors flex items-center space-x-1"
                          >
                            <span>{action.icon}</span>
                            <span>{action.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {msg.type === 'assistant' && msg.id > 1 && !msg.rated && showRating !== msg.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setShowRating(msg.id)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Rate this response
                      </button>
                    </div>
                  )}
                  {showRating === msg.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">How helpful was this response?</p>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() => handleRating(msg.id, rating)}
                            className="text-lg hover:text-amber-800 transition-colors"
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.rated && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Rated: {Array(msg.rated).fill('⭐').join('')} Thanks for your feedback!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="px-3 pb-2">
              <p className="text-xs text-gray-500 mb-2">Quick Actions:</p>
              <div className="flex flex-wrap gap-1">
                {getQuickActions().map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.query)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full transition-colors flex items-center space-x-1"
                    disabled={isLoading}
                  >
                    <span>{action.icon}</span>
                    <span className="truncate max-w-20">{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your business..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={isLoading || isVoiceListening}
              />
              <button
                onClick={isVoiceListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`${
                  isVoiceListening 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-gray-500 hover:bg-gray-600'
                } text-white rounded-lg p-2 transition-colors`}
                title={isVoiceListening ? "Stop listening" : "Voice input"}
              >
                <MicrophoneIcon className="h-4 w-4" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white rounded-lg p-2 transition-colors"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-center">
              <button 
                onClick={() => window.location.href = '/dashboard/ai-command-center'}
                className="text-xs text-amber-700 hover:text-amber-700 flex items-center justify-center space-x-1"
              >
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                <span>Open AI Command Center</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}