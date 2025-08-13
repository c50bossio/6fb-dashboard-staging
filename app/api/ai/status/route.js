export const runtime = 'edge'

export async function GET() {
  return Response.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    models: {
      openai: {
        available: !!process.env.OPENAI_API_KEY,
        status: 'configured'
      },
      anthropic: {
        available: !!process.env.ANTHROPIC_API_KEY,
        status: 'configured'
      },
      google: {
        available: !!process.env.GOOGLE_AI_API_KEY,
        status: process.env.GOOGLE_AI_API_KEY ? 'configured' : 'not_configured'
      }
    },
    endpoints: {
      chat: '/api/ai/chat',
      agents: '/api/ai/agents',
      analysis: '/api/ai/analysis'
    },
    version: '1.0.0'
  })
}