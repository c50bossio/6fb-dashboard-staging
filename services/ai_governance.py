"""
AI Trust & Governance Framework
Implements risk-based action gating, ethical AI controls, and comprehensive governance policies
"""

import asyncio
import json
import hashlib
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
from pathlib import Path
import re

logger = logging.getLogger(__name__)

class TrustLevel(Enum):
    """Trust levels for AI operations"""
    UNTRUSTED = "untrusted"      # New or unverified AI operations
    LOW_TRUST = "low_trust"       # Basic operations with limited scope
    MEDIUM_TRUST = "medium_trust" # Standard operations with moderate impact
    HIGH_TRUST = "high_trust"     # Critical operations requiring verification
    VERIFIED = "verified"         # Fully verified and trusted operations

class ActionCategory(Enum):
    """Categories of AI actions for governance"""
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    USER_INTERACTION = "user_interaction"
    FINANCIAL_OPERATION = "financial_operation"
    SYSTEM_CONFIGURATION = "system_configuration"
    EXTERNAL_API_CALL = "external_api_call"
    MODEL_TRAINING = "model_training"
    AUTOMATED_DECISION = "automated_decision"

class RiskLevel(Enum):
    """Risk assessment levels"""
    MINIMAL = "minimal"    # No significant risk
    LOW = "low"           # Minor potential impact
    MEDIUM = "medium"     # Moderate potential impact
    HIGH = "high"         # Significant potential impact
    CRITICAL = "critical" # Severe potential impact

class ComplianceStandard(Enum):
    """Compliance standards to enforce"""
    GDPR = "gdpr"
    CCPA = "ccpa"
    HIPAA = "hipaa"
    SOC2 = "soc2"
    ISO27001 = "iso27001"
    PCI_DSS = "pci_dss"

@dataclass
class AIAction:
    """Represents an AI action requiring governance"""
    action_id: str
    action_type: ActionCategory
    description: str
    risk_level: RiskLevel
    data_involved: List[str]
    target_entities: List[str]
    requester: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_hash(self) -> str:
        """Generate unique hash for action identification"""
        content = f"{self.action_type.value}:{self.description}:{self.requester}"
        return hashlib.sha256(content.encode()).hexdigest()[:12]

@dataclass
class GovernancePolicy:
    """Defines governance policies for AI operations"""
    policy_id: str
    name: str
    description: str
    action_categories: List[ActionCategory]
    risk_threshold: RiskLevel
    required_trust_level: TrustLevel
    compliance_standards: List[ComplianceStandard]
    approval_required: bool
    audit_required: bool
    restrictions: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    active: bool = True

@dataclass
class AuditLog:
    """Audit log entry for AI actions"""
    log_id: str
    action_id: str
    action_type: ActionCategory
    timestamp: datetime
    outcome: str
    risk_assessment: RiskLevel
    trust_level: TrustLevel
    policy_applied: Optional[str]
    approval_status: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

class TrustScoreCalculator:
    """Calculates trust scores for AI operations"""
    
    def __init__(self):
        self.history: Dict[str, List[AuditLog]] = {}
        self.trust_scores: Dict[str, float] = {}
    
    def calculate_trust_score(self, entity: str, action_history: List[AuditLog]) -> float:
        """Calculate trust score based on historical behavior"""
        if not action_history:
            return 0.0
        
        score = 50.0  # Start with neutral score
        
        for log in action_history[-100:]:  # Consider last 100 actions
            if log.outcome == "success":
                score += 1.0
            elif log.outcome == "failure":
                score -= 2.0
            elif log.outcome == "blocked":
                score -= 5.0
            
            # Adjust based on risk level handled successfully
            if log.outcome == "success":
                if log.risk_assessment == RiskLevel.HIGH:
                    score += 2.0
                elif log.risk_assessment == RiskLevel.CRITICAL:
                    score += 3.0
        
        # Normalize to 0-100 range
        score = max(0, min(100, score))
        self.trust_scores[entity] = score
        
        return score
    
    def get_trust_level(self, trust_score: float) -> TrustLevel:
        """Convert trust score to trust level"""
        if trust_score >= 90:
            return TrustLevel.VERIFIED
        elif trust_score >= 70:
            return TrustLevel.HIGH_TRUST
        elif trust_score >= 50:
            return TrustLevel.MEDIUM_TRUST
        elif trust_score >= 30:
            return TrustLevel.LOW_TRUST
        else:
            return TrustLevel.UNTRUSTED

class PolicyEngine:
    """Enforces governance policies on AI actions"""
    
    def __init__(self):
        self.policies: Dict[str, GovernancePolicy] = {}
        self.load_default_policies()
    
    def load_default_policies(self):
        """Load default governance policies"""
        # Financial operations policy
        self.policies["financial_ops"] = GovernancePolicy(
            policy_id="pol_financial_001",
            name="Financial Operations Policy",
            description="Governs all financial transactions and operations",
            action_categories=[ActionCategory.FINANCIAL_OPERATION],
            risk_threshold=RiskLevel.MEDIUM,
            required_trust_level=TrustLevel.HIGH_TRUST,
            compliance_standards=[ComplianceStandard.PCI_DSS, ComplianceStandard.SOC2],
            approval_required=True,
            audit_required=True,
            restrictions={
                "max_transaction_amount": 10000,
                "daily_limit": 50000,
                "require_2fa": True
            }
        )
        
        # Data access policy
        self.policies["data_access"] = GovernancePolicy(
            policy_id="pol_data_001",
            name="Data Access Policy",
            description="Controls access to sensitive data",
            action_categories=[ActionCategory.DATA_ACCESS],
            risk_threshold=RiskLevel.LOW,
            required_trust_level=TrustLevel.MEDIUM_TRUST,
            compliance_standards=[ComplianceStandard.GDPR, ComplianceStandard.CCPA],
            approval_required=False,
            audit_required=True,
            restrictions={
                "pii_access_requires_approval": True,
                "batch_size_limit": 1000,
                "rate_limit_per_hour": 1000
            }
        )
        
        # Model training policy
        self.policies["model_training"] = GovernancePolicy(
            policy_id="pol_model_001",
            name="Model Training Policy",
            description="Governs AI model training operations",
            action_categories=[ActionCategory.MODEL_TRAINING],
            risk_threshold=RiskLevel.MEDIUM,
            required_trust_level=TrustLevel.HIGH_TRUST,
            compliance_standards=[ComplianceStandard.ISO27001],
            approval_required=True,
            audit_required=True,
            restrictions={
                "require_data_anonymization": True,
                "require_bias_testing": True,
                "max_training_hours": 24
            }
        )
    
    def evaluate_action(self, action: AIAction, trust_level: TrustLevel) -> Tuple[bool, List[str], Optional[GovernancePolicy]]:
        """Evaluate if an action is allowed under current policies"""
        violations = []
        applicable_policy = None
        
        for policy in self.policies.values():
            if not policy.active:
                continue
            
            if action.action_type in policy.action_categories:
                applicable_policy = policy
                
                # Check trust level requirement
                if self._compare_trust_levels(trust_level, policy.required_trust_level) < 0:
                    violations.append(f"Insufficient trust level. Required: {policy.required_trust_level.value}")
                
                # Check risk threshold
                if self._compare_risk_levels(action.risk_level, policy.risk_threshold) > 0:
                    violations.append(f"Risk level exceeds threshold. Max allowed: {policy.risk_threshold.value}")
                
                # Check specific restrictions
                if policy.restrictions:
                    restriction_violations = self._check_restrictions(action, policy.restrictions)
                    violations.extend(restriction_violations)
                
                break  # Apply first matching policy
        
        allowed = len(violations) == 0
        return allowed, violations, applicable_policy
    
    def _compare_trust_levels(self, level1: TrustLevel, level2: TrustLevel) -> int:
        """Compare trust levels (-1: level1 < level2, 0: equal, 1: level1 > level2)"""
        order = [TrustLevel.UNTRUSTED, TrustLevel.LOW_TRUST, TrustLevel.MEDIUM_TRUST, 
                TrustLevel.HIGH_TRUST, TrustLevel.VERIFIED]
        idx1 = order.index(level1)
        idx2 = order.index(level2)
        return (idx1 > idx2) - (idx1 < idx2)
    
    def _compare_risk_levels(self, level1: RiskLevel, level2: RiskLevel) -> int:
        """Compare risk levels (-1: level1 < level2, 0: equal, 1: level1 > level2)"""
        order = [RiskLevel.MINIMAL, RiskLevel.LOW, RiskLevel.MEDIUM, 
                RiskLevel.HIGH, RiskLevel.CRITICAL]
        idx1 = order.index(level1)
        idx2 = order.index(level2)
        return (idx1 > idx2) - (idx1 < idx2)
    
    def _check_restrictions(self, action: AIAction, restrictions: Dict[str, Any]) -> List[str]:
        """Check specific restrictions from policy"""
        violations = []
        
        # Check financial restrictions
        if action.action_type == ActionCategory.FINANCIAL_OPERATION:
            if "max_transaction_amount" in restrictions:
                amount = action.metadata.get("amount", 0)
                if amount > restrictions["max_transaction_amount"]:
                    violations.append(f"Transaction amount ${amount} exceeds limit ${restrictions['max_transaction_amount']}")
        
        # Check data access restrictions
        if action.action_type == ActionCategory.DATA_ACCESS:
            if "batch_size_limit" in restrictions:
                batch_size = action.metadata.get("batch_size", 0)
                if batch_size > restrictions["batch_size_limit"]:
                    violations.append(f"Batch size {batch_size} exceeds limit {restrictions['batch_size_limit']}")
        
        return violations

class ComplianceChecker:
    """Checks compliance with various standards"""
    
    def __init__(self):
        self.compliance_rules: Dict[ComplianceStandard, List[callable]] = {
            ComplianceStandard.GDPR: [
                self._check_gdpr_consent,
                self._check_gdpr_data_minimization,
                self._check_gdpr_right_to_erasure
            ],
            ComplianceStandard.CCPA: [
                self._check_ccpa_opt_out,
                self._check_ccpa_disclosure
            ],
            ComplianceStandard.HIPAA: [
                self._check_hipaa_encryption,
                self._check_hipaa_access_controls
            ],
            ComplianceStandard.PCI_DSS: [
                self._check_pci_encryption,
                self._check_pci_access_logging
            ]
        }
    
    async def check_compliance(self, action: AIAction, standards: List[ComplianceStandard]) -> Tuple[bool, List[str]]:
        """Check if action complies with specified standards"""
        issues = []
        
        for standard in standards:
            if standard in self.compliance_rules:
                for rule_check in self.compliance_rules[standard]:
                    compliant, issue = await rule_check(action)
                    if not compliant:
                        issues.append(f"{standard.value}: {issue}")
        
        return len(issues) == 0, issues
    
    async def _check_gdpr_consent(self, action: AIAction) -> Tuple[bool, str]:
        """Check GDPR consent requirements"""
        if action.action_type in [ActionCategory.DATA_ACCESS, ActionCategory.DATA_MODIFICATION]:
            has_consent = action.metadata.get("user_consent", False)
            if not has_consent:
                return False, "User consent not obtained for data processing"
        return True, ""
    
    async def _check_gdpr_data_minimization(self, action: AIAction) -> Tuple[bool, str]:
        """Check GDPR data minimization principle"""
        if action.action_type == ActionCategory.DATA_ACCESS:
            fields_requested = len(action.data_involved)
            if fields_requested > 10:  # Arbitrary threshold
                return False, f"Requesting {fields_requested} fields may violate data minimization"
        return True, ""
    
    async def _check_gdpr_right_to_erasure(self, action: AIAction) -> Tuple[bool, str]:
        """Check GDPR right to erasure"""
        # Placeholder implementation
        return True, ""
    
    async def _check_ccpa_opt_out(self, action: AIAction) -> Tuple[bool, str]:
        """Check CCPA opt-out requirements"""
        if action.action_type == ActionCategory.DATA_ACCESS:
            user_opted_out = action.metadata.get("user_opted_out", False)
            if user_opted_out:
                return False, "User has opted out of data processing under CCPA"
        return True, ""
    
    async def _check_ccpa_disclosure(self, action: AIAction) -> Tuple[bool, str]:
        """Check CCPA disclosure requirements"""
        # Placeholder implementation
        return True, ""
    
    async def _check_hipaa_encryption(self, action: AIAction) -> Tuple[bool, str]:
        """Check HIPAA encryption requirements"""
        if "health" in str(action.data_involved).lower():
            encrypted = action.metadata.get("encryption_enabled", False)
            if not encrypted:
                return False, "Health data must be encrypted under HIPAA"
        return True, ""
    
    async def _check_hipaa_access_controls(self, action: AIAction) -> Tuple[bool, str]:
        """Check HIPAA access control requirements"""
        # Placeholder implementation
        return True, ""
    
    async def _check_pci_encryption(self, action: AIAction) -> Tuple[bool, str]:
        """Check PCI DSS encryption requirements"""
        if action.action_type == ActionCategory.FINANCIAL_OPERATION:
            encrypted = action.metadata.get("payment_data_encrypted", False)
            if not encrypted:
                return False, "Payment card data must be encrypted under PCI DSS"
        return True, ""
    
    async def _check_pci_access_logging(self, action: AIAction) -> Tuple[bool, str]:
        """Check PCI DSS access logging requirements"""
        # Placeholder implementation
        return True, ""

