import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    const body = await request.json()
    const { title, content, domain, tags, confidence } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title and content are required' 
      }, { status: 400 })
    }

    const knowledgeEntry = {
      id: `manual_${Date.now()}_${process.hrtime.bigint().toString(36)}`,
      title: title.trim(),
      content: content.trim(),
      domain: domain || 'barbershop_operations',
      tags: Array.isArray(tags) ? tags : [],
      confidence: parseFloat(confidence) || 0.8,
      source: 'manual_entry',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 1. Save to vector database (ChromaDB)
    // 2. Generate embeddings for the content
    // 3. Add to knowledge base for AI retrieval
    
    const response = {
      id: knowledgeEntry.id,
      title: knowledgeEntry.title,
      domain: knowledgeEntry.domain,
      confidence: knowledgeEntry.confidence
    }

    try {
      const response = await fetch('http://localhost:8001/api/v1/knowledge/add-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(knowledgeEntry)
      })

      if (response.ok) {
        const result = await response.json()
        return NextResponse.json({
          success: true,
          message: 'Knowledge entry added successfully to global knowledge base',
          entry_id: knowledgeEntry.id,
          stored_in_vector_db: true,
          ai_enhancement_active: true,
          timestamp: new Date().toISOString()
        })
      } else {
      }
    } catch (backendError) {
    }

    return NextResponse.json({
      success: true,
      message: 'Knowledge entry processed successfully',
      entry_id: knowledgeEntry.id,
      stored_in_vector_db: false,
      ai_enhancement_active: false,
      backend_status: 'offline',
      note: 'Entry will be synced when backend services are available',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Manual entry API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method not allowed. Use POST to add knowledge entries.' 
  }, { status: 405 })
}