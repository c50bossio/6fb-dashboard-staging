"""
AI Token Tracker - Automatic usage tracking for all AI service calls
Integrates with existing AI services to track token consumption and costs
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from functools import wraps
import inspect
import sqlite3
import aiosqlite
from token_billing_service import TokenBillingService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AITokenTracker:
    """Central token tracking service that integrates with all AI providers"""
    
    def __init__(self, db_path: str = "billing_system.db"):
        self.db_path = db_path
        self.billing_service = TokenBillingService(db_path)
        self.active_sessions = {}  # Track active AI sessions
        
    async def initialize(self):
        """Initialize the token tracker"""
        await self.billing_service.initialize()
        logger.info("AI Token Tracker initialized")
    
    def track_ai_usage(self, provider: str, model: str, feature: str):
        """
        Decorator to automatically track AI token usage
        
        Usage:
        @ai_tracker.track_ai_usage('openai', 'gpt-4-turbo', 'analytics')
        async def generate_analytics(tenant_id: str, data: dict):
            # AI service call
            return result
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract tenant_id from function arguments
                tenant_id = await self._extract_tenant_id(func, args, kwargs)
                
                if not tenant_id:
                    logger.warning(f"No tenant_id found for {func.__name__}, skipping usage tracking")
                    return await func(*args, **kwargs)
                
                # Check usage limits before making AI call
                usage_check = await self.billing_service.check_usage_limits(tenant_id)
                if usage_check.get('limit_exceeded'):
                    logger.warning(f"Usage limit exceeded for tenant {tenant_id}")
                    return {
                        'error': 'Usage limit exceeded',
                        'message': usage_check.get('message', 'Please upgrade your plan to continue.'),
                        'upgrade_url': f"/billing?tenant_id={tenant_id}"
                    }
                
                # Start tracking session
                session_id = f"{tenant_id}_{datetime.now().timestamp()}"
                self.active_sessions[session_id] = {
                    'tenant_id': tenant_id,
                    'provider': provider,
                    'model': model,
                    'feature': feature,
                    'start_time': datetime.now()
                }
                
                try:
                    # Call the AI service
                    result = await func(*args, **kwargs)
                    
                    # Extract token usage from result
                    await self._process_ai_result(session_id, result)
                    
                    return result
                    
                except Exception as error:
                    logger.error(f"AI service error in {func.__name__}: {error}")
                    # Still track any partial usage if available
                    await self._handle_ai_error(session_id, error)
                    raise
                    
                finally:
                    # Clean up session
                    self.active_sessions.pop(session_id, None)
            
            return wrapper
        return decorator
    
    async def _extract_tenant_id(self, func: Callable, args: tuple, kwargs: dict) -> Optional[str]:
        """Extract tenant_id from function arguments"""
        # Try kwargs first
        if 'tenant_id' in kwargs:
            return kwargs['tenant_id']
        
        # Try positional arguments based on function signature
        sig = inspect.signature(func)
        param_names = list(sig.parameters.keys())
        
        # Look for tenant_id in first few parameters
        for i, param_name in enumerate(param_names[:5]):
            if 'tenant' in param_name.lower() and i < len(args):
                return args[i]
        
        # Try to extract from nested objects
        for arg in args[:3]:  # Check first 3 args
            if isinstance(arg, dict) and 'tenant_id' in arg:
                return arg['tenant_id']
            if hasattr(arg, 'tenant_id'):
                return getattr(arg, 'tenant_id')
        
        return None
    
    async def _process_ai_result(self, session_id: str, result: Any):
        """Process AI service result and track token usage"""
        session = self.active_sessions.get(session_id)
        if not session:
            return
        
        try:
            input_tokens = 0
            output_tokens = 0
            
            # Extract token usage based on result format
            if isinstance(result, dict):
                # OpenAI format
                if 'usage' in result:
                    usage = result['usage']
                    input_tokens = usage.get('prompt_tokens', 0)
                    output_tokens = usage.get('completion_tokens', 0)
                
                # Anthropic format
                elif 'input_tokens' in result and 'output_tokens' in result:
                    input_tokens = result['input_tokens']
                    output_tokens = result['output_tokens']
                
                # Google format
                elif 'usage_metadata' in result:
                    usage = result['usage_metadata']
                    input_tokens = usage.get('prompt_token_count', 0)
                    output_tokens = usage.get('candidates_token_count', 0)
                
                # Generic token count
                elif 'tokens_used' in result:
                    total_tokens = result['tokens_used']
                    # Estimate split (typical is ~60% input, 40% output)
                    input_tokens = int(total_tokens * 0.6)
                    output_tokens = int(total_tokens * 0.4)
            
            # Track usage if tokens were found
            if input_tokens > 0 or output_tokens > 0:
                await self.billing_service.track_token_usage(
                    tenant_id=session['tenant_id'],
                    provider=session['provider'],
                    model=session['model'],
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    feature=session['feature']
                )
                
                logger.info(f"Tracked {input_tokens + output_tokens} tokens for {session['tenant_id']}")
            else:
                logger.warning(f"No token usage found in AI result for session {session_id}")
                
        except Exception as error:
            logger.error(f"Error processing AI result: {error}")
    
    async def _handle_ai_error(self, session_id: str, error: Exception):
        """Handle AI service errors and track partial usage if available"""
        session = self.active_sessions.get(session_id)
        if not session:
            return
        
        # Log the error for analytics
        logger.error(f"AI service error for tenant {session['tenant_id']}: {error}")
        
        # TODO: Track failed requests for analytics and billing insights
    
    async def manual_track_usage(self, tenant_id: str, provider: str, model: str, 
                                input_tokens: int, output_tokens: int, feature: str):
        """Manually track token usage (for non-decorated functions)"""
        return await self.billing_service.track_token_usage(
            tenant_id=tenant_id,
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            feature=feature
        )
    
    async def get_tenant_usage_summary(self, tenant_id: str, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive usage summary for a tenant"""
        return await self.billing_service.get_usage_analytics(tenant_id, days)
    
    async def check_tenant_limits(self, tenant_id: str) -> Dict[str, Any]:
        """Check if tenant is approaching or has exceeded usage limits"""
        return await self.billing_service.check_usage_limits(tenant_id)

# Global instance for easy access
ai_tracker = AITokenTracker()

# Convenience decorators for different AI providers
def track_openai_usage(model: str, feature: str):
    """Track OpenAI API usage"""
    return ai_tracker.track_ai_usage('openai', model, feature)

def track_anthropic_usage(model: str, feature: str):
    """Track Anthropic API usage"""
    return ai_tracker.track_ai_usage('anthropic', model, feature)

def track_google_usage(model: str, feature: str):
    """Track Google AI API usage"""
    return ai_tracker.track_ai_usage('google', model, feature)

# Example usage integrations:

@track_openai_usage('gpt-4-turbo', 'analytics')
async def generate_business_analytics(tenant_id: str, business_data: dict):
    """Generate business analytics using GPT-4 Turbo"""
    # Simulate OpenAI API call
    import openai
    
    client = openai.AsyncOpenAI(api_key="your-api-key")
    
    response = await client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {
                "role": "system",
                "content": "You are a business analytics expert for barbershops."
            },
            {
                "role": "user", 
                "content": f"Analyze this business data: {json.dumps(business_data, indent=2)}"
            }
        ],
        max_tokens=1500
    )
    
    return {
        'analysis': response.choices[0].message.content,
        'usage': {
            'prompt_tokens': response.usage.prompt_tokens,
            'completion_tokens': response.usage.completion_tokens,
            'total_tokens': response.usage.total_tokens
        }
    }

@track_anthropic_usage('claude-3-sonnet', 'forecasting')
async def generate_revenue_forecast(tenant_id: str, historical_data: list):
    """Generate revenue forecasting using Claude"""
    # Simulate Anthropic API call
    import anthropic
    
    client = anthropic.AsyncAnthropic(api_key="your-api-key")
    
    message = await client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": f"Create a revenue forecast based on this data: {json.dumps(historical_data, indent=2)}"
            }
        ]
    )
    
    return {
        'forecast': message.content[0].text,
        'input_tokens': message.usage.input_tokens,
        'output_tokens': message.usage.output_tokens
    }

@track_google_usage('gemini-pro', 'recommendations')
async def generate_business_recommendations(tenant_id: str, performance_metrics: dict):
    """Generate business recommendations using Gemini"""
    # Simulate Google AI API call
    import google.generativeai as genai
    
    genai.configure(api_key="your-api-key")
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"Generate business improvement recommendations: {json.dumps(performance_metrics, indent=2)}"
    response = await model.generate_content_async(prompt)
    
    return {
        'recommendations': response.text,
        'usage_metadata': {
            'prompt_token_count': response.usage_metadata.prompt_token_count,
            'candidates_token_count': response.usage_metadata.candidates_token_count,
            'total_token_count': response.usage_metadata.total_token_count
        }
    }

# Usage tracking for existing services
class ExistingServiceIntegrator:
    """Helper to integrate token tracking with existing AI services"""
    
    def __init__(self, tracker: AITokenTracker):
        self.tracker = tracker
    
    async def track_chat_service(self, tenant_id: str, messages: list, response: dict):
        """Track usage for chat/conversation services"""
        # Estimate tokens for chat messages
        input_tokens = self._estimate_tokens_from_messages(messages)
        output_tokens = response.get('usage', {}).get('completion_tokens', 0)
        
        if not output_tokens:
            output_tokens = self._estimate_tokens_from_text(response.get('content', ''))
        
        await self.tracker.manual_track_usage(
            tenant_id=tenant_id,
            provider='openai',  # or detect from response
            model='gpt-4',      # or detect from response  
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            feature='chat'
        )
    
    def _estimate_tokens_from_messages(self, messages: list) -> int:
        """Rough token estimation for chat messages (1 token ≈ 4 characters)"""
        total_chars = sum(len(msg.get('content', '')) for msg in messages)
        return max(1, total_chars // 4)
    
    def _estimate_tokens_from_text(self, text: str) -> int:
        """Rough token estimation for text (1 token ≈ 4 characters)"""
        return max(1, len(text) // 4)

# Initialize global integrator
service_integrator = ExistingServiceIntegrator(ai_tracker)

async def demo_token_tracking():
    """Demonstrate the token tracking system"""
    await ai_tracker.initialize()
    
    # Example: Track analytics generation
    result = await generate_business_analytics("tenant_123", {
        "revenue": 5000,
        "appointments": 150,
        "average_ticket": 33.33
    })
    print("Analytics result:", result)
    
    # Check usage limits
    limits = await ai_tracker.check_tenant_limits("tenant_123")
    print("Usage limits:", limits)
    
    # Get usage summary
    summary = await ai_tracker.get_tenant_usage_summary("tenant_123")
    print("Usage summary:", summary)

if __name__ == "__main__":
    asyncio.run(demo_token_tracking())