class AIGovernanceFramework:
    """Main framework for AI trust and governance"""
    
    def __init__(self, audit_log_path: str = "./data/governance_audit.json"):
        self.trust_calculator = TrustScoreCalculator()
        self.policy_engine = PolicyEngine()
        self.compliance_checker = ComplianceChecker()
        self.audit_log_path = Path(audit_log_path)
        self.audit_log_path.parent.mkdir(parents=True, exist_ok=True)
        self.audit_logs: List[AuditLog] = []
        self.entity_history: Dict[str, List[AuditLog]] = {}
        self.blocked_actions: Set[str] = set()
        self.load_audit_logs()
    
    def load_audit_logs(self):
        """Load existing audit logs from disk"""
        if self.audit_log_path.exists():
            try:
                with open(self.audit_log_path, 'r') as f:
                    data = json.load(f)
                    # Reconstruct audit log objects
                    for log_data in data:
                        audit_log = self._dict_to_audit_log(log_data)
                        self.audit_logs.append(audit_log)
                        
                        # Build entity history
                        requester = log_data.get("metadata", {}).get("requester", "unknown")
                        if requester not in self.entity_history:
                            self.entity_history[requester] = []
                        self.entity_history[requester].append(audit_log)
            except Exception as e:
                logger.error(f"Failed to load audit logs: {e}")
    
    def save_audit_logs(self):
        """Persist audit logs to disk"""
        try:
            logs_data = [self._audit_log_to_dict(log) for log in self.audit_logs[-10000:]]  # Keep last 10k logs
            with open(self.audit_log_path, 'w') as f:
                json.dump(logs_data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save audit logs: {e}")
    
    def _audit_log_to_dict(self, log: AuditLog) -> Dict:
        """Convert AuditLog to dictionary for serialization"""
        return {
            'log_id': log.log_id,
            'action_id': log.action_id,
            'action_type': log.action_type.value,
            'timestamp': log.timestamp.isoformat(),
            'outcome': log.outcome,
            'risk_assessment': log.risk_assessment.value,
            'trust_level': log.trust_level.value,
            'policy_applied': log.policy_applied,
            'approval_status': log.approval_status,
            'metadata': log.metadata
        }
    
    def _dict_to_audit_log(self, data: Dict) -> AuditLog:
        """Convert dictionary to AuditLog object"""
        return AuditLog(
            log_id=data['log_id'],
            action_id=data['action_id'],
            action_type=ActionCategory(data['action_type']),
            timestamp=datetime.fromisoformat(data['timestamp']),
            outcome=data['outcome'],
            risk_assessment=RiskLevel(data['risk_assessment']),
            trust_level=TrustLevel(data['trust_level']),
            policy_applied=data.get('policy_applied'),
            approval_status=data.get('approval_status'),
            metadata=data.get('metadata', {})
        )
    
    async def evaluate_action(self, action: AIAction) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate whether an AI action should be allowed"""
        result = {
            'allowed': False,
            'action_id': action.get_hash(),
            'trust_assessment': {},
            'policy_evaluation': {},
            'compliance_check': {},
            'required_approvals': [],
            'violations': [],
            'recommendations': []
        }
        
        # Calculate trust score for requester
        requester_history = self.entity_history.get(action.requester, [])
        trust_score = self.trust_calculator.calculate_trust_score(action.requester, requester_history)
        trust_level = self.trust_calculator.get_trust_level(trust_score)
        
        result['trust_assessment'] = {
            'trust_score': trust_score,
            'trust_level': trust_level.value,
            'history_count': len(requester_history)
        }
        
        # Evaluate against policies
        policy_allowed, policy_violations, applicable_policy = self.policy_engine.evaluate_action(action, trust_level)
        
        result['policy_evaluation'] = {
            'allowed': policy_allowed,
            'violations': policy_violations,
            'policy_applied': applicable_policy.name if applicable_policy else None
        }
        
        if not policy_allowed:
            result['violations'].extend(policy_violations)
        
        # Check compliance if policy requires it
        if applicable_policy and applicable_policy.compliance_standards:
            compliant, compliance_issues = await self.compliance_checker.check_compliance(
                action, applicable_policy.compliance_standards
            )
            
            result['compliance_check'] = {
                'compliant': compliant,
                'standards_checked': [s.value for s in applicable_policy.compliance_standards],
                'issues': compliance_issues
            }
            
            if not compliant:
                result['violations'].extend(compliance_issues)
        
        # Check if approval is required
        if applicable_policy and applicable_policy.approval_required:
            result['required_approvals'].append({
                'type': 'policy_approval',
                'policy': applicable_policy.name,
                'reason': 'Policy requires manual approval'
            })
        
        # Determine if action is allowed
        result['allowed'] = policy_allowed and (not result['compliance_check'] or result['compliance_check']['compliant'])
        
        # Generate recommendations
        if not result['allowed']:
            result['recommendations'] = self._generate_recommendations(action, trust_level, result['violations'])
        
        # Create audit log
        audit_log = AuditLog(
            log_id=hashlib.sha256(f"{action.get_hash()}:{datetime.now().isoformat()}".encode()).hexdigest()[:12],
            action_id=action.get_hash(),
            action_type=action.action_type,
            timestamp=datetime.now(),
            outcome="allowed" if result['allowed'] else "blocked",
            risk_assessment=action.risk_level,
            trust_level=trust_level,
            policy_applied=applicable_policy.policy_id if applicable_policy else None,
            approval_status="pending" if result['required_approvals'] else None,
            metadata={
                'requester': action.requester,
                'violations': result['violations']
            }
        )
        
        # Update history
        self.audit_logs.append(audit_log)
        if action.requester not in self.entity_history:
            self.entity_history[action.requester] = []
        self.entity_history[action.requester].append(audit_log)
        
        # Save audit logs
        self.save_audit_logs()
        
        # Track blocked actions
        if not result['allowed']:
            self.blocked_actions.add(action.get_hash())
        
        return result['allowed'], result
    
    def _generate_recommendations(self, action: AIAction, trust_level: TrustLevel, violations: List[str]) -> List[str]:
        """Generate recommendations for blocked actions"""
        recommendations = []
        
        if "Insufficient trust level" in str(violations):
            recommendations.append("Build trust through successful lower-risk operations")
            recommendations.append("Request temporary elevated permissions from administrator")
        
        if "Risk level exceeds threshold" in str(violations):
            recommendations.append("Break down the action into smaller, lower-risk operations")
            recommendations.append("Implement additional safeguards to reduce risk")
        
        if "consent not obtained" in str(violations):
            recommendations.append("Obtain explicit user consent before proceeding")
        
        if "opted out" in str(violations):
            recommendations.append("Respect user privacy preferences - action cannot proceed")
        
        if "must be encrypted" in str(violations):
            recommendations.append("Enable encryption for sensitive data operations")
        
        return recommendations
    
    def get_governance_metrics(self) -> Dict[str, Any]:
        """Get governance metrics for monitoring"""
        total_actions = len(self.audit_logs)
        blocked_count = len(self.blocked_actions)
        
        # Calculate metrics by action type
        action_type_metrics = {}
        for action_type in ActionCategory:
            type_logs = [log for log in self.audit_logs if log.action_type == action_type]
            if type_logs:
                blocked = sum(1 for log in type_logs if log.outcome == "blocked")
                action_type_metrics[action_type.value] = {
                    'total': len(type_logs),
                    'blocked': blocked,
                    'block_rate': (blocked / len(type_logs) * 100) if type_logs else 0
                }
        
        # Calculate risk distribution
        risk_distribution = {}
        for risk_level in RiskLevel:
            count = sum(1 for log in self.audit_logs if log.risk_assessment == risk_level)
            risk_distribution[risk_level.value] = count
        
        # Calculate trust level distribution
        trust_distribution = {}
        for entity, history in self.entity_history.items():
            if history:
                latest_trust = history[-1].trust_level
                if latest_trust.value not in trust_distribution:
                    trust_distribution[latest_trust.value] = 0
                trust_distribution[latest_trust.value] += 1
        
        return {
            'total_actions_evaluated': total_actions,
            'actions_blocked': blocked_count,
            'block_rate': (blocked_count / total_actions * 100) if total_actions > 0 else 0,
            'action_type_metrics': action_type_metrics,
            'risk_distribution': risk_distribution,
            'trust_distribution': trust_distribution,
            'active_policies': len([p for p in self.policy_engine.policies.values() if p.active]),
            'unique_entities': len(self.entity_history)
        }
    
    def get_entity_report(self, entity: str) -> Optional[Dict[str, Any]]:
        """Get detailed report for a specific entity"""
        if entity not in self.entity_history:
            return None
        
        history = self.entity_history[entity]
        trust_score = self.trust_calculator.calculate_trust_score(entity, history)
        trust_level = self.trust_calculator.get_trust_level(trust_score)
        
        # Calculate statistics
        total_actions = len(history)
        blocked_actions = sum(1 for log in history if log.outcome == "blocked")
        
        # Risk profile
        risk_profile = {}
        for risk_level in RiskLevel:
            count = sum(1 for log in history if log.risk_assessment == risk_level)
            risk_profile[risk_level.value] = count
        
        return {
            'entity': entity,
            'trust_score': trust_score,
            'trust_level': trust_level.value,
            'total_actions': total_actions,
            'blocked_actions': blocked_actions,
            'success_rate': ((total_actions - blocked_actions) / total_actions * 100) if total_actions > 0 else 0,
            'risk_profile': risk_profile,
            'recent_actions': [
                {
                    'timestamp': log.timestamp.isoformat(),
                    'action_type': log.action_type.value,
                    'outcome': log.outcome,
                    'risk_level': log.risk_assessment.value
                }
                for log in history[-10:]  # Last 10 actions
            ]
        }

# Example usage
async def main():
    """Example of using the AI Trust & Governance Framework"""
    framework = AIGovernanceFramework()
    
    # Example 1: Low-risk data access action
    data_action = AIAction(
        action_id="act_001",
        action_type=ActionCategory.DATA_ACCESS,
        description="Read customer booking history",
        risk_level=RiskLevel.LOW,
        data_involved=["bookings", "customer_profiles"],
        target_entities=["customer_123"],
        requester="booking_service",
        metadata={
            "user_consent": True,
            "batch_size": 100
        }
    )
    
    allowed, result = await framework.evaluate_action(data_action)
    print(f"Data access action allowed: {allowed}")
    print(f"Result: {json.dumps(result, indent=2)}\n")
    
    # Example 2: High-risk financial operation
    financial_action = AIAction(
        action_id="act_002",
        action_type=ActionCategory.FINANCIAL_OPERATION,
        description="Process refund for customer",
        risk_level=RiskLevel.HIGH,
        data_involved=["payment_records", "customer_accounts"],
        target_entities=["customer_456", "payment_789"],
        requester="payment_service",
        metadata={
            "amount": 500,
            "payment_data_encrypted": True
        }
    )
    
    allowed, result = await framework.evaluate_action(financial_action)
    print(f"Financial action allowed: {allowed}")
    print(f"Result: {json.dumps(result, indent=2)}\n")
    
    # Example 3: Model training action
    training_action = AIAction(
        action_id="act_003",
        action_type=ActionCategory.MODEL_TRAINING,
        description="Train customer preference prediction model",
        risk_level=RiskLevel.MEDIUM,
        data_involved=["customer_interactions", "booking_patterns"],
        target_entities=["ml_model_v2"],
        requester="ml_training_service",
        metadata={
            "data_anonymized": True,
            "bias_testing_enabled": True,
            "training_hours": 8
        }
    )
    
    allowed, result = await framework.evaluate_action(training_action)
    print(f"Model training action allowed: {allowed}")
    print(f"Result: {json.dumps(result, indent=2)}\n")
    
    # Get governance metrics
    metrics = framework.get_governance_metrics()
    print(f"Governance metrics: {json.dumps(metrics, indent=2)}\n")
    
    # Get entity report
    entity_report = framework.get_entity_report("booking_service")
    if entity_report:
        print(f"Entity report: {json.dumps(entity_report, indent=2)}")

if __name__ == "__main__":
    asyncio.run(main())