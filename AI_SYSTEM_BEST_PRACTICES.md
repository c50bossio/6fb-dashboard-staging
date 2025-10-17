# 🧠 AI System Best Practices Guide
## Unified 6FB AI Agent System

### 🎯 Overview

This guide outlines best practices for working with the newly integrated AI system that consolidates three previously separate AI implementations into a single, cost-optimized platform using Vercel AI SDK v2.

---

## 📚 System Architecture

### Core Components
- **API Route**: `/api/ai/v2` - Unified endpoint for all AI requests
- **React Hooks**: `useAIChat` from `/hooks/useAISDK.js` - Modern AI SDK integration  
- **Agent System**: 5 specialized business agents with intelligent routing
- **Model Router**: Cost-optimized model selection (Gemini 2.5 Flash-Lite primary)

### Request Flow
```
User Input → useAIChat Hook → /api/ai/v2 → Model Router → Agent Selection → AI Response → Streaming Display
```

---

## 💻 Development Best Practices

### 1. Using the AI Hooks

**✅ Recommended**: Use the modern `useAIChat` hook

```javascript
import { useAIChat } from '@/hooks/useAISDK'

function MyComponent() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    currentAgent,
    totalCost,
    sendMessage,
    switchAgent
  } = useAIChat('business_coach') // Start with business coach agent

  return (
    // Your component JSX
  )
}
```

**❌ Avoid**: Direct API calls when hooks are available

```javascript
// Don't do this when you can use the hook
const response = await fetch('/api/ai/v2', { ... })
```

### 2. Agent Selection Strategy

**Available Agents:**
- `business_coach` - Revenue, pricing, financial strategy
- `marketing_expert` - Social media, customer acquisition, campaigns  
- `financial_advisor` - Cash flow, forecasting, financial planning
- `operations_manager` - Scheduling, workflows, efficiency
- `customer_care` - Retention, satisfaction, service quality
- `auto` - Let the system choose intelligently (recommended for general queries)

**Best Practice:**
```javascript
// Let the system choose the best agent
const { messages } = useAIChat('auto')

// Or be specific when you know the domain
const { messages } = useAIChat('marketing_expert') // For marketing-focused chat
```

### 3. Message Format Standards

**Input Format:**
```javascript
{
  message: "User's question or request",
  agent: "auto" | "business_coach" | "marketing_expert" | ...,
  context: {
    conversationHistory: [...], // Last 6 messages for context
    shopId: "user-shop-id",
    userId: "current-user-id"
  }
}
```

**Output Format:**
```javascript
{
  message: "AI response content",
  agent: { id: "business_coach", name: "Business Coach" },
  model: "gemini-2.5-flash-lite",
  cost: 0.0001,
  reasoning: "Model selection reasoning"
}
```

---

## ⚡ Performance Best Practices

### 1. Cost Optimization

**✅ Use intelligent routing:**
```javascript
// Let the system choose the most cost-effective model
agent: 'auto'
```

**✅ Provide context efficiently:**
```javascript
context: {
  conversationHistory: messages.slice(-6), // Only last 6 messages
  shopId: userShopId,
  userId: userId
}
```

**❌ Avoid sending full conversation history:**
```javascript
// Don't do this - too expensive
context: {
  conversationHistory: allMessages // Could be 100+ messages
}
```

### 2. Streaming Best Practices

**✅ Use streaming for real-time experience:**
```javascript
const { handleSubmit } = useAIChat('auto')

// Handles streaming automatically
await handleSubmit(e)
```

**✅ Show streaming indicators:**
```jsx
{message.isStreaming && (
  <div className="inline-block ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
)}
```

### 3. Error Handling

**✅ Graceful degradation:**
```javascript
const aiMessage = {
  content: data.message || data.content || data.text || 'Sorry, please try again.',
  agent: data.agent?.name || 'AI Assistant',
  model: data.model || 'unknown'
}
```

**✅ User-friendly error messages:**
```javascript
catch (error) {
  const errorMessage = {
    type: 'assistant',
    content: "I'm having connection issues. Meanwhile, here are some quick business tips...",
    isError: true
  }
  setMessages(prev => [...prev, errorMessage])
}
```

---

## 🎨 UI/UX Best Practices

### 1. Message Display

**✅ Show cost and model information:**
```jsx
{message.cost && (
  <span className="text-xs text-green-600" title={`Cost: $${message.cost.toFixed(4)}`}>
    ${(message.cost * 1000).toFixed(2)}¢
  </span>
)}

{message.model && (
  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
    {message.model.includes('gemini') ? '🧠 Gemini' : '⚡ GPT'}
  </span>
)}
```

**✅ Agent indicators:**
```jsx
<div className="flex items-center space-x-2 text-sm">
  <span className="font-medium">{agent.name}</span>
  <span className="text-green-600">
    {agent.confidence ? `${(agent.confidence * 100).toFixed(0)}% confident` : 'AI Response'}
  </span>
</div>
```

