"""
OpenAI AgentKit Integration for 6FB AI Agent System

This module provides production-ready AI agents using OpenAI's Agents SDK,
replacing the custom orchestrator with standardized multi-agent workflows.

Feature: SPEC-015
Version: 1.0.0
"""

from .agents import (
    financial_coach_agent,
    operations_manager_agent,
    marketing_expert_agent,
    customer_service_agent,
    booking_intelligence_agent,
    analytics_agent,
    master_triage_agent,
)

from .config import AgentKitConfig

__all__ = [
    "financial_coach_agent",
    "operations_manager_agent",
    "marketing_expert_agent",
    "customer_service_agent",
    "booking_intelligence_agent",
    "analytics_agent",
    "master_triage_agent",
    "AgentKitConfig",
]

__version__ = "1.0.0"
