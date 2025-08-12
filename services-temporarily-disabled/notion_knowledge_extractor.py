"""
Notion Knowledge Extractor
Automatically extracts barbershop business knowledge from Notion workspace
"""

import os
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import re

# Notion API client
try:
    from notion_client import Client
    NOTION_AVAILABLE = True
except ImportError:
    NOTION_AVAILABLE = False
    print("⚠️ Install notion-client: pip install notion-client")

# Import our knowledge service
from .enhanced_business_knowledge_service import (
    enhanced_business_knowledge_service, 
    BusinessDomain, 
    KnowledgeSource
)

logger = logging.getLogger(__name__)

@dataclass
class NotionKnowledgeEntry:
    """Structured knowledge entry extracted from Notion"""
    title: str
    content: str
    notion_page_id: str
    notion_url: str
    last_edited: str
    tags: List[str]
    domain: BusinessDomain
    confidence_score: float
    business_metrics: Dict[str, Any]
    source_type: str  # page, database_item, block, etc.

class NotionKnowledgeExtractor:
    """Extract and process barbershop knowledge from Notion workspace"""
    
    def __init__(self, notion_token: str = None):
        self.notion_token = notion_token or os.getenv('NOTION_API_TOKEN')
        self.client = None
        self.business_keywords = {
            'barbershop_operations': [
                'hours', 'opening', 'closing', 'schedule', 'booking', 'appointment',
                'equipment', 'tools', 'maintenance', 'cleaning', 'sanitation',
                'workflow', 'process', 'procedure', 'sop', 'standard operating'
            ],
            'customer_experience': [
                'customer', 'client', 'service', 'satisfaction', 'feedback',
                'retention', 'loyalty', 'experience', 'hospitality', 'welcome',
                'follow up', 'followup', 'communication', 'relationship'
            ],
            'revenue_optimization': [
                'pricing', 'price', 'revenue', 'profit', 'cost', 'expense',
                'upsell', 'package', 'bundle', 'promotion', 'discount',
                'financial', 'roi', 'return on investment', 'margin'
            ],
            'marketing_strategies': [
                'marketing', 'advertising', 'promotion', 'social media',
                'instagram', 'facebook', 'google', 'seo', 'campaign',
                'referral', 'word of mouth', 'review', 'testimonial'
            ],
            'staff_management': [
                'staff', 'employee', 'barber', 'team', 'training',
                'performance', 'evaluation', 'schedule', 'shift',
                'hiring', 'onboarding', 'management', 'leadership'
            ],
            'industry_benchmarks': [
                'benchmark', 'industry', 'average', 'standard', 'metric',
                'kpi', 'performance indicator', 'comparison', 'best practice',
                'industry standard', 'competitor', 'market'
            ],
            'seasonal_patterns': [
                'seasonal', 'holiday', 'summer', 'winter', 'spring', 'fall',
                'christmas', 'thanksgiving', 'new year', 'valentine',
                'back to school', 'wedding season', 'trend', 'pattern'
            ],
            'technology_integration': [
                'software', 'app', 'system', 'pos', 'point of sale',
                'booking system', 'crm', 'automation', 'digital',
                'online', 'website', 'integration', 'api'
            ]
        }
        
    async def initialize(self):
        """Initialize Notion client and verify access"""
        if not NOTION_AVAILABLE:
            raise Exception("notion-client package not installed")
            
        if not self.notion_token:
            raise Exception("NOTION_API_TOKEN environment variable not set")
            
        self.client = Client(auth=self.notion_token)
        
        # Test connection
        try:
            user_info = self.client.users.me()
            logger.info("✅ Notion API connection established")
            return True
        except Exception as e:
            logger.error(f"❌ Notion API connection failed: {e}")
            raise
    
    def categorize_content(self, title: str, content: str) -> Tuple[BusinessDomain, float]:
        """Intelligently categorize content based on keywords and context"""
        title_lower = title.lower()
        content_lower = content.lower()
        
        domain_scores = {}
        
        for domain, keywords in self.business_keywords.items():
            score = 0
            for keyword in keywords:
                # Title matches are weighted higher
                if keyword in title_lower:
                    score += 3
                if keyword in content_lower:
                    score += 1
            
            domain_scores[domain] = score
        
        # Find the domain with highest score
        best_domain = max(domain_scores.items(), key=lambda x: x[1])
        domain_name, score = best_domain
        
        # Default to barbershop_operations if no clear match
        if score == 0:
            domain_name = 'barbershop_operations'
            confidence = 0.5
        else:
            # Calculate confidence based on score
            max_possible_score = len(self.business_keywords[domain_name]) * 3
            confidence = min(0.95, 0.6 + (score / max_possible_score) * 0.35)
        
        return BusinessDomain(domain_name), confidence
    
    def extract_business_metrics(self, content: str) -> Dict[str, Any]:
        """Extract quantitative business metrics from content"""
        metrics = {}
        
        # Look for percentage improvements
        percentage_pattern = r'(\d+)%\s*(increase|improvement|boost|growth|better)'
        percentages = re.findall(percentage_pattern, content.lower())
        if percentages:
            metrics['improvement_percentages'] = [int(p[0]) for p in percentages]
        
        # Look for dollar amounts
        dollar_pattern = r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)'
        dollars = re.findall(dollar_pattern, content)
        if dollars:
            metrics['dollar_amounts'] = dollars
        
        # Look for time periods
        time_pattern = r'(\d+)\s*(day|week|month|year|hour)s?'
        times = re.findall(time_pattern, content.lower())
        if times:
            metrics['time_periods'] = times
        
        # Look for ROI indicators
        roi_indicators = ['roi', 'return on investment', 'profit', 'revenue increase']
        for indicator in roi_indicators:
            if indicator in content.lower():
                metrics['has_roi_data'] = True
                break
        
        return metrics
    
    def calculate_confidence_score(self, page_data: Dict, content: str) -> float:
        """Calculate confidence score based on various factors"""
        base_score = 0.7
        
        # Recent pages are more reliable
        last_edited = page_data.get('last_edited_time', '')
        if last_edited:
            try:
                edited_date = datetime.fromisoformat(last_edited.replace('Z', '+00:00'))
                days_old = (datetime.now() - edited_date.replace(tzinfo=None)).days
                if days_old < 30:
                    base_score += 0.1
                elif days_old > 365:
                    base_score -= 0.1
            except:
                pass
        
        # Content length and structure
        if len(content) > 500:
            base_score += 0.05
        if len(content) > 1000:
            base_score += 0.05
        
        # Has structured information (bullets, numbers, etc.)
        if any(marker in content for marker in ['•', '-', '1.', '2.', '3.']):
            base_score += 0.05
        
        # Contains actionable language
        action_words = ['should', 'recommend', 'best practice', 'strategy', 'technique']
        if any(word in content.lower() for word in action_words):
            base_score += 0.05
        
        return min(0.95, max(0.5, base_score))
    
    async def extract_page_content(self, page_id: str) -> Optional[str]:
        """Extract readable content from a Notion page"""
        try:
            blocks = self.client.blocks.children.list(block_id=page_id)
            content_parts = []
            
            for block in blocks['results']:
                block_type = block['type']
                
                if block_type == 'paragraph':
                    rich_text = block['paragraph']['rich_text']
                    text = ''.join([t['plain_text'] for t in rich_text])
                    if text.strip():
                        content_parts.append(text)
                        
                elif block_type == 'heading_1':
                    rich_text = block['heading_1']['rich_text']
                    text = ''.join([t['plain_text'] for t in rich_text])
                    if text.strip():
                        content_parts.append(f"# {text}")
                        
                elif block_type == 'heading_2':
                    rich_text = block['heading_2']['rich_text']
                    text = ''.join([t['plain_text'] for t in rich_text])
                    if text.strip():
                        content_parts.append(f"## {text}")
                        
                elif block_type == 'bulleted_list_item':
                    rich_text = block['bulleted_list_item']['rich_text']
                    text = ''.join([t['plain_text'] for t in rich_text])
                    if text.strip():
                        content_parts.append(f"• {text}")
                        
                elif block_type == 'numbered_list_item':
                    rich_text = block['numbered_list_item']['rich_text']
                    text = ''.join([t['plain_text'] for t in rich_text])
                    if text.strip():
                        content_parts.append(f"1. {text}")
            
            return '\n\n'.join(content_parts)
        except Exception as e:
            logger.error(f"❌ Error extracting content from page {page_id}: {e}")
            return None
    
    async def scan_workspace(self, query: str = None) -> List[NotionKnowledgeEntry]:
        """Scan entire Notion workspace for barbershop-related knowledge"""
        if not self.client:
            await self.initialize()
        
        knowledge_entries = []
        
        try:
            # Search for pages (if query provided, otherwise get all)
            if query:
                search_results = self.client.search(query=query)
            else:
                # Get all pages (Notion API has limitations, so we'll search for common business terms)
                business_terms = ['business', 'barber', 'customer', 'revenue', 'staff', 'marketing']
                search_results = {'results': []}
                
                for term in business_terms:
                    term_results = self.client.search(query=term)
                    search_results['results'].extend(term_results['results'])
            
            logger.info(f"🔍 Found {len(search_results['results'])} pages to analyze")
            
            for page in search_results['results']:
                if page['object'] != 'page':
                    continue
                
                page_id = page['id']
                title_parts = []
                
                # Extract title
                if 'title' in page['properties']:
                    title_property = page['properties']['title']
                    if title_property['type'] == 'title':
                        title_parts = [t['plain_text'] for t in title_property['title']]
                
                title = ''.join(title_parts) if title_parts else 'Untitled'
                
                # Skip if title doesn't seem business-related
                business_keywords = ['barber', 'business', 'customer', 'revenue', 'staff', 'marketing', 
                                   'service', 'procedure', 'sop', 'training', 'strategy']
                if not any(keyword in title.lower() for keyword in business_keywords):
                    continue
                
                # Extract content
                content = await self.extract_page_content(page_id)
                if not content or len(content.strip()) < 100:
                    continue
                
                # Categorize and analyze
                domain, domain_confidence = self.categorize_content(title, content)
                confidence_score = self.calculate_confidence_score(page, content)
                business_metrics = self.extract_business_metrics(content)
                
                # Extract tags from title and content
                tags = []
                for keyword_list in self.business_keywords.values():
                    for keyword in keyword_list:
                        if keyword in title.lower() or keyword in content.lower():
                            tags.append(keyword)
                tags = list(set(tags))[:10]  # Limit to 10 most relevant tags
                
                # Create knowledge entry
                knowledge_entry = NotionKnowledgeEntry(
                    title=title,
                    content=content[:2000],  # Limit content length
                    notion_page_id=page_id,
                    notion_url=page.get('url', ''),
                    last_edited=page.get('last_edited_time', ''),
                    tags=tags,
                    domain=domain,
                    confidence_score=min(confidence_score, domain_confidence),
                    business_metrics=business_metrics,
                    source_type='notion_page'
                )
                
                knowledge_entries.append(knowledge_entry)
                logger.info(f"✅ Extracted: {title[:50]}... (Domain: {domain.value}, Confidence: {knowledge_entry.confidence_score:.2f})")
            
            logger.info(f"🎉 Successfully extracted {len(knowledge_entries)} knowledge entries from Notion")
            return knowledge_entries
            
        except Exception as e:
            logger.error(f"❌ Error scanning workspace: {e}")
            return []
    
    async def import_to_knowledge_base(self, entries: List[NotionKnowledgeEntry]) -> Dict[str, Any]:
        """Import extracted Notion knowledge to the AI knowledge base"""
        successful_imports = 0
        failed_imports = 0
        
        for entry in entries:
            try:
                knowledge_id = await enhanced_business_knowledge_service.store_enhanced_knowledge(
                    title=entry.title,
                    content=entry.content,
                    summary=entry.content[:200] + '...',
                    domain=entry.domain,
                    knowledge_type='notion_import',
                    source=KnowledgeSource.EXTERNAL_DATA,
                    confidence_score=entry.confidence_score,
                    relevance_tags=entry.tags,
                    business_metrics=entry.business_metrics,
                    metadata={
                        'notion_page_id': entry.notion_page_id,
                        'notion_url': entry.notion_url,
                        'last_edited': entry.last_edited,
                        'source_type': entry.source_type,
                        'imported_at': datetime.now().isoformat()
                    }
                )
                
                successful_imports += 1
                logger.info(f"✅ Imported: {entry.title} (ID: {knowledge_id})")
                
            except Exception as e:
                failed_imports += 1
                logger.error(f"❌ Failed to import: {entry.title} - {e}")
        
        return {
            'total_entries': len(entries),
            'successful_imports': successful_imports,
            'failed_imports': failed_imports,
            'success_rate': successful_imports / len(entries) if entries else 0
        }

# Global service instance
notion_knowledge_extractor = NotionKnowledgeExtractor()

async def extract_notion_knowledge(notion_token: str = None, query: str = None) -> Dict[str, Any]:
    """Main function to extract knowledge from Notion workspace"""
    try:
        if notion_token:
            extractor = NotionKnowledgeExtractor(notion_token)
        else:
            extractor = notion_knowledge_extractor
        
        # Initialize and scan
        await extractor.initialize()
        entries = await extractor.scan_workspace(query=query)
        
        if not entries:
            return {
                'success': False,
                'message': 'No relevant business knowledge found in Notion workspace',
                'entries_found': 0
            }
        
        # Import to knowledge base
        import_results = await extractor.import_to_knowledge_base(entries)
        
        return {
            'success': True,
            'message': f'Successfully extracted and imported {import_results["successful_imports"]} knowledge entries',
            'extraction_results': {
                'entries_found': len(entries),
                'domains_covered': list(set([entry.domain.value for entry in entries])),
                'average_confidence': sum([entry.confidence_score for entry in entries]) / len(entries),
                'import_results': import_results
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Notion knowledge extraction failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to extract knowledge from Notion workspace'
        }