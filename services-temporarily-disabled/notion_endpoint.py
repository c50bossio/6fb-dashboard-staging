"""
Notion Integration FastAPI Endpoint
Provides REST API access to Notion knowledge extraction
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Import our Notion knowledge extractor
try:
    from .notion_knowledge_extractor import extract_notion_knowledge, notion_knowledge_extractor
    NOTION_EXTRACTOR_AVAILABLE = True
except ImportError:
    NOTION_EXTRACTOR_AVAILABLE = False
    print("⚠️ Notion knowledge extractor not available")

logger = logging.getLogger(__name__)

# Create FastAPI router
router = APIRouter(prefix="/notion", tags=["Notion Integration"])

# Pydantic models for API
class NotionExtractionRequest(BaseModel):
    notion_token: str = Field(..., description="Notion API integration token")
    query: Optional[str] = Field(None, description="Optional search query to filter pages")

class NotionStatusRequest(BaseModel):
    notion_token: str = Field(..., description="Notion API integration token")

@router.get("/status")
async def get_notion_integration_status():
    """
    Get the status of Notion integration system
    """
    try:
        return {
            'success': True,
            'notion_extractor_available': NOTION_EXTRACTOR_AVAILABLE,
            'features': {
                'workspace_scanning': NOTION_EXTRACTOR_AVAILABLE,
                'content_extraction': NOTION_EXTRACTOR_AVAILABLE,
                'intelligent_categorization': NOTION_EXTRACTOR_AVAILABLE,
                'knowledge_import': NOTION_EXTRACTOR_AVAILABLE
            },
            'supported_content_types': [
                'pages', 'databases', 'blocks', 'rich_text'
            ] if NOTION_EXTRACTOR_AVAILABLE else [],
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Notion status check failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'notion_extractor_available': False,
            'timestamp': datetime.now().isoformat()
        }

@router.post("/extract-knowledge")
async def extract_knowledge_from_notion(request: NotionExtractionRequest):
    """
    Extract barbershop knowledge from Notion workspace and import to AI knowledge base
    """
    try:
        if not NOTION_EXTRACTOR_AVAILABLE:
            raise HTTPException(
                status_code=503, 
                detail="Notion integration not available. Install notion-client package."
            )
        
        logger.info(f"🚀 Starting Notion knowledge extraction...")
        
        # Extract knowledge using our service
        results = await extract_notion_knowledge(
            notion_token=request.notion_token,
            query=request.query
        )
        
        if results['success']:
            extraction_results = results.get('extraction_results', {})
            
            return {
                'success': True,
                'message': results['message'],
                'extraction_results': extraction_results,
                'summary': {
                    'entries_found': extraction_results.get('entries_found', 0),
                    'successful_imports': extraction_results.get('import_results', {}).get('successful_imports', 0),
                    'failed_imports': extraction_results.get('import_results', {}).get('failed_imports', 0),
                    'domains_covered': extraction_results.get('domains_covered', []),
                    'average_confidence': round(extraction_results.get('average_confidence', 0), 2),
                    'success_rate': round(extraction_results.get('import_results', {}).get('success_rate', 0), 2)
                },
                'timestamp': datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=results.get('error', results.get('message', 'Knowledge extraction failed'))
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Notion knowledge extraction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Knowledge extraction failed: {str(e)}"
        )

@router.post("/test-connection")
async def test_notion_connection(request: NotionStatusRequest):
    """
    Test Notion API connection with provided token
    """
    try:
        if not NOTION_EXTRACTOR_AVAILABLE:
            return {
                'success': False,
                'error': 'Notion integration not available',
                'connection_status': 'unavailable'
            }
        
        # Initialize extractor with provided token
        from .notion_knowledge_extractor import NotionKnowledgeExtractor
        extractor = NotionKnowledgeExtractor(request.notion_token)
        
        # Test connection
        connection_success = await extractor.initialize()
        
        if connection_success:
            return {
                'success': True,
                'connection_status': 'connected',
                'message': 'Notion API connection successful',
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'success': False,
                'connection_status': 'failed',
                'error': 'Unable to connect to Notion API',
                'timestamp': datetime.now().isoformat()
            }
        
    except Exception as e:
        logger.error(f"❌ Notion connection test failed: {e}")
        return {
            'success': False,
            'connection_status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@router.get("/integration-guide")
async def get_notion_integration_guide():
    """
    Get step-by-step guide for setting up Notion integration
    """
    return {
        'success': True,
        'integration_guide': {
            'title': 'Notion Integration Setup Guide',
            'steps': [
                {
                    'step': 1,
                    'title': 'Create Notion Integration',
                    'description': 'Go to https://www.notion.so/my-integrations and create a new integration',
                    'details': [
                        'Click "New integration"',
                        'Name it "6FB AI Knowledge Extractor"',
                        'Select your workspace',
                        'Copy the "Internal Integration Token"'
                    ]
                },
                {
                    'step': 2,
                    'title': 'Grant Page Access',
                    'description': 'Share your business pages with the integration',
                    'details': [
                        'Go to the Notion pages containing barbershop knowledge',
                        'Click "Share" in the top right',
                        'Click "Invite" and search for your integration name',
                        'Grant "Read" access to the integration'
                    ]
                },
                {
                    'step': 3,
                    'title': 'Extract Knowledge',
                    'description': 'Use the API token in the admin panel',
                    'details': [
                        'Paste the token in the Notion extraction form',
                        'Optionally add search terms to filter pages',
                        'Click "Extract Knowledge" to import your expertise'
                    ]
                }
            ],
            'security_notes': [
                'The integration only needs read access to your pages',
                'No personal or financial information will be accessed',
                'Only business strategy and operational content will be extracted',
                'You can revoke access at any time from Notion settings'
            ],
            'supported_content': [
                'Standard Operating Procedures (SOPs)',
                'Staff training materials',
                'Customer service protocols',
                'Marketing strategies and campaigns',
                'Pricing and service guidelines',
                'Business performance data',
                'Industry best practices and tips'
            ]
        },
        'timestamp': datetime.now().isoformat()
    }

@router.get("/demo-data")
async def get_demo_extraction_data():
    """
    Get sample data showing what would be extracted from a typical barbershop Notion workspace
    """
    try:
        demo_data = {
            'sample_extractions': [
                {
                    'page_title': 'Standard Operating Procedures - Daily Opening',
                    'extracted_content': 'Daily opening checklist: 1. Unlock and disarm security system, 2. Turn on all lights and equipment, 3. Check sanitation station supplies, 4. Review daily appointments, 5. Prepare workstations with clean tools...',
                    'detected_domain': 'barbershop_operations',
                    'confidence_score': 0.94,
                    'business_metrics': {
                        'time_periods': [('30', 'minutes')],
                        'has_roi_data': False
                    },
                    'tags': ['opening', 'checklist', 'sanitation', 'tools', 'procedure']
                },
                {
                    'page_title': 'Customer Retention Strategies That Work',
                    'extracted_content': 'Follow-up text messages sent 24-48 hours after service increase retention by 31%. Template: "Hi [Name], hope you love your new look! Rate your experience and get 10% off your next visit: [link]"',
                    'detected_domain': 'customer_experience',
                    'confidence_score': 0.91,
                    'business_metrics': {
                        'improvement_percentages': [31, 10],
                        'time_periods': [('24', 'hours'), ('48', 'hours')],
                        'has_roi_data': True
                    },
                    'tags': ['retention', 'follow up', 'text message', 'template', 'discount']
                },
                {
                    'page_title': 'Peak Hour Staffing Strategy',
                    'extracted_content': 'During busy periods (10 AM - 2 PM, 5 PM - 7 PM), increase staff by 50%. This reduces wait times from average 25 minutes to 8 minutes, improving customer satisfaction scores by 40%.',
                    'detected_domain': 'staff_management', 
                    'confidence_score': 0.89,
                    'business_metrics': {
                        'improvement_percentages': [50, 40],
                        'time_periods': [('25', 'minutes'), ('8', 'minutes')],
                        'has_roi_data': True
                    },
                    'tags': ['staffing', 'peak hours', 'wait time', 'satisfaction', 'strategy']
                },
                {
                    'page_title': 'Social Media Marketing ROI Analysis',
                    'extracted_content': 'Instagram before/after posts generate 3x more bookings than regular posts. Best performing times: Tuesday 6 PM, Thursday 7 PM, Saturday 11 AM. Average cost per booking: $2.40 vs industry average $8.50.',
                    'detected_domain': 'marketing_strategies',
                    'confidence_score': 0.92,
                    'business_metrics': {
                        'improvement_percentages': [3],
                        'dollar_amounts': ['2.40', '8.50'],
                        'has_roi_data': True
                    },
                    'tags': ['instagram', 'social media', 'booking', 'roi', 'cost', 'industry average']
                }
            ],
            'extraction_summary': {
                'total_pages_analyzed': 47,
                'knowledge_entries_created': 23,
                'domains_covered': [
                    'barbershop_operations', 'customer_experience', 
                    'staff_management', 'marketing_strategies', 
                    'revenue_optimization'
                ],
                'average_confidence_score': 0.87,
                'business_metrics_found': 15,
                'actionable_strategies': 23
            },
            'estimated_ai_improvement': {
                'before_extraction': {
                    'average_confidence': '65%',
                    'domain_coverage': 'Generic business advice',
                    'actionability': 'Low - theoretical recommendations'
                },
                'after_extraction': {
                    'average_confidence': '91%',
                    'domain_coverage': 'Barbershop-specific expertise',
                    'actionability': 'High - proven strategies with metrics'
                }
            }
        }
        
        return {
            'success': True,
            'demo_data': demo_data,
            'message': 'This shows what your actual Notion extraction would look like',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Demo data generation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }