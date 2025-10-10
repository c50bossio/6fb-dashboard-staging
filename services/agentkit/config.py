"""
AgentKit Configuration Management

Handles environment-based configuration for OpenAI AgentKit integration.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')


class AgentKitConfig:
    """Configuration manager for AgentKit integration"""

    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    OPENAI_MODEL: str = os.getenv('OPENAI_MODEL', 'gpt-4-turbo-preview')
    OPENAI_TEMPERATURE: float = float(os.getenv('OPENAI_TEMPERATURE', '0.7'))
    OPENAI_MAX_TOKENS: int = int(os.getenv('OPENAI_MAX_TOKENS', '4000'))

    # AgentKit Specific
    AGENTKIT_ENABLED: bool = os.getenv('AGENTKIT_ENABLED', 'true').lower() == 'true'
    AGENTKIT_DEBUG: bool = os.getenv('AGENTKIT_DEBUG', 'false').lower() == 'true'
    AGENTKIT_TRACE_ENABLED: bool = os.getenv('AGENTKIT_TRACE_ENABLED', 'true').lower() == 'true'

    # Rate Limiting
    RATE_LIMIT_PER_HOUR: int = int(os.getenv('AGENTKIT_RATE_LIMIT_PER_HOUR', '100'))

    # Cost Protection
    MONTHLY_BUDGET_USD: float = float(os.getenv('AGENTKIT_MONTHLY_BUDGET_USD', '5000'))
    BUDGET_ALERT_THRESHOLD: float = float(os.getenv('AGENTKIT_BUDGET_ALERT_THRESHOLD', '0.8'))
    HARD_LIMIT_ENABLED: bool = os.getenv('AGENTKIT_HARD_LIMIT_ENABLED', 'false').lower() == 'true'

    # Database Configuration
    DATABASE_URL: str = os.getenv('DATABASE_URL', '')
    SUPABASE_URL: str = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

    # Session Management
    SESSION_TIMEOUT_MINUTES: int = int(os.getenv('AGENTKIT_SESSION_TIMEOUT_MINUTES', '30'))
    SESSION_MAX_MESSAGES: int = int(os.getenv('AGENTKIT_SESSION_MAX_MESSAGES', '100'))

    # Guardrails
    GUARDRAILS_ENABLED: bool = os.getenv('AGENTKIT_GUARDRAILS_ENABLED', 'true').lower() == 'true'

    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    SENTRY_DSN: Optional[str] = os.getenv('NEXT_PUBLIC_SENTRY_DSN')

    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required")

        if not cls.SUPABASE_URL or not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("Supabase configuration is required")

        return True

    @classmethod
    def get_agent_config(cls, agent_name: str) -> dict:
        """Get configuration for a specific agent"""
        return {
            "model": cls.OPENAI_MODEL,
            "temperature": cls.OPENAI_TEMPERATURE,
            "max_tokens": cls.OPENAI_MAX_TOKENS,
            "trace_enabled": cls.AGENTKIT_TRACE_ENABLED,
            "guardrails_enabled": cls.GUARDRAILS_ENABLED,
        }

    @classmethod
    def get_cost_limits(cls) -> dict:
        """Get cost protection limits"""
        return {
            "monthly_budget_usd": cls.MONTHLY_BUDGET_USD,
            "alert_threshold": cls.BUDGET_ALERT_THRESHOLD,
            "hard_limit_enabled": cls.HARD_LIMIT_ENABLED,
        }


# Validate configuration on import
try:
    AgentKitConfig.validate()
except ValueError as e:
    if AgentKitConfig.AGENTKIT_DEBUG:
        print(f"⚠️  AgentKit Configuration Warning: {e}")
