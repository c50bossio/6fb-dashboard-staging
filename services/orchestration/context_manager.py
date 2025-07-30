#!/usr/bin/env python3
"""
Context Manager for 6FB AI Agent System
Preserves context and business intelligence across agent transitions
"""

from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
import json
import uuid
from enum import Enum
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

class ContextType(Enum):
    """Types of context information"""
    BUSINESS_OBJECTIVE = "business_objective"
    CONVERSATION = "conversation"
    TECHNICAL_SPECS = "technical_specs"
    USER_PREFERENCES = "user_preferences"
    AGENT_HANDOFF = "agent_handoff"
    WORKFLOW_STATE = "workflow_state"
    DECISION_HISTORY = "decision_history"

@dataclass
class ContextEntry:
    """Individual context entry"""
    id: str
    context_type: ContextType
    data: Dict[str, Any]
    timestamp: datetime
    source_agent: str
    relevance_score: float = 1.0
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentHandoff:
    """Agent handoff information"""
    from_agent: str
    to_agent: str
    handoff_reason: str
    context_preserved: List[str]
    business_context: Optional[str] = None
    technical_context: Optional[Dict[str, Any]] = None
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class BusinessObjective:
    """Business objective tracking"""
    id: str
    description: str
    priority: str
    target_metrics: Dict[str, Any]
    current_progress: Dict[str, Any] = field(default_factory=dict)
    related_agents: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class ConversationContext:
    """Conversation context information"""
    session_id: str
    user_id: str
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    active_topics: List[str] = field(default_factory=list)
    business_domain: str = "barbershop_management"
    user_role: str = "business_owner"
    preferences: Dict[str, Any] = field(default_factory=dict)

class ContextManager:
    """
    Manages context preservation across agent interactions
    Ensures business intelligence and conversation continuity
    """
    
    def __init__(self):
        self.contexts: Dict[str, List[ContextEntry]] = defaultdict(list)
        self.business_objectives: Dict[str, BusinessObjective] = {}
        self.conversation_contexts: Dict[str, ConversationContext] = {}
        self.agent_handoffs: List[AgentHandoff] = []
        self.workflow_states: Dict[str, Dict[str, Any]] = {}
        
        # Context management settings
        self.max_context_age = timedelta(hours=24)
        self.max_context_entries = 1000
        self.relevance_threshold = 0.3
        
    def create_session(self, user_id: str, business_domain: str = "barbershop_management") -> str:
        """Create a new conversation session"""
        session_id = str(uuid.uuid4())
        
        self.conversation_contexts[session_id] = ConversationContext(
            session_id=session_id,
            user_id=user_id,
            business_domain=business_domain
        )
        
        logger.info(f"Created new session {session_id} for user {user_id}")
        return session_id
    
    def add_context(
        self,
        session_id: str,
        context_type: ContextType,
        data: Dict[str, Any],
        source_agent: str,
        relevance_score: float = 1.0,
        expires_in: Optional[timedelta] = None
    ) -> str:
        """Add context information to a session"""
        
        context_id = str(uuid.uuid4())
        expires_at = datetime.now() + expires_in if expires_in else None
        
        context_entry = ContextEntry(
            id=context_id,
            context_type=context_type,
            data=data,
            timestamp=datetime.now(),
            source_agent=source_agent,
            relevance_score=relevance_score,
            expires_at=expires_at
        )
        
        self.contexts[session_id].append(context_entry)
        
        # Clean up old contexts if needed
        self._cleanup_contexts(session_id)
        
        logger.debug(f"Added {context_type.value} context from {source_agent} to session {session_id}")
        return context_id
    
    def get_context(
        self,
        session_id: str,
        context_types: Optional[List[ContextType]] = None,
        source_agent: Optional[str] = None,
        min_relevance: float = 0.0
    ) -> List[ContextEntry]:
        """Retrieve context information for a session"""
        
        if session_id not in self.contexts:
            return []
        
        contexts = self.contexts[session_id]
        
        # Filter by context types
        if context_types:
            contexts = [c for c in contexts if c.context_type in context_types]
        
        # Filter by source agent
        if source_agent:
            contexts = [c for c in contexts if c.source_agent == source_agent]
        
        # Filter by relevance
        contexts = [c for c in contexts if c.relevance_score >= min_relevance]
        
        # Filter out expired contexts
        now = datetime.now()
        contexts = [c for c in contexts if not c.expires_at or c.expires_at > now]
        
        # Sort by relevance and recency
        contexts.sort(key=lambda x: (x.relevance_score, x.timestamp), reverse=True)
        
        return contexts
    
    def preserve_agent_handoff(
        self,
        session_id: str,
        from_agent: str,
        to_agent: str,
        handoff_reason: str,
        context_data: Dict[str, Any],
        business_context: Optional[str] = None
    ) -> str:
        """Preserve context during agent handoff"""
        
        # Create handoff record
        handoff = AgentHandoff(
            from_agent=from_agent,
            to_agent=to_agent,
            handoff_reason=handoff_reason,
            context_preserved=list(context_data.keys()),
            business_context=business_context,
            technical_context=context_data
        )
        
        self.agent_handoffs.append(handoff)
        
        # Add handoff context
        handoff_context_id = self.add_context(
            session_id=session_id,
            context_type=ContextType.AGENT_HANDOFF,
            data={
                "handoff": asdict(handoff),
                "preserved_context": context_data
            },
            source_agent=from_agent,
            relevance_score=0.9
        )
        
        # Update conversation context
        if session_id in self.conversation_contexts:
            self.conversation_contexts[session_id].conversation_history.append({
                "type": "agent_handoff",
                "from_agent": from_agent,
                "to_agent": to_agent,
                "reason": handoff_reason,
                "timestamp": datetime.now().isoformat()
            })
        
        logger.info(f"Preserved handoff from {from_agent} to {to_agent} in session {session_id}")
        return handoff_context_id
    
    def get_agent_handoff_context(self, session_id: str, to_agent: str) -> Optional[Dict[str, Any]]:
        """Get context for agent receiving a handoff"""
        
        handoff_contexts = self.get_context(
            session_id=session_id,
            context_types=[ContextType.AGENT_HANDOFF]
        )
        
        # Find most recent handoff to this agent
        for context in handoff_contexts:
            handoff_data = context.data.get("handoff", {})
            if handoff_data.get("to_agent") == to_agent:
                return {
                    "previous_agent": handoff_data.get("from_agent"),
                    "handoff_reason": handoff_data.get("handoff_reason"),
                    "preserved_context": context.data.get("preserved_context", {}),
                    "business_context": handoff_data.get("business_context"),
                    "handoff_time": context.timestamp
                }
        
        return None
    
    def set_business_objective(
        self,
        session_id: str,
        description: str,
        priority: str = "medium",
        target_metrics: Dict[str, Any] = None
    ) -> str:
        """Set business objective for a session"""
        
        objective_id = str(uuid.uuid4())
        objective = BusinessObjective(
            id=objective_id,
            description=description,
            priority=priority,
            target_metrics=target_metrics or {}
        )
        
        self.business_objectives[objective_id] = objective
        
        # Add business objective context
        self.add_context(
            session_id=session_id,
            context_type=ContextType.BUSINESS_OBJECTIVE,
            data=asdict(objective),
            source_agent="system",
            relevance_score=1.0
        )
        
        logger.info(f"Set business objective for session {session_id}: {description}")
        return objective_id
    
    def get_business_objective(self, session_id: str) -> Optional[BusinessObjective]:
        """Get current business objective for a session"""
        
        business_contexts = self.get_context(
            session_id=session_id,
            context_types=[ContextType.BUSINESS_OBJECTIVE]
        )
        
        if business_contexts:
            latest_context = business_contexts[0]  # Most recent and relevant
            objective_data = latest_context.data
            return BusinessObjective(**objective_data)
        
        return None
    
    def update_business_progress(
        self,
        session_id: str,
        progress_data: Dict[str, Any],
        agent_id: str
    ):
        """Update business objective progress"""
        
        objective = self.get_business_objective(session_id)
        if not objective:
            return
        
        # Update progress
        objective.current_progress.update(progress_data)
        objective.updated_at = datetime.now()
        
        if agent_id not in objective.related_agents:
            objective.related_agents.append(agent_id)
        
        # Update stored objective
        self.business_objectives[objective.id] = objective
        
        # Add progress context
        self.add_context(
            session_id=session_id,
            context_type=ContextType.BUSINESS_OBJECTIVE,
            data=asdict(objective),
            source_agent=agent_id,
            relevance_score=0.8
        )
        
        logger.info(f"Updated business progress for session {session_id} by {agent_id}")
    
    def set_workflow_state(
        self,
        session_id: str,
        workflow_id: str,
        state_data: Dict[str, Any],
        agent_id: str
    ):
        """Set workflow state information"""
        
        if session_id not in self.workflow_states:
            self.workflow_states[session_id] = {}
        
        self.workflow_states[session_id][workflow_id] = {
            "state": state_data,
            "updated_by": agent_id,
            "updated_at": datetime.now()
        }
        
        # Add workflow context
        self.add_context(
            session_id=session_id,
            context_type=ContextType.WORKFLOW_STATE,
            data={
                "workflow_id": workflow_id,
                "state": state_data,
                "updated_by": agent_id
            },
            source_agent=agent_id,
            relevance_score=0.7
        )
        
        logger.debug(f"Updated workflow {workflow_id} state for session {session_id}")
    
    def get_workflow_state(self, session_id: str, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow state information"""
        
        if session_id in self.workflow_states and workflow_id in self.workflow_states[session_id]:
            return self.workflow_states[session_id][workflow_id]
        
        return None
    
    def add_conversation_message(
        self,
        session_id: str,
        message_type: str,
        content: str,
        agent_id: str,
        metadata: Dict[str, Any] = None
    ):
        """Add conversation message to context"""
        
        if session_id not in self.conversation_contexts:
            self.create_session("unknown", "barbershop_management")
        
        message = {
            "type": message_type,
            "content": content,
            "agent_id": agent_id,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        self.conversation_contexts[session_id].conversation_history.append(message)
        
        # Add conversation context
        self.add_context(
            session_id=session_id,
            context_type=ContextType.CONVERSATION,
            data=message,
            source_agent=agent_id,
            relevance_score=0.5,
            expires_in=self.max_context_age
        )
    
    def get_conversation_summary(self, session_id: str, last_n_messages: int = 10) -> Dict[str, Any]:
        """Get conversation summary"""
        
        if session_id not in self.conversation_contexts:
            return {"error": "Session not found"}
        
        conversation = self.conversation_contexts[session_id]
        recent_messages = conversation.conversation_history[-last_n_messages:]
        
        # Extract key topics and agents involved
        agents_involved = list(set(msg.get("agent_id", "unknown") for msg in recent_messages))
        
        # Get business objective
        business_objective = self.get_business_objective(session_id)
        
        return {
            "session_id": session_id,
            "total_messages": len(conversation.conversation_history),
            "recent_messages": recent_messages,
            "agents_involved": agents_involved,
            "active_topics": conversation.active_topics,
            "business_objective": asdict(business_objective) if business_objective else None,
            "last_updated": max(
                (datetime.fromisoformat(msg["timestamp"]) for msg in recent_messages),
                default=datetime.now()
            ).isoformat()
        }
    
    def get_agent_context_summary(self, session_id: str, agent_id: str) -> Dict[str, Any]:
        """Get context summary for a specific agent"""
        
        # Get all contexts relevant to this agent
        relevant_contexts = self.get_context(
            session_id=session_id,
            source_agent=agent_id,
            min_relevance=self.relevance_threshold
        )
        
        # Get handoff context if this agent was handed off to
        handoff_context = self.get_agent_handoff_context(session_id, agent_id)
        
        # Get business objective
        business_objective = self.get_business_objective(session_id)
        
        # Get conversation summary
        conversation_summary = self.get_conversation_summary(session_id, 5)
        
        return {
            "agent_id": agent_id,
            "session_id": session_id,
            "relevant_contexts": [asdict(ctx) for ctx in relevant_contexts[:10]],
            "handoff_context": handoff_context,
            "business_objective": asdict(business_objective) if business_objective else None,
            "recent_conversation": conversation_summary["recent_messages"],
            "context_summary": {
                "total_contexts": len(relevant_contexts),
                "business_contexts": len([c for c in relevant_contexts if c.context_type == ContextType.BUSINESS_OBJECTIVE]),
                "technical_contexts": len([c for c in relevant_contexts if c.context_type == ContextType.TECHNICAL_SPECS]),
                "conversation_contexts": len([c for c in relevant_contexts if c.context_type == ContextType.CONVERSATION])
            }
        }
    
    def _cleanup_contexts(self, session_id: str):
        """Clean up old and irrelevant contexts"""
        
        if session_id not in self.contexts:
            return
        
        contexts = self.contexts[session_id]
        now = datetime.now()
        
        # Remove expired contexts
        contexts = [c for c in contexts if not c.expires_at or c.expires_at > now]
        
        # Remove old contexts beyond max age
        contexts = [c for c in contexts if now - c.timestamp <= self.max_context_age]
        
        # Remove low-relevance contexts if we have too many
        if len(contexts) > self.max_context_entries:
            contexts.sort(key=lambda x: (x.relevance_score, x.timestamp), reverse=True)
            contexts = contexts[:self.max_context_entries]
        
        self.contexts[session_id] = contexts
        
        logger.debug(f"Cleaned up contexts for session {session_id}, kept {len(contexts)} entries")
    
    def get_system_analytics(self) -> Dict[str, Any]:
        """Get system-wide context analytics"""
        
        total_sessions = len(self.conversation_contexts)
        total_contexts = sum(len(contexts) for contexts in self.contexts.values())
        total_handoffs = len(self.agent_handoffs)
        total_objectives = len(self.business_objectives)
        
        # Agent usage statistics
        agent_usage = defaultdict(int)
        for contexts in self.contexts.values():
            for context in contexts:
                agent_usage[context.source_agent] += 1
        
        # Context type distribution
        context_type_dist = defaultdict(int)
        for contexts in self.contexts.values():
            for context in contexts:
                context_type_dist[context.context_type.value] += 1
        
        return {
            "total_sessions": total_sessions,
            "total_contexts": total_contexts,
            "total_handoffs": total_handoffs,
            "total_business_objectives": total_objectives,
            "agent_usage": dict(agent_usage),
            "context_type_distribution": dict(context_type_dist),
            "most_active_agent": max(agent_usage, key=agent_usage.get) if agent_usage else None,
            "cleanup_settings": {
                "max_context_age_hours": self.max_context_age.total_seconds() / 3600,
                "max_context_entries": self.max_context_entries,
                "relevance_threshold": self.relevance_threshold
            }
        }

# Global context manager instance
context_manager = ContextManager()

def get_context_manager() -> ContextManager:
    """Get global context manager instance"""
    return context_manager

if __name__ == "__main__":
    # Test the context manager
    cm = ContextManager()
    
    # Test session creation
    session_id = cm.create_session("test_user", "barbershop_management")
    print(f"Created session: {session_id}")
    
    # Test business objective
    objective_id = cm.set_business_objective(
        session_id=session_id,
        description="Increase booking conversion rate by 20%",
        priority="high",
        target_metrics={"conversion_rate": 0.8, "monthly_bookings": 500}
    )
    print(f"Set business objective: {objective_id}")
    
    # Test agent handoff
    cm.preserve_agent_handoff(
        session_id=session_id,
        from_agent="analyst",
        to_agent="ux-expert",
        handoff_reason="Analysis complete, need UX optimization",
        context_data={"analysis_results": {"pain_points": ["slow checkout", "confusing navigation"]}},
        business_context="Focus on checkout conversion optimization"
    )
    
    # Test context retrieval
    handoff_context = cm.get_agent_handoff_context(session_id, "ux-expert")
    print(f"Handoff context for ux-expert: {handoff_context}")
    
    # Test agent context summary
    context_summary = cm.get_agent_context_summary(session_id, "ux-expert")
    print(f"Context summary for ux-expert: {context_summary}")
    
    # Test analytics
    analytics = cm.get_system_analytics()
    print(f"System analytics: {analytics}")