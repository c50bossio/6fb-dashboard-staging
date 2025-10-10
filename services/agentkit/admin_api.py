"""
AgentKit Admin API

Provides FastAPI endpoints for managing agent configurations through the admin UI.
These endpoints allow CRUD operations on agent settings without requiring code changes.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from .agents import (
    AGENT_REGISTRY,
    AgentName,
    list_all_agents,
    get_agent_config
)
from .tools import TOOL_FUNCTIONS

logger = logging.getLogger(__name__)


# ============================================================================
# AGENT MANAGEMENT FUNCTIONS
# ============================================================================

def list_agents_with_details() -> List[Dict[str, Any]]:
    """
    List all agents with their full configurations.

    Returns:
        List of agent configuration dictionaries
    """
    agents = []

    for agent_name in AgentName:
        config = get_agent_config(agent_name)

        if config:
            # Extract tool names from the config
            tools = []
            if 'tools' in config:
                tools = [t['function']['name'] if isinstance(t, dict) else str(t) for t in config.get('tools', [])]

            # Extract handoff targets
            handoffs = []
            if 'handoffs' in config:
                handoffs = [
                    {
                        'agent': h['agent'].value if hasattr(h['agent'], 'value') else str(h['agent']),
                        'description': h.get('description', '')
                    }
                    for h in config.get('handoffs', [])
                ]

            agent_info = {
                'name': agent_name.value,
                'instructions': config.get('instructions', ''),
                'handoff_description': config.get('handoff_description', ''),
                'model': config.get('model', 'gpt-4-turbo-preview'),
                'temperature': config.get('temperature', 0.7),
                'max_tokens': config.get('max_tokens', 4000),
                'tools': tools,
                'handoffs': handoffs,
                'enabled': config.get('enabled', True),
                'guardrails': len(config.get('guardrails', [])),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }

            agents.append(agent_info)

    return agents


def get_agent_details(agent_name: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed configuration for a specific agent.

    Args:
        agent_name: Name of the agent to retrieve

    Returns:
        Agent configuration dictionary or None if not found
    """
    try:
        # Convert string to AgentName enum
        agent_enum = AgentName(agent_name)
        config = get_agent_config(agent_enum)

        if not config:
            return None

        # Extract tool names
        tools = []
        if 'tools' in config:
            tools = [t['function']['name'] if isinstance(t, dict) else str(t) for t in config.get('tools', [])]

        # Extract handoffs
        handoffs = []
        if 'handoffs' in config:
            handoffs = [
                {
                    'agent': h['agent'].value if hasattr(h['agent'], 'value') else str(h['agent']),
                    'description': h.get('description', '')
                }
                for h in config.get('handoffs', [])
            ]

        return {
            'name': agent_name,
            'instructions': config.get('instructions', ''),
            'handoff_description': config.get('handoff_description', ''),
            'model': config.get('model', 'gpt-4-turbo-preview'),
            'temperature': config.get('temperature', 0.7),
            'max_tokens': config.get('max_tokens', 4000),
            'tools': tools,
            'handoffs': handoffs,
            'enabled': config.get('enabled', True),
            'guardrails': len(config.get('guardrails', [])),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

    except ValueError:
        logger.error(f"Invalid agent name: {agent_name}")
        return None


def update_agent_config(
    agent_name: str,
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Update agent configuration.

    Note: This updates the in-memory configuration. For persistent changes,
    you would need to save to a database or configuration file.

    Args:
        agent_name: Name of the agent to update
        updates: Dictionary of configuration updates

    Returns:
        Updated agent configuration
    """
    try:
        agent_enum = AgentName(agent_name)
        config = get_agent_config(agent_enum)

        if not config:
            raise ValueError(f"Agent {agent_name} not found")

        # Apply updates
        allowed_updates = [
            'instructions',
            'handoff_description',
            'model',
            'temperature',
            'max_tokens',
            'enabled'
        ]

        for key in allowed_updates:
            if key in updates:
                config[key] = updates[key]

        # Update the registry (in-memory only)
        AGENT_REGISTRY[agent_enum] = config

        logger.info(f"Updated agent {agent_name} configuration")

        return get_agent_details(agent_name)

    except ValueError as e:
        logger.error(f"Error updating agent: {str(e)}")
        raise


def get_available_tools() -> List[str]:
    """
    Get list of all available database tools.

    Returns:
        List of tool names
    """
    return list(TOOL_FUNCTIONS.keys())


def get_agent_stats(agent_name: str) -> Dict[str, Any]:
    """
    Get usage statistics for an agent.

    Note: This is a placeholder. In production, you would query the database
    for actual usage metrics.

    Args:
        agent_name: Name of the agent

    Returns:
        Dictionary with usage statistics
    """
    # TODO: Query actual stats from database/logs
    return {
        'total_queries': 0,
        'total_cost': 0.0,
        'total_response_time': 0.0,
        'average_cost': 0.0,
        'average_response_time': 0.0,
        'last_used': None,
        'success_rate': 0.0
    }


# ============================================================================
# FASTAPI ROUTE HANDLERS (to be used in main backend)
# ============================================================================

async def handle_list_agents():
    """FastAPI handler for listing all agents"""
    try:
        agents = list_agents_with_details()
        return {
            'success': True,
            'agents': agents,
            'count': len(agents)
        }
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'agents': []
        }


async def handle_get_agent(agent_name: str):
    """FastAPI handler for getting single agent"""
    try:
        agent = get_agent_details(agent_name)

        if not agent:
            return {
                'success': False,
                'error': f'Agent {agent_name} not found'
            }

        return {
            'success': True,
            'agent': agent
        }
    except Exception as e:
        logger.error(f"Error getting agent {agent_name}: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }


async def handle_update_agent(agent_name: str, updates: Dict[str, Any]):
    """FastAPI handler for updating agent configuration"""
    try:
        updated_agent = update_agent_config(agent_name, updates)

        return {
            'success': True,
            'agent': updated_agent,
            'message': f'Agent {agent_name} updated successfully'
        }
    except Exception as e:
        logger.error(f"Error updating agent {agent_name}: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }


async def handle_get_available_tools():
    """FastAPI handler for listing available tools"""
    try:
        tools = get_available_tools()

        return {
            'success': True,
            'tools': tools,
            'count': len(tools)
        }
    except Exception as e:
        logger.error(f"Error getting tools: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'tools': []
        }


# Export all
__all__ = [
    'list_agents_with_details',
    'get_agent_details',
    'update_agent_config',
    'get_available_tools',
    'get_agent_stats',
    'handle_list_agents',
    'handle_get_agent',
    'handle_update_agent',
    'handle_get_available_tools'
]
