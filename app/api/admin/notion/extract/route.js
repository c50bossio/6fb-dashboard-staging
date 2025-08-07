import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { notion_token, query } = body

    if (!notion_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notion API token is required' 
      }, { status: 400 })
    }

    // Call the Python Notion knowledge extractor
    const response = await fetch('http://127.0.0.1:8001/notion/extract-knowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notion_token,
        query: query || null
      })
    })

    const result = await response.json()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Knowledge extraction completed successfully',
        results: result.extraction_results,
        entries_imported: result.extraction_results?.import_results?.successful_imports || 0,
        domains_covered: result.extraction_results?.domains_covered || [],
        average_confidence: result.extraction_results?.average_confidence || 0
      })
    } else {
      throw new Error(result.error || 'Knowledge extraction failed')
    }

  } catch (error) {
    console.error('Notion extraction API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: 'Failed to extract knowledge from Notion. Please check your API token and try again.'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method not allowed. Use POST to extract knowledge.' 
  }, { status: 405 })
}