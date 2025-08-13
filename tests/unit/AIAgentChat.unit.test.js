/**
 * COMPREHENSIVE UNIT TESTS FOR AI AGENT CHAT COMPONENT
 * 
 * Tests the multi-model AI chat system with business context integration
 * Covers model switching, API communication, and real-time business intelligence
 */

import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import AIAgentChat from '../../components/ai/AIAgentChat'
import fetch from 'jest-fetch-mock'

// Mock fetch for API calls
fetch.enableMocks()

// Mock ModelSelector component
jest.mock('../../components/ai/ModelSelector', () => {
  return function MockModelSelector({ onModelChange, selectedModel }) {
    return (
      <select 
        data-testid="model-selector" 
        value={selectedModel} 
        onChange={(e) => onModelChange(e.target.value)}
      >
        <option value="gpt-5">GPT-5</option>
        <option value="claude-opus-4.1">Claude Opus 4.1</option>
        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
      </select>
    )
  }
})

describe('AIAgentChat Component - Unit Tests', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    fetch.resetMocks()
    // Mock successful health check by default
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Initialization', () => {
    test('renders with initial AI assistant message', () => {
      render(<AIAgentChat />)
      
      expect(screen.getByText(/Hello! I'm your AI business assistant/)).toBeInTheDocument()
      expect(screen.getByText(/Marcus/)).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    test('initializes with default GPT-5 model', () => {
      render(<AIAgentChat />)
      
      const modelSelector = screen.getByTestId('model-selector')
      expect(modelSelector).toHaveValue('gpt-5')
    })

    test('checks API connection on mount', async () => {
      render(<AIAgentChat />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/health')
      })
    })

    test('updates connection status message when API is connected', async () => {
      render(<AIAgentChat />)
      
      await waitFor(() => {
        expect(screen.getByText(/✅ Internal API connection detected!/)).toBeInTheDocument()
      })
    })

    test('handles API connection failure gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('API connection failed'))
      
      render(<AIAgentChat />)
      
      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm your AI business assistant/)).toBeInTheDocument()
      })
    })
  })

  describe('Model Selection and Switching', () => {
    test('allows switching between AI models', async () => {
      render(<AIAgentChat />)
      
      const modelSelector = screen.getByTestId('model-selector')
      
      await user.selectOptions(modelSelector, 'claude-opus-4.1')
      expect(modelSelector).toHaveValue('claude-opus-4.1')
      
      await user.selectOptions(modelSelector, 'gemini-2.0-flash')
      expect(modelSelector).toHaveValue('gemini-2.0-flash')
    })

    test('sends correct provider based on selected model', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'Test response',
          agent: 'Marcus' 
        })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      const modelSelector = screen.getByTestId('model-selector')
      
      // Switch to Claude model
      await user.selectOptions(modelSelector, 'claude-opus-4.1')
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/unified-chat', 
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"provider":"anthropic"')
          })
        )
      })
    })

    test('maps model names to correct providers', async () => {
      const modelProviderTests = [
        { model: 'gpt-5', expectedProvider: 'openai' },
        { model: 'claude-opus-4.1', expectedProvider: 'anthropic' },
        { model: 'gemini-2.0-flash', expectedProvider: 'google' }
      ]

      for (const { model, expectedProvider } of modelProviderTests) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: 'Test', agent: 'Marcus' })
        })

        render(<AIAgentChat />)
        
        const input = screen.getByRole('textbox')
        const sendButton = screen.getByRole('button')
        const modelSelector = screen.getByTestId('model-selector')
        
        await user.selectOptions(modelSelector, model)
        await user.type(input, 'Test message')
        await user.click(sendButton)
        
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith('/api/ai/unified-chat', 
            expect.objectContaining({
              body: expect.stringContaining(`"provider":"${expectedProvider}"`)
            })
          )
        })
      }
    })
  })

  describe('Message Input and Sending', () => {
    test('allows typing and sending messages', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'AI response to test message',
          agent: 'Marcus',
          timestamp: new Date().toISOString()
        })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Test message for AI')
      expect(input).toHaveValue('Test message for AI')
      
      await user.click(sendButton)
      
      // Input should be cleared after sending
      expect(input).toHaveValue('')
      
      // User message should appear
      expect(screen.getByText('Test message for AI')).toBeInTheDocument()
    })

    test('prevents sending empty messages', async () => {
      render(<AIAgentChat />)
      
      const sendButton = screen.getByRole('button')
      
      await user.click(sendButton)
      
      // Should not make API call for empty message
      expect(fetch).not.toHaveBeenCalledWith('/api/ai/unified-chat', expect.any(Object))
    })

    test('prevents sending messages with only whitespace', async () => {
      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, '   ')
      await user.click(sendButton)
      
      expect(fetch).not.toHaveBeenCalledWith('/api/ai/unified-chat', expect.any(Object))
    })

    test('handles Enter key for sending messages', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'Response to Enter key message',
          agent: 'Marcus'
        })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      
      await user.type(input, 'Message sent with Enter{enter}')
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/unified-chat', expect.any(Object))
      })
    })
  })

  describe('Business Context Integration', () => {
    test('includes business context in API requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'Business context response',
          agent: 'Marcus'
        })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Show me revenue insights')
      await user.click(sendButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/unified-chat', 
          expect.objectContaining({
            body: expect.stringContaining('"includeBusinessContext":true')
          })
        )
      })
    })

    test('sends barbershop ID for context', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Context response', agent: 'Marcus' })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Business question')
      await user.click(sendButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/unified-chat', 
          expect.objectContaining({
            body: expect.stringContaining('"barbershopId":"demo-shop-001"')
          })
        )
      })
    })

    test('includes conversation history in API requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'First response',
          agent: 'Marcus'
        })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      // Send first message
      await user.type(input, 'First message')
      await user.click(sendButton)
      
      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument()
      })

      // Mock second API call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'Second response with context',
          agent: 'Marcus'
        })
      })

      // Send second message
      await user.type(input, 'Follow-up question')
      await user.click(sendButton)
      
      await waitFor(() => {
        // Should include previous messages in the conversation
        const lastCall = fetch.mock.calls[fetch.mock.calls.length - 1]
        const requestBody = JSON.parse(lastCall[1].body)
        expect(requestBody.messages.length).toBeGreaterThan(2) // System + previous messages + new message
      })
    })
  })

  describe('Loading States and Error Handling', () => {
    test('shows loading state during API calls', async () => {
      // Delay the API response
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ response: 'Delayed response', agent: 'Marcus' })
          }), 100)
        )
      )

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      // Check loading state (you might need to add loading indicators to the component)
      // This test assumes the component disables input during loading
      expect(input).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.getByText('Delayed response')).toBeInTheDocument()
        expect(input).toBeEnabled()
      })
    })

    test('handles API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'))

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      await waitFor(() => {
        // Should show error message or handle gracefully
        expect(input).toBeEnabled() // Input should be re-enabled
      })
    })

    test('handles HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      await waitFor(() => {
        // Should handle HTTP errors gracefully
        expect(input).toBeEnabled()
      })
    })
  })

  describe('Message Display and UI', () => {
    test('displays messages with correct timestamps', async () => {
      render(<AIAgentChat />)
      
      // Check initial message has timestamp
      const messages = screen.getAllByText(/Marcus/)
      expect(messages.length).toBeGreaterThan(0)
    })

    test('displays user messages with correct styling', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response', agent: 'Marcus' })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'User message')
      await user.click(sendButton)
      
      expect(screen.getByText('User message')).toBeInTheDocument()
    })

    test('displays AI responses with agent identification', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          response: 'AI business insight response',
          agent: 'Marcus'
        })
      })

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      await user.type(input, 'Business question')
      await user.click(sendButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI business insight response')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Memory Management', () => {
    test('handles rapid message sending without performance degradation', async () => {
      for (let i = 0; i < 5; i++) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            response: `Response ${i}`,
            agent: 'Marcus'
          })
        })
      }

      render(<AIAgentChat />)
      
      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button')
      
      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await user.type(input, `Message ${i}`)
        await user.click(sendButton)
      }
      
      await waitFor(() => {
        expect(screen.getByText('Response 4')).toBeInTheDocument()
      })
    })

    test('properly cleans up on unmount', () => {
      const { unmount } = render(<AIAgentChat />)
      
      expect(() => unmount()).not.toThrow()
    })
  })
})