### 2. Loading States

**✅ Informative loading states:**
```jsx
{isLoading && (
  <div className="flex items-center space-x-2">
    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
    <span>AI is thinking...</span>
  </div>
)}
```

### 3. Cost Transparency

**✅ Show session costs:**
```jsx
<div className="text-xs text-gray-500">
  Session cost: ${totalCost.toFixed(4)}
</div>
```

---

## 🔒 Security Best Practices

### 1. Data Handling

**✅ Sanitize user input:**
```javascript
const sanitizedMessage = message.trim()
if (!sanitizedMessage) return
```

**✅ Validate context data:**
```javascript
const context = {
  shopId: shopId || 'default',
  userId: user?.id || 'anonymous',
  conversationHistory: Array.isArray(history) ? history.slice(-6) : []
}
```

### 2. API Key Management

**✅ Environment variables:**
```javascript
// In API route only
const apiKey = process.env.OPENAI_API_KEY
```

**❌ Never expose keys in frontend:**
```javascript
// Never do this
const apiKey = "sk-..." // Exposed to client!
```

---

## 📊 Monitoring Best Practices

### 1. Cost Tracking

**✅ Track usage by agent:**
```javascript
await trackUsage(supabase, userId, modelName, messages, selectedAgent)
```

**✅ Set cost alerts:**
```javascript
if (totalCost > 0.10) { // 10 cents threshold
  console.warn('High usage session detected')
}
```

### 2. Performance Monitoring

**✅ Track response times:**
```javascript
const startTime = Date.now()
await handleSubmit(e)
const responseTime = Date.now() - startTime
```

**✅ Monitor agent accuracy:**
```javascript
// In testing/validation
const accuracy = correctAgentSelections / totalRequests
if (accuracy < 0.9) console.warn('Agent routing accuracy low')
```

---

## 🛠️ Testing Best Practices

### 1. Component Testing

**✅ Test with mock API responses:**
```javascript
// Test loading states
const { result } = renderHook(() => useAIChat('auto'))
expect(result.current.isLoading).toBe(false)

// Test message handling
act(() => {
  result.current.sendMessage('Test message')
})
```

### 2. Integration Testing

**✅ Use the AI Testing Lab:**
```javascript
// Visit /admin/ai-testing to run comprehensive tests
// Tests agent routing, tool usage, response quality
```

### 3. Cost Testing

**✅ Monitor test costs:**
```javascript
const testResult = await runTest(scenario)
expect(testResult.result.cost).toBeLessThan(0.01) // 1 cent max per test
```

---

## 🚀 Migration Guide

### From Old WebSocket System

**Before:**
```javascript
import { useEnhancedWebSocket } from '@/hooks/useEnhancedWebSocket'
const { sendMessage, messages } = useEnhancedWebSocket()
```

**After:**
```javascript
import { useAIChat } from '@/hooks/useAISDK'
const { sendMessage, messages, handleSubmit } = useAIChat('auto')
```

### From Direct API Calls

**Before:**
```javascript
const response = await fetch('/api/ai/agentic-executor', {
  method: 'POST',
  body: JSON.stringify({ message, context })
})
```

**After:**
```javascript
const response = await fetch('/api/ai/v2', {
  method: 'POST',
  body: JSON.stringify({ message, agent: 'auto', context })
})
```

---

## 📈 Optimization Tips

### 1. Cost Optimization
- Use `agent: 'auto'` for intelligent model selection
- Limit conversation history to 6 messages max
- Cache responses when possible
- Use streaming for better perceived performance

### 2. Performance Optimization  
- Debounce user input to prevent excessive API calls
- Show loading states immediately
- Pre-load common agent responses
- Use React.memo for expensive message components

### 3. User Experience
- Display cost information transparently
- Show which agent is responding
- Provide quick action buttons
- Implement retry functionality for failed requests

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: High API costs
- **Solution**: Verify agent selection is using 'auto' mode
- **Check**: Conversation history length (should be ≤6 messages)

**Issue**: Slow response times
- **Solution**: Enable streaming mode
- **Check**: Network connectivity and API endpoint health

**Issue**: Wrong agent selected
- **Solution**: Review query content and agent prompts
- **Check**: Agent routing logic in `/api/ai/v2`

**Issue**: Messages not streaming
- **Solution**: Verify `stream: true` in API request
- **Check**: TextDecoder implementation in component

---

## 📋 Checklist for New Features

When adding new AI features:

- [ ] Use `useAIChat` hook instead of direct API calls
- [ ] Include cost tracking and display
- [ ] Implement proper error handling
- [ ] Add loading states and streaming indicators
- [ ] Test with different agents and models
- [ ] Validate conversation history handling
- [ ] Update agent prompts if needed
- [ ] Add integration tests
- [ ] Document any new patterns

---

**Last Updated**: January 2025  
**System Version**: AI SDK v2.0  
**Status**: Production Ready ✅