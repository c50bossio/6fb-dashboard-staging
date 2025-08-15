import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    const { action, barbershop_id, ...params } = await request.json()
    
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name, location, services')
      .eq('id', barbershop_id)
      .eq('owner_id', user.id)
      .single()
    
    if (!barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found or access denied'
      }, { status: 404 })
    }
    
    switch (action) {
      case 'generate_seo_plan':
        return NextResponse.json({
          success: true,
          data: await generateSEOPlan(supabase, barbershop, params)
        })
        
      case 'keyword_research':
        return NextResponse.json({
          success: true,
          data: await performKeywordResearch(supabase, barbershop, params)
        })
        
      case 'content_calendar':
        return NextResponse.json({
          success: true,
          data: await generateContentCalendar(supabase, barbershop, params)
        })
        
      case 'competitor_analysis':
        return NextResponse.json({
          success: true,
          data: await performCompetitorAnalysis(supabase, barbershop, params)
        })
        
      case 'gmb_automation':
        return NextResponse.json({
          success: true,
          data: await generateGMBContent(supabase, barbershop, params)
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('AI SEO Orchestrator error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

async function generateSEOPlan(supabase, barbershop, params) {
  const { data: existingPlan } = await supabase
    .from('seo_plans')
    .select('*')
    .eq('barbershop_id', barbershop.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (existingPlan) {
    return existingPlan
  }
  
  const newPlan = {
    barbershop_id: barbershop.id,
    generated_at: new Date().toISOString(),
    status: 'pending',
    message: 'SEO plan generation requires AI service integration',
    data_available: false,
    next_steps: [
      'Connect AI SEO service',
      'Analyze barbershop location and services',
      'Generate keyword research',
      'Create content calendar'
    ]
  }
  
  const { data: savedPlan, error } = await supabase
    .from('seo_plans')
    .insert(newPlan)
    .select()
    .single()
  
  if (error) {
    console.error('Error saving SEO plan:', error)
    return {
      error: 'Failed to create SEO plan',
      data_available: false
    }
  }
  
  return savedPlan || newPlan
}

async function performKeywordResearch(supabase, barbershop, params) {
  const { location, services, business_name } = params
  
  const { data: existingResearch } = await supabase
    .from('keyword_research')
    .select('*')
    .eq('barbershop_id', barbershop.id)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (existingResearch && existingResearch.length > 0) {
    return {
      barbershop_id: barbershop.id,
      location: location || barbershop.location,
      keywords: existingResearch,
      total_keywords: existingResearch.length,
      generated_at: new Date().toISOString()
    }
  }
  
  return {
    barbershop_id: barbershop.id,
    location: location || barbershop.location,
    keywords: [],
    total_keywords: 0,
    generated_at: new Date().toISOString(),
    data_available: false,
    message: 'Keyword research requires AI service integration and external API access',
    setup_required: [
      'Configure Google Keyword Planner API',
      'Set up SEMrush or Ahrefs integration',
      'Enable AI keyword generation service'
    ]
  }
}

async function generateContentCalendar(supabase, barbershop, params) {
  const { start_date, end_date, frequency } = params
  
  const { data: existingContent } = await supabase
    .from('content_calendar')
    .select('*')
    .eq('barbershop_id', barbershop.id)
    .gte('publish_date', start_date || new Date().toISOString())
    .lte('publish_date', end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('publish_date', { ascending: true })
  
  if (existingContent && existingContent.length > 0) {
    return {
      barbershop_id: barbershop.id,
      content_items: existingContent,
      total_items: existingContent.length,
      start_date: start_date,
      end_date: end_date
    }
  }
  
  return {
    barbershop_id: barbershop.id,
    content_items: [],
    total_items: 0,
    start_date: start_date,
    end_date: end_date,
    data_available: false,
    message: 'Content calendar generation requires AI content service',
    suggested_topics: [
      'Seasonal haircut trends',
      'Hair care tips',
      'Staff spotlights',
      'Customer testimonials',
      'Service highlights'
    ]
  }
}

async function performCompetitorAnalysis(supabase, barbershop, params) {
  const { radius, limit } = params
  
  const { data: competitors } = await supabase
    .from('competitor_analysis')
    .select('*')
    .eq('barbershop_id', barbershop.id)
    .order('created_at', { ascending: false })
    .limit(limit || 10)
  
  if (competitors && competitors.length > 0) {
    return {
      barbershop_id: barbershop.id,
      competitors: competitors,
      total_analyzed: competitors.length,
      analysis_date: new Date().toISOString()
    }
  }
  
  return {
    barbershop_id: barbershop.id,
    competitors: [],
    total_analyzed: 0,
    analysis_date: new Date().toISOString(),
    data_available: false,
    message: 'Competitor analysis requires Google Maps API and web scraping services',
    required_integrations: [
      'Google Maps Places API',
      'Google My Business API',
      'Web scraping service',
      'Review aggregation API'
    ]
  }
}

async function generateGMBContent(supabase, barbershop, params) {
  const { content_type, count } = params
  
  const { data: gmbContent } = await supabase
    .from('gmb_content')
    .select('*')
    .eq('barbershop_id', barbershop.id)
    .eq('content_type', content_type || 'post')
    .order('created_at', { ascending: false })
    .limit(count || 5)
  
  if (gmbContent && gmbContent.length > 0) {
    return {
      barbershop_id: barbershop.id,
      content_type: content_type,
      posts: gmbContent,
      total_generated: gmbContent.length
    }
  }
  
  const { data: gmbAccount } = await supabase
    .from('gmb_accounts')
    .select('*')
    .eq('barbershop_id', barbershop.id)
    .single()
  
  if (!gmbAccount) {
    return {
      barbershop_id: barbershop.id,
      content_type: content_type,
      posts: [],
      total_generated: 0,
      data_available: false,
      message: 'Google My Business integration required',
      setup_steps: [
        'Connect Google My Business account',
        'Verify business ownership',
        'Enable GMB API access',
        'Configure posting permissions'
      ]
    }
  }
  
  return {
    barbershop_id: barbershop.id,
    content_type: content_type,
    posts: [],
    total_generated: 0,
    data_available: false,
    message: 'GMB content generation requires AI service',
    account_connected: true,
    gmb_account_id: gmbAccount.id
  }
}