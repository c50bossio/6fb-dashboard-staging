import { render, screen, waitFor } from '@/test-utils/test-utils'
import { AIAgentsDashboard } from '@/components/dashboard/AIAgentsDashboard'
import { mockAgentResponse, mockFetch } from '@/test-utils/test-utils'

jest.mock('@/services/ai-agent-service', () => ({
  sendAgentMessage: jest.fn()
}))

describe('AIAgentsDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch()
  })

  it('renders AI agents dashboard with available agents', () => {
    render(<AIAgentsDashboard />)

    expect(screen.getByText(/AI Agents/i)).toBeInTheDocument()
    
    expect(screen.getByText(/Master Coach/i)).toBeInTheDocument()
    expect(screen.getByText(/Financial Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Client Acquisition/i)).toBeInTheDocument()
    expect(screen.getByText(/Operations Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Brand Development/i)).toBeInTheDocument()
    expect(screen.getByText(/Growth Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Strategic Mindset/i)).toBeInTheDocument()
  })

  it('allows selecting an agent and starting a conversation', async () => {
    const { user } = render(<AIAgentsDashboard />)

    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    expect(screen.getByPlaceholderText(/Ask the Financial Agent/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('sends message to selected agent', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => mockAgentResponse
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Financial Agent/i)
    await user.type(messageInput, 'How can I increase my revenue?')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Test agent response/i)).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/agents/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'financial',
          message: 'How can I increase my revenue?',
          userId: expect.any(String),
          barbershopId: expect.any(String)
        })
      })
    )
  })

  it('displays agent recommendations', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => ({
          ...mockAgentResponse,
          recommendations: [
            {
              id: 'rec-1',
              type: 'pricing',
              priority: 'high',
              title: 'Optimize Pricing Strategy',
              description: 'Implement dynamic pricing based on demand',
              estimatedImpact: '+25% revenue',
              confidence: 0.9,
              timeToImplement: '1 week'
            },
            {
              id: 'rec-2',
              type: 'operations',
              priority: 'medium',
              title: 'Streamline Booking Process',
              description: 'Reduce booking steps to increase conversions',
              estimatedImpact: '+15% bookings',
              confidence: 0.8,
              timeToImplement: '3 days'
            }
          ]
        })
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    const masterCoach = screen.getByText(/Master Coach/i).closest('button')
    await user.click(masterCoach)

    const messageInput = screen.getByPlaceholderText(/Ask the Master Coach/i)
    await user.type(messageInput, 'Give me recommendations')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Optimize Pricing Strategy')).toBeInTheDocument()
      expect(screen.getByText('Streamline Booking Process')).toBeInTheDocument()
      expect(screen.getByText('+25% revenue')).toBeInTheDocument()
      expect(screen.getByText('+15% bookings')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    const operationsAgent = screen.getByText(/Operations Agent/i).closest('button')
    await user.click(operationsAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Operations Agent/i)
    await user.type(messageInput, 'Test message')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during message sending', async () => {
    let resolvePromise
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve
    })

    global.fetch = jest.fn().mockReturnValue(slowPromise)

    const { user } = render(<AIAgentsDashboard />)

    const brandAgent = screen.getByText(/Brand Development/i).closest('button')
    await user.click(brandAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Brand Development/i)
    await user.type(messageInput, 'Help with branding')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(screen.getByText(/thinking/i)).toBeInTheDocument()
    expect(sendButton).toBeDisabled()

    resolvePromise({
      ok: true,
      json: async () => mockAgentResponse
    })

    await waitFor(() => {
      expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument()
    })
  })

  it('maintains conversation history', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => mockAgentResponse
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    const growthAgent = screen.getByText(/Growth Agent/i).closest('button')
    await user.click(growthAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Growth Agent/i)
    await user.type(messageInput, 'First message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument()
    })

    await user.clear(messageInput)
    await user.type(messageInput, 'Second message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText('Second message')).toBeInTheDocument()
    })

    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
  })

  it('switches between different agents correctly', async () => {
    const { user } = render(<AIAgentsDashboard />)

    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    expect(screen.getByPlaceholderText(/Ask the Financial Agent/i)).toBeInTheDocument()

    const strategicAgent = screen.getByText(/Strategic Mindset/i).closest('button')
    await user.click(strategicAgent)

    expect(screen.getByPlaceholderText(/Ask the Strategic Mindset/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Ask the Financial Agent/i)).not.toBeInTheDocument()
  })

  it('displays agent descriptions and capabilities', () => {
    render(<AIAgentsDashboard />)

    expect(screen.getByText(/Overall business strategy/i)).toBeInTheDocument()
    expect(screen.getByText(/Revenue optimization/i)).toBeInTheDocument()
    expect(screen.getByText(/Marketing and customer acquisition/i)).toBeInTheDocument()
    expect(screen.getByText(/Scheduling and efficiency/i)).toBeInTheDocument()
  })

  it('handles empty message submission', async () => {
    const { user } = render(<AIAgentsDashboard />)

    const masterCoach = screen.getByText(/Master Coach/i).closest('button')
    await user.click(masterCoach)

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(global.fetch).not.toHaveBeenCalled()

    const messageInput = screen.getByPlaceholderText(/Ask the Master Coach/i)
    expect(messageInput).toHaveFocus()
  })

  it('supports keyboard shortcuts', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => mockAgentResponse
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Financial Agent/i)
    await user.type(messageInput, 'Test keyboard shortcut')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/chat',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })
})