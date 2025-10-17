"""
AI Feature Lifecycle Management System
Ensures complete feature implementation with quality gates at every stage
"""

import asyncio
import json
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class FeatureStage(Enum):
    """Stages of feature development lifecycle"""
    PLANNING = "planning"
    DEVELOPMENT = "development"
    TESTING = "testing"
    REVIEW = "review"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class RiskLevel(Enum):
    """Risk assessment levels for features"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class FeatureSpec:
    """Complete specification for a feature"""
    name: str
    description: str
    requirements: List[str]
    dependencies: List[str]
    risk_level: RiskLevel
    estimated_hours: float
    priority: int
    owner: str
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_hash(self) -> str:
        """Generate unique hash for feature identification"""
        content = f"{self.name}:{self.description}:{':'.join(self.requirements)}"
        return hashlib.sha256(content.encode()).hexdigest()[:12]

@dataclass
class QualityGateResult:
    """Result of a quality gate check"""
    passed: bool
    stage: FeatureStage
    checks: Dict[str, bool]
    blockers: List[str]
    warnings: List[str]
    timestamp: datetime = field(default_factory=datetime.now)

class FeatureRegistry:
    """Central registry for all features to prevent duplication"""
    
    def __init__(self, registry_path: str = "./data/feature_registry.json"):
        self.registry_path = Path(registry_path)
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        self.features: Dict[str, FeatureSpec] = {}
        self.load_registry()
    
    def load_registry(self):
        """Load existing feature registry from disk"""
        if self.registry_path.exists():
            try:
                with open(self.registry_path, 'r') as f:
                    data = json.load(f)
                    # Reconstruct FeatureSpec objects from JSON
                    for feature_id, feature_data in data.items():
                        self.features[feature_id] = self._dict_to_feature_spec(feature_data)
            except Exception as e:
                logger.error(f"Failed to load feature registry: {e}")
                self.features = {}
    
    def save_registry(self):
        """Persist feature registry to disk"""
        try:
            data = {}
            for feature_id, feature_spec in self.features.items():
                data[feature_id] = self._feature_spec_to_dict(feature_spec)
            
            with open(self.registry_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save feature registry: {e}")
    
    def _feature_spec_to_dict(self, spec: FeatureSpec) -> Dict:
        """Convert FeatureSpec to dictionary for JSON serialization"""
        return {
            'name': spec.name,
            'description': spec.description,
            'requirements': spec.requirements,
            'dependencies': spec.dependencies,
            'risk_level': spec.risk_level.value,
            'estimated_hours': spec.estimated_hours,
            'priority': spec.priority,
            'owner': spec.owner,
            'created_at': spec.created_at.isoformat(),
            'metadata': spec.metadata
        }
    
    def _dict_to_feature_spec(self, data: Dict) -> FeatureSpec:
        """Convert dictionary to FeatureSpec object"""
        return FeatureSpec(
            name=data['name'],
            description=data['description'],
            requirements=data['requirements'],
            dependencies=data['dependencies'],
            risk_level=RiskLevel(data['risk_level']),
            estimated_hours=data['estimated_hours'],
            priority=data['priority'],
            owner=data['owner'],
            created_at=datetime.fromisoformat(data['created_at']),
            metadata=data.get('metadata', {})
        )
    
    def check_duplicate(self, feature_spec: FeatureSpec) -> Optional[str]:
        """Check if similar feature already exists"""
        feature_hash = feature_spec.get_hash()
        
        # Check exact hash match
        if feature_hash in self.features:
            return feature_hash
        
        # Check name similarity
        for existing_id, existing_feature in self.features.items():
            if self._is_similar(feature_spec.name, existing_feature.name):
                return existing_id
            
            # Check description similarity
            if self._is_similar(feature_spec.description, existing_feature.description):
                return existing_id
        
        return None
    
    def _is_similar(self, text1: str, text2: str, threshold: float = 0.8) -> bool:
        """Check if two texts are similar using simple heuristics"""
        # Convert to lowercase and split into words
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        # Calculate Jaccard similarity
        if not words1 or not words2:
            return False
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        similarity = len(intersection) / len(union)
        
        return similarity >= threshold
    
    def register_feature(self, feature_spec: FeatureSpec) -> str:
        """Register a new feature and return its ID"""
        feature_id = feature_spec.get_hash()
        self.features[feature_id] = feature_spec
        self.save_registry()
        return feature_id
    
    def get_feature(self, feature_id: str) -> Optional[FeatureSpec]:
        """Retrieve a feature by ID"""
        return self.features.get(feature_id)
    
    def list_features(self, filter_by: Optional[Dict[str, Any]] = None) -> List[FeatureSpec]:
        """List all features with optional filtering"""
        features = list(self.features.values())
        
        if filter_by:
            if 'risk_level' in filter_by:
                features = [f for f in features if f.risk_level == filter_by['risk_level']]
            if 'owner' in filter_by:
                features = [f for f in features if f.owner == filter_by['owner']]
            if 'priority' in filter_by:
                features = [f for f in features if f.priority >= filter_by['priority']]
        
        return features

class FeatureQualityGates:
    """Enforces quality at every stage of feature development"""
    
    def __init__(self, registry: FeatureRegistry):
        self.registry = registry
        self.gate_results: Dict[str, List[QualityGateResult]] = {}
    
    async def pre_development_gate(self, feature_spec: FeatureSpec) -> QualityGateResult:
        """Quality gate before any code is written"""
        checks = {}
        blockers = []
        warnings = []
        
        # Check for duplicates
        duplicate_id = self.registry.check_duplicate(feature_spec)
        checks['no_duplicates'] = duplicate_id is None
        if duplicate_id:
            blockers.append(f"Duplicate feature detected: {duplicate_id}")
        
        # Validate requirements completeness
        checks['requirements_complete'] = len(feature_spec.requirements) >= 3
        if not checks['requirements_complete']:
            blockers.append("Insufficient requirements (minimum 3 required)")
        
        # Check dependencies availability
        checks['dependencies_available'] = await self._check_dependencies(feature_spec)
        if not checks['dependencies_available']:
            blockers.append("Some dependencies are not available")
        
        # Assess implementation risk
        checks['risk_assessed'] = feature_spec.risk_level is not None
        if feature_spec.risk_level == RiskLevel.CRITICAL:
            warnings.append("Critical risk level - requires senior review")
        
        # Check resource availability
        checks['resources_available'] = await self._check_resource_availability(feature_spec)
        if not checks['resources_available']:
            warnings.append("Limited resources available - may delay implementation")
        
        result = QualityGateResult(
            passed=len(blockers) == 0,
            stage=FeatureStage.PLANNING,
            checks=checks,
            blockers=blockers,
            warnings=warnings
        )
        
        # Store result
        feature_id = feature_spec.get_hash()
        if feature_id not in self.gate_results:
            self.gate_results[feature_id] = []
        self.gate_results[feature_id].append(result)
        
        return result
    
    async def development_gate(self, feature_id: str) -> QualityGateResult:
        """Quality gate during development"""
        feature_spec = self.registry.get_feature(feature_id)
        if not feature_spec:
            return QualityGateResult(
                passed=False,
                stage=FeatureStage.DEVELOPMENT,
                checks={},
                blockers=["Feature not found in registry"],
                warnings=[]
            )
        
        checks = {}
        blockers = []
        warnings = []
        
        # Check code coverage
        coverage = await self._get_code_coverage(feature_id)
        checks['code_coverage'] = coverage >= 80
        if coverage < 80:
            blockers.append(f"Code coverage {coverage}% is below 80% threshold")
        elif coverage < 90:
            warnings.append(f"Code coverage {coverage}% - aim for 90%+")
        
        # Check for code smells
        smells = await self._detect_code_smells(feature_id)
        checks['no_code_smells'] = len(smells) == 0
        if smells:
            warnings.extend([f"Code smell detected: {smell}" for smell in smells[:3]])
        
        # Verify all requirements are being addressed
        implemented = await self._check_requirements_implementation(feature_spec)
        checks['requirements_implemented'] = implemented >= len(feature_spec.requirements)
        if implemented < len(feature_spec.requirements):
            blockers.append(f"Only {implemented}/{len(feature_spec.requirements)} requirements implemented")
        
        # Check documentation
        docs_complete = await self._check_documentation(feature_id)
        checks['documentation_complete'] = docs_complete
        if not docs_complete:
            warnings.append("Documentation incomplete")
        
        result = QualityGateResult(
            passed=len(blockers) == 0,
            stage=FeatureStage.DEVELOPMENT,
            checks=checks,
            blockers=blockers,
            warnings=warnings
        )
        
        self.gate_results[feature_id].append(result)
        return result
    
    async def testing_gate(self, feature_id: str) -> QualityGateResult:
        """Quality gate for testing phase"""
        checks = {}
        blockers = []
        warnings = []
        
        # Check unit test coverage
        unit_coverage = await self._get_unit_test_coverage(feature_id)
        checks['unit_tests'] = unit_coverage >= 85
        if unit_coverage < 85:
            blockers.append(f"Unit test coverage {unit_coverage}% below 85% threshold")
        
        # Check integration tests
        integration_tests = await self._check_integration_tests(feature_id)
        checks['integration_tests'] = integration_tests
        if not integration_tests:
            blockers.append("Integration tests missing")
        
        # Check E2E tests for UI features
        if await self._is_ui_feature(feature_id):
            e2e_tests = await self._check_e2e_tests(feature_id)
            checks['e2e_tests'] = e2e_tests
            if not e2e_tests:
                blockers.append("E2E tests required for UI features")
        
        # Performance testing
        perf_results = await self._run_performance_tests(feature_id)
        checks['performance'] = perf_results['passed']
        if not perf_results['passed']:
            warnings.append(f"Performance degradation detected: {perf_results['message']}")
        
        # Security testing
        security_issues = await self._run_security_scan(feature_id)
        checks['security'] = len(security_issues) == 0
        if security_issues:
            for issue in security_issues:
                if issue['severity'] == 'high':
                    blockers.append(f"Security issue: {issue['description']}")
                else:
                    warnings.append(f"Security warning: {issue['description']}")
        
        result = QualityGateResult(
            passed=len(blockers) == 0,
            stage=FeatureStage.TESTING,
            checks=checks,
            blockers=blockers,
            warnings=warnings
        )
        
        self.gate_results[feature_id].append(result)
        return result
    
    async def deployment_gate(self, feature_id: str) -> QualityGateResult:
        """Quality gate before deployment"""
        checks = {}
        blockers = []
        warnings = []
        
        # Check all previous gates passed
        previous_gates = self.gate_results.get(feature_id, [])
        all_passed = all(gate.passed for gate in previous_gates)
        checks['previous_gates_passed'] = all_passed
        if not all_passed:
            blockers.append("Previous quality gates have failures")
        
        # Check rollback plan exists
        rollback_plan = await self._check_rollback_plan(feature_id)
        checks['rollback_plan'] = rollback_plan
        if not rollback_plan:
            blockers.append("Rollback plan required for deployment")
        
        # Check monitoring setup
        monitoring = await self._check_monitoring_setup(feature_id)
        checks['monitoring_ready'] = monitoring
        if not monitoring:
            warnings.append("Monitoring not fully configured")
        
        # Check feature flags configured
        feature_flags = await self._check_feature_flags(feature_id)
        checks['feature_flags'] = feature_flags
        if not feature_flags:
            warnings.append("Feature flags recommended for gradual rollout")
        
        # Check database migrations
        migrations_safe = await self._check_database_migrations(feature_id)
        checks['migrations_safe'] = migrations_safe
        if not migrations_safe:
            blockers.append("Database migrations have issues")
        
        result = QualityGateResult(
            passed=len(blockers) == 0,
            stage=FeatureStage.DEPLOYMENT,
            checks=checks,
            blockers=blockers,
            warnings=warnings
        )
        
        self.gate_results[feature_id].append(result)
        return result
    
    # Helper methods for quality checks
    async def _check_dependencies(self, feature_spec: FeatureSpec) -> bool:
        """Check if all dependencies are available"""
        # Simulate dependency checking
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _check_resource_availability(self, feature_spec: FeatureSpec) -> bool:
        """Check if resources are available for implementation"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _get_code_coverage(self, feature_id: str) -> float:
        """Get code coverage percentage"""
        await asyncio.sleep(0.1)
        return 85.0  # Placeholder
    
    async def _detect_code_smells(self, feature_id: str) -> List[str]:
        """Detect code smells in implementation"""
        await asyncio.sleep(0.1)
        return []  # Placeholder
    
    async def _check_requirements_implementation(self, feature_spec: FeatureSpec) -> int:
        """Check how many requirements are implemented"""
        await asyncio.sleep(0.1)
        return len(feature_spec.requirements)  # Placeholder
    
    async def _check_documentation(self, feature_id: str) -> bool:
        """Check if documentation is complete"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _get_unit_test_coverage(self, feature_id: str) -> float:
        """Get unit test coverage percentage"""
        await asyncio.sleep(0.1)
        return 90.0  # Placeholder
    
    async def _check_integration_tests(self, feature_id: str) -> bool:
        """Check if integration tests exist"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _is_ui_feature(self, feature_id: str) -> bool:
        """Check if feature has UI components"""
        await asyncio.sleep(0.1)
        return False  # Placeholder
    
    async def _check_e2e_tests(self, feature_id: str) -> bool:
        """Check if E2E tests exist"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _run_performance_tests(self, feature_id: str) -> Dict[str, Any]:
        """Run performance tests"""
        await asyncio.sleep(0.1)
        return {'passed': True, 'message': 'Performance acceptable'}  # Placeholder
    
    async def _run_security_scan(self, feature_id: str) -> List[Dict[str, Any]]:
        """Run security vulnerability scan"""
        await asyncio.sleep(0.1)
        return []  # Placeholder
    
    async def _check_rollback_plan(self, feature_id: str) -> bool:
        """Check if rollback plan exists"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _check_monitoring_setup(self, feature_id: str) -> bool:
        """Check if monitoring is configured"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _check_feature_flags(self, feature_id: str) -> bool:
        """Check if feature flags are configured"""
        await asyncio.sleep(0.1)
        return True  # Placeholder
    
    async def _check_database_migrations(self, feature_id: str) -> bool:
        """Check if database migrations are safe"""
        await asyncio.sleep(0.1)
        return True  # Placeholder

class AIFeatureLifecycleManager:
    """Main orchestrator for AI-driven feature lifecycle management"""
    
    def __init__(self):
        self.registry = FeatureRegistry()
        self.quality_gates = FeatureQualityGates(self.registry)
        self.active_features: Dict[str, FeatureStage] = {}
    
    async def propose_feature(self, feature_spec: FeatureSpec) -> Tuple[bool, str, QualityGateResult]:
        """Propose a new feature and run pre-development checks"""
        # Run pre-development quality gate
        gate_result = await self.quality_gates.pre_development_gate(feature_spec)
        
        if not gate_result.passed:
            return False, "Feature blocked at pre-development gate", gate_result
        
        # Register the feature
        feature_id = self.registry.register_feature(feature_spec)
        self.active_features[feature_id] = FeatureStage.PLANNING
        
        return True, feature_id, gate_result
    
    async def advance_feature(self, feature_id: str) -> Tuple[bool, FeatureStage, QualityGateResult]:
        """Advance feature to next stage with quality checks"""
        current_stage = self.active_features.get(feature_id)
        
        if not current_stage:
            return False, FeatureStage.BLOCKED, QualityGateResult(
                passed=False,
                stage=FeatureStage.BLOCKED,
                checks={},
                blockers=["Feature not found"],
                warnings=[]
            )
        
        # Determine next stage and run appropriate gate
        next_stage = None
        gate_result = None
        
        if current_stage == FeatureStage.PLANNING:
            next_stage = FeatureStage.DEVELOPMENT
            gate_result = await self.quality_gates.development_gate(feature_id)
        elif current_stage == FeatureStage.DEVELOPMENT:
            next_stage = FeatureStage.TESTING
            gate_result = await self.quality_gates.testing_gate(feature_id)
        elif current_stage == FeatureStage.TESTING:
            next_stage = FeatureStage.REVIEW
            # Review gate would be implemented here
            gate_result = QualityGateResult(
                passed=True,
                stage=FeatureStage.REVIEW,
                checks={'review': True},
                blockers=[],
                warnings=[]
            )
        elif current_stage == FeatureStage.REVIEW:
            next_stage = FeatureStage.DEPLOYMENT
            gate_result = await self.quality_gates.deployment_gate(feature_id)
        elif current_stage == FeatureStage.DEPLOYMENT:
            next_stage = FeatureStage.MONITORING
            gate_result = QualityGateResult(
                passed=True,
                stage=FeatureStage.MONITORING,
                checks={'deployed': True},
                blockers=[],
                warnings=[]
            )
        elif current_stage == FeatureStage.MONITORING:
            next_stage = FeatureStage.COMPLETED
            gate_result = QualityGateResult(
                passed=True,
                stage=FeatureStage.COMPLETED,
                checks={'monitoring': True},
                blockers=[],
                warnings=[]
            )
        
        if gate_result and gate_result.passed:
            self.active_features[feature_id] = next_stage
            return True, next_stage, gate_result
        elif gate_result:
            return False, current_stage, gate_result
        else:
            return False, FeatureStage.BLOCKED, QualityGateResult(
                passed=False,
                stage=FeatureStage.BLOCKED,
                checks={},
                blockers=["Unknown stage transition"],
                warnings=[]
            )
    
    def get_feature_status(self, feature_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive status of a feature"""
        feature_spec = self.registry.get_feature(feature_id)
        if not feature_spec:
            return None
        
        current_stage = self.active_features.get(feature_id, FeatureStage.BLOCKED)
        gate_results = self.quality_gates.gate_results.get(feature_id, [])
        
        return {
            'feature_id': feature_id,
            'name': feature_spec.name,
            'current_stage': current_stage.value,
            'risk_level': feature_spec.risk_level.value,
            'owner': feature_spec.owner,
            'gate_results': [
                {
                    'stage': result.stage.value,
                    'passed': result.passed,
                    'blockers': result.blockers,
                    'warnings': result.warnings,
                    'timestamp': result.timestamp.isoformat()
                }
                for result in gate_results
            ],
            'created_at': feature_spec.created_at.isoformat()
        }
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get metrics for AI dashboard"""
        all_features = self.registry.list_features()
        
        stage_counts = {}
        for stage in FeatureStage:
            stage_counts[stage.value] = sum(
                1 for f_id, f_stage in self.active_features.items()
                if f_stage == stage
            )
        
        risk_distribution = {}
        for risk in RiskLevel:
            risk_distribution[risk.value] = sum(
                1 for f in all_features
                if f.risk_level == risk
            )
        
        # Calculate quality metrics
        total_gates = sum(len(results) for results in self.quality_gates.gate_results.values())
        passed_gates = sum(
            sum(1 for r in results if r.passed)
            for results in self.quality_gates.gate_results.values()
        )
        
        return {
            'total_features': len(all_features),
            'active_features': len(self.active_features),
            'stage_distribution': stage_counts,
            'risk_distribution': risk_distribution,
            'quality_gate_pass_rate': (passed_gates / total_gates * 100) if total_gates > 0 else 100,
            'blocked_features': stage_counts.get(FeatureStage.BLOCKED.value, 0),
            'completed_features': stage_counts.get(FeatureStage.COMPLETED.value, 0)
        }

# Example usage
async def main():
    """Example of using the AI Feature Lifecycle Management system"""
    manager = AIFeatureLifecycleManager()
    
    # Create a feature specification
    booking_feature = FeatureSpec(
        name="AI-Powered Smart Booking",
        description="Intelligent booking system that predicts customer preferences and optimizes scheduling",
        requirements=[
            "Predict customer preferred time slots based on history",
            "Optimize barber scheduling for maximum efficiency",
            "Send intelligent reminders based on customer behavior",
            "Provide real-time availability updates"
        ],
        dependencies=["database", "ai_service", "notification_service"],
        risk_level=RiskLevel.MEDIUM,
        estimated_hours=120,
        priority=1,
        owner="AI Team"
    )
    
    # Propose the feature
    success, feature_id, gate_result = await manager.propose_feature(booking_feature)
    
    if success:
        print(f"Feature registered: {feature_id}")
        print(f"Gate result: {gate_result.passed}")
        if gate_result.warnings:
            print(f"Warnings: {gate_result.warnings}")
        
        # Advance through stages
        for _ in range(3):
            success, stage, result = await manager.advance_feature(feature_id)
            print(f"Advanced to {stage.value}: {success}")
            if result.blockers:
                print(f"Blockers: {result.blockers}")
                break
        
        # Get feature status
        status = manager.get_feature_status(feature_id)
        print(f"Feature status: {json.dumps(status, indent=2)}")
        
        # Get dashboard metrics
        metrics = manager.get_dashboard_metrics()
        print(f"Dashboard metrics: {json.dumps(metrics, indent=2)}")
    else:
        print(f"Feature blocked: {gate_result.blockers}")

if __name__ == "__main__":
    asyncio.run(main())