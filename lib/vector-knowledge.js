// Vector Database Integration for RAG System
// Real vector-based knowledge retrieval for barbershop business intelligence

import OpenAI from 'openai'

// Initialize OpenAI for embeddings
let openaiClient = null
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// In-memory vector store (could be replaced with Pinecone, Weaviate, or ChromaDB)
let vectorStore = {
  documents: [],
  embeddings: [],
  initialized: false
}

// Barbershop-specific knowledge base
const BARBERSHOP_KNOWLEDGE_BASE = [
  {
    id: 'pricing_strategies',
    content: 'Barbershop pricing strategies: Premium haircuts range $25-45, basic cuts $15-25. Consider location, experience level, and service quality. Offer package deals like haircut + beard trim for 15% discount. Implement tiered pricing for junior/senior barbers.',
    category: 'pricing',
    confidence: 0.95
  },
  {
    id: 'customer_retention',
    content: 'Customer retention techniques: Implement loyalty programs with 10-visit punch cards. Send appointment reminders 24 hours prior. Follow up with customers 48 hours after service. Personalize service by remembering preferences. Offer birthday discounts.',
    category: 'customer_service',
    confidence: 0.92
  },
  {
    id: 'peak_hours_optimization',
    content: 'Peak hours for barbershops: Weekends (Saturday 9-5, Sunday 12-4), weekday evenings (5-8pm). Staff accordingly with 2-3 barbers during peak times. Offer off-peak discounts (10-15% Monday-Wednesday mornings) to balance demand.',
    category: 'operations',
    confidence: 0.88
  },
  {
    id: 'marketing_social_media',
    content: 'Barbershop social media marketing: Post before/after photos (with permission) on Instagram daily. Use local hashtags like #[CityName]Barber. Partner with local businesses for cross-promotion. Encourage customer reviews on Google My Business.',
    category: 'marketing',
    confidence: 0.90
  },
  {
    id: 'inventory_management',
    content: 'Barbershop inventory management: Track product usage rates, maintain 2-week safety stock of essential items (shampoo, styling products). Order in bulk quarterly for 10-15% savings. Popular products: hair clippers ($200-400), styling pomade, beard oils.',
    category: 'operations',
    confidence: 0.87
  },
  {
    id: 'staff_scheduling',
    content: 'Optimal staff scheduling: Minimum 2 barbers during business hours, 3+ during peak times. Cross-train staff for flexibility. Track individual barber productivity (cuts per hour, revenue generated). Implement commission-based pay (40-60% of service revenue).',
    category: 'management',
    confidence: 0.91
  },
  {
    id: 'customer_satisfaction',
    content: 'Customer satisfaction metrics: Aim for 4.7+ star average on Google reviews. Track appointment no-show rates (target <5%). Measure average service time (haircut: 25-35 minutes, beard trim: 15 minutes). Customer complaints should be <2% of total visits.',
    category: 'customer_service',
    confidence: 0.89
  },
  {
    id: 'revenue_optimization',
    content: 'Revenue optimization strategies: Upsell complementary services (hot towel shave with haircut), retail hair products (20-30% markup), gift cards for holidays. Track average ticket size ($35-50 target). Implement subscription models for regular customers.',
    category: 'business',
    confidence: 0.93
  },
  {
    id: 'equipment_maintenance',
    content: 'Equipment maintenance schedule: Clean clippers after each use, oil weekly. Replace clipper blades monthly for busy barbers. Deep clean stations daily, sanitize tools between customers. Budget $200-400 monthly for equipment replacement/maintenance.',
    category: 'operations',
    confidence: 0.85
  },
  {
    id: 'local_seo_optimization',
    content: 'Local SEO for barbershops: Claim Google My Business listing, post regular updates. Use location-based keywords ([City] barbershop, barber near me). Get listed on Yelp, Facebook Business. Encourage local reviews and respond to all feedback professionally.',  
    category: 'marketing',
    confidence: 0.86
  }
]

// Generate embeddings for a text using OpenAI
export async function generateEmbedding(text) {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized - check API key')
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small', // More cost-effective than ada-002
      input: text,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    throw new Error(`Embedding generation failed: ${error.message}`)
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}

// Initialize the vector database with barbershop knowledge
export async function initializeVectorDatabase() {
  if (vectorStore.initialized) {
    console.log('✅ Vector database already initialized')
    return vectorStore
  }

  console.log('🔄 Initializing vector database with barbershop knowledge...')

  try {
    // Generate embeddings for all knowledge base entries
    const embeddings = []
    for (const doc of BARBERSHOP_KNOWLEDGE_BASE) {
      console.log(`Generating embedding for: ${doc.id}`)
      const embedding = await generateEmbedding(doc.content)
      embeddings.push(embedding)
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    vectorStore = {
      documents: BARBERSHOP_KNOWLEDGE_BASE,
      embeddings: embeddings,
      initialized: true,
      created_at: new Date().toISOString(),
      total_documents: BARBERSHOP_KNOWLEDGE_BASE.length
    }

    console.log(`✅ Vector database initialized with ${BARBERSHOP_KNOWLEDGE_BASE.length} documents`)
    return vectorStore

  } catch (error) {
    console.error('❌ Vector database initialization failed:', error)
    throw new Error(`Vector database initialization failed: ${error.message}`)
  }
}

// Search for relevant knowledge using vector similarity
export async function searchVectorKnowledge(query, options = {}) {
  const {
    limit = 3,
    minSimilarity = 0.5,
    categories = null
  } = options

  try {
    // Ensure vector database is initialized
    if (!vectorStore.initialized) {
      await initializeVectorDatabase()
    }

    console.log(`🔍 Vector search for: "${query}"`)

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    // Calculate similarities with all documents
    const similarities = vectorStore.embeddings.map((docEmbedding, index) => ({
      document: vectorStore.documents[index],
      similarity: cosineSimilarity(queryEmbedding, docEmbedding),
      index
    }))

    // Filter by category if specified
    let filteredSimilarities = similarities
    if (categories && categories.length > 0) {
      filteredSimilarities = similarities.filter(item => 
        categories.includes(item.document.category)
      )
    }

    // Filter by minimum similarity and sort by relevance
    const relevantDocs = filteredSimilarities
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    console.log(`✅ Found ${relevantDocs.length} relevant documents`)

    return {
      query,
      results: relevantDocs.map(item => ({
        content: item.document.content,
        category: item.document.category,
        similarity: Math.round(item.similarity * 100) / 100,
        confidence: item.document.confidence,
        id: item.document.id
      })),
      total_searched: filteredSimilarities.length,
      search_time: Date.now()
    }

  } catch (error) {
    console.error('❌ Vector search failed:', error)
    
    // Fallback to keyword-based search
    console.log('🔄 Falling back to keyword search...')
    return await fallbackKeywordSearch(query, options)
  }
}

// Fallback keyword-based search when vector search fails
async function fallbackKeywordSearch(query, options = {}) {
  const { limit = 3, categories = null } = options
  
  const queryLower = query.toLowerCase()
  const keywordMatches = []

  for (const doc of BARBERSHOP_KNOWLEDGE_BASE) {
    if (categories && !categories.includes(doc.category)) continue

    const contentLower = doc.content.toLowerCase()
    let score = 0

    // Simple keyword matching
    const queryWords = queryLower.split(' ').filter(word => word.length > 2)
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1
      }
    }

    if (score > 0) {
      keywordMatches.push({
        content: doc.content,
        category: doc.category,
        similarity: Math.min(score / queryWords.length, 1),
        confidence: doc.confidence,
        id: doc.id
      })
    }
  }

  return {
    query,
    results: keywordMatches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit),
    fallback: true,
    total_searched: keywordMatches.length
  }
}

// Get enhanced context for AI responses
export async function getEnhancedContext(message, businessContext = {}) {
  try {
    // Classify the message to determine relevant categories
    const categories = classifyMessageCategories(message)
    
    // Search for relevant knowledge
    const knowledgeResults = await searchVectorKnowledge(message, {
      limit: 4,
      minSimilarity: 0.4,
      categories: categories.length > 0 ? categories : null
    })

    // Generate contextual insights
    const insights = {
      relevantKnowledge: knowledgeResults.results,
      businessContext: {
        shop_name: businessContext.shop_name || 'your barbershop',
        location: businessContext.location || 'local area',
        staff_count: businessContext.staff_count || 'your team'
      },
      searchMetadata: {
        query: knowledgeResults.query,
        total_results: knowledgeResults.results.length,
        categories_searched: categories,
        is_fallback: knowledgeResults.fallback || false
      },
      recommendations: generateContextualRecommendations(knowledgeResults.results)
    }

    console.log(`📚 Enhanced context generated with ${insights.relevantKnowledge.length} knowledge items`)
    return insights

  } catch (error) {
    console.error('Enhanced context generation failed:', error)
    
    // Return minimal context if everything fails
    return {
      relevantKnowledge: [],
      businessContext: businessContext,
      searchMetadata: { error: error.message },
      recommendations: []
    }
  }
}

// Classify message into relevant categories for targeted search
function classifyMessageCategories(message) {
  const messageLower = message.toLowerCase()
  const categories = []

  // Business and revenue
  if (/\b(revenue|profit|money|income|sales|business|grow|increase)\b/.test(messageLower)) {
    categories.push('business')
  }

  // Pricing and costs
  if (/\b(price|pricing|cost|charge|expensive|cheap|afford)\b/.test(messageLower)) {
    categories.push('pricing')
  }

  // Customer service and retention
  if (/\b(customer|client|satisfaction|retention|loyalty|service|experience)\b/.test(messageLower)) {
    categories.push('customer_service')
  }

  // Marketing and promotion
  if (/\b(marketing|promote|social|instagram|facebook|advertising|attract|visibility)\b/.test(messageLower)) {
    categories.push('marketing')
  }

  // Operations and management
  if (/\b(schedule|staff|operation|manage|efficiency|time|hours|busy)\b/.test(messageLower)) {
    categories.push('operations', 'management')
  }

  return [...new Set(categories)] // Remove duplicates
}

// Generate contextual recommendations based on search results
function generateContextualRecommendations(searchResults) {
  const recommendations = []

  searchResults.forEach(result => {
    switch (result.category) {
      case 'pricing':
        recommendations.push('💰 Review your current pricing strategy and consider premium service tiers')
        break
      case 'customer_service':
        recommendations.push('⭐ Implement customer feedback collection to improve satisfaction')
        break
      case 'marketing':
        recommendations.push('📱 Focus on social media presence and local community engagement')
        break
      case 'operations':
        recommendations.push('⏰ Optimize scheduling during peak hours for maximum efficiency')
        break
      case 'business':
        recommendations.push('📈 Track key metrics like average ticket size and customer lifetime value')
        break
      default:
        recommendations.push('🎯 Consider implementing systematic improvements in your operations')
    }
  })

  return [...new Set(recommendations)].slice(0, 3) // Remove duplicates, limit to 3
}

// Health check for vector database
export async function checkVectorDatabaseHealth() {
  try {
    const status = {
      initialized: vectorStore.initialized,
      document_count: vectorStore.documents?.length || 0,
      embedding_model: 'text-embedding-3-small',
      openai_available: !!openaiClient,
      last_updated: vectorStore.created_at,
      health_check_time: new Date().toISOString()
    }

    // Test a simple search if initialized
    if (vectorStore.initialized) {
      const testSearch = await searchVectorKnowledge('test pricing strategy', { limit: 1 })
      status.search_functional = testSearch.results.length > 0
      status.test_search_results = testSearch.results.length
    }

    return status

  } catch (error) {
    return {
      initialized: false,
      error: error.message,
      health_check_time: new Date().toISOString()
    }
  }
}

// Add new knowledge to the vector database
export async function addKnowledge(newDocument) {
  try {
    console.log(`📝 Adding new knowledge: ${newDocument.id}`)

    // Generate embedding for new document
    const embedding = await generateEmbedding(newDocument.content)

    // Add to vector store
    vectorStore.documents.push(newDocument)
    vectorStore.embeddings.push(embedding)

    console.log(`✅ Knowledge added successfully: ${newDocument.id}`)
    return true

  } catch (error) {
    console.error('Failed to add knowledge:', error)
    return false
  }
}