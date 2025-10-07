"""
AgentKit Utility Functions

Helper functions for agent operations, context management, and common tasks.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from decimal import Decimal

# Configure logging
logger = logging.getLogger(__name__)


def format_barbershop_context(barbershop_data: Dict[str, Any]) -> str:
    """
    Format barbershop data into context string for agent consumption.

    Args:
        barbershop_data: Dictionary containing barbershop information

    Returns:
        Formatted context string
    """
    context_parts = []

    if 'name' in barbershop_data:
        context_parts.append(f"Barbershop: {barbershop_data['name']}")

    if 'id' in barbershop_data:
        context_parts.append(f"ID: {barbershop_data['id']}")

    if 'location' in barbershop_data:
        context_parts.append(f"Location: {barbershop_data['location']}")

    if 'staff_count' in barbershop_data:
        context_parts.append(f"Staff: {barbershop_data['staff_count']} barbers")

    return " | ".join(context_parts)


def format_user_context(user_data: Dict[str, Any]) -> str:
    """
    Format user data into context string for agent consumption.

    Args:
        user_data: Dictionary containing user information

    Returns:
        Formatted context string
    """
    context_parts = []

    if 'role' in user_data:
        context_parts.append(f"Role: {user_data['role']}")

    if 'name' in user_data:
        context_parts.append(f"User: {user_data['name']}")

    if 'email' in user_data:
        context_parts.append(f"Email: {user_data['email']}")

    return " | ".join(context_parts)


def calculate_token_cost(input_tokens: int, output_tokens: int, model: str = "gpt-4-turbo-preview") -> Decimal:
    """
    Calculate cost in USD for token usage based on OpenAI pricing.

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model: Model name (default: gpt-4-turbo-preview)

    Returns:
        Cost in USD as Decimal
    """
    # Pricing as of October 2025 (per 1M tokens)
    pricing = {
        "gpt-4-turbo-preview": {"input": 10.00, "output": 30.00},
        "gpt-4": {"input": 30.00, "output": 60.00},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    }

    if model not in pricing:
        logger.warning(f"Unknown model {model}, using gpt-4-turbo-preview pricing")
        model = "gpt-4-turbo-preview"

    # Calculate cost (pricing is per 1M tokens)
    input_cost = Decimal(str(input_tokens)) * Decimal(str(pricing[model]["input"])) / Decimal('1000000')
    output_cost = Decimal(str(output_tokens)) * Decimal(str(pricing[model]["output"])) / Decimal('1000000')

    total_cost = input_cost + output_cost

    return total_cost.quantize(Decimal('0.000001'))  # 6 decimal places


def extract_trace_id(response: Dict[str, Any]) -> Optional[str]:
    """
    Extract OpenAI trace ID from API response for debugging.

    Args:
        response: OpenAI API response dictionary

    Returns:
        Trace ID string or None
    """
    # OpenAI includes trace IDs in response headers or metadata
    if isinstance(response, dict):
        # Check various possible locations
        trace_id = (
            response.get('trace_id') or
            response.get('x-trace-id') or
            response.get('metadata', {}).get('trace_id')
        )
        return trace_id

    return None


def is_session_expired(last_activity: datetime, timeout_minutes: int = 30) -> bool:
    """
    Check if a session has expired based on last activity.

    Args:
        last_activity: DateTime of last activity
        timeout_minutes: Session timeout in minutes

    Returns:
        True if session is expired
    """
    now = datetime.utcnow()
    timeout_delta = timedelta(minutes=timeout_minutes)

    return (now - last_activity) > timeout_delta


def sanitize_pii(text: str) -> str:
    """
    Remove or redact PII from text for safe logging.

    Args:
        text: Input text potentially containing PII

    Returns:
        Sanitized text with PII redacted
    """
    import re

    # Redact email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL_REDACTED]', text)

    # Redact phone numbers (various formats)
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE_REDACTED]', text)

    # Redact SSN patterns
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN_REDACTED]', text)

    # Redact credit card patterns (simple)
    text = re.sub(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[CARD_REDACTED]', text)

    return text


def format_handoff_context(from_agent: str, to_agent: str, conversation_history: List[Dict]) -> str:
    """
    Format context for agent handoffs to preserve conversation continuity.

    Args:
        from_agent: Name of agent handing off
        to_agent: Name of agent receiving handoff
        conversation_history: List of previous messages

    Returns:
        Formatted handoff context
    """
    context = f"[Handoff from {from_agent} to {to_agent}]\n\n"

    # Include last 3 messages for context
    recent_messages = conversation_history[-3:] if len(conversation_history) >= 3 else conversation_history

    for msg in recent_messages:
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')
        context += f"{role}: {content}\n"

    context += f"\n{to_agent}, please continue assisting the user based on the above context."

    return context


def validate_barbershop_id(barbershop_id: str) -> bool:
    """
    Validate barbershop ID format (UUID).

    Args:
        barbershop_id: Barbershop identifier

    Returns:
        True if valid UUID format
    """
    import re

    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )

    return bool(uuid_pattern.match(barbershop_id))


def get_greeting_for_time() -> str:
    """
    Get time-appropriate greeting.

    Returns:
        Greeting string based on current hour
    """
    current_hour = datetime.now().hour

    if 5 <= current_hour < 12:
        return "Good morning"
    elif 12 <= current_hour < 17:
        return "Good afternoon"
    elif 17 <= current_hour < 21:
        return "Good evening"
    else:
        return "Hello"
