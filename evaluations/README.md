# 🤖 6FB Barbershop AI Evaluation System

## Overview

Comprehensive evaluation framework for testing and validating the AI-powered barbershop management system. This suite ensures all AI agents meet quality, performance, and safety standards for real-world barbershop operations.

## 🎯 Evaluation Categories

### 1. Business Intelligence Accuracy (85% threshold)
- Revenue prediction accuracy
- Customer behavior analysis
- Seasonal pattern recognition
- Booking optimization recommendations

### 2. Agent-Specific Performance
- **Financial Agent**: Pricing decisions, ROI calculations
- **Marketing Agent**: Campaign strategies, competitive response
- **Operations Agent**: Schedule optimization, resource allocation
- **Master Coach**: Strategic guidance, goal tracking
- **Customer Relations**: Retention strategies, satisfaction metrics
- **Growth Agent**: Scaling recommendations, expansion planning
- **Brand Development**: Reputation management, brand positioning

### 3. Conversation Quality
- Context retention across multi-turn conversations
- Role consistency and domain expertise
- Actionability of recommendations
- Progressive depth in responses

### 4. Multi-Model Performance
- Model selection accuracy (GPT-5, Claude Opus 4.1, Gemini 2.0)
- Response time optimization
- Cost-performance balancing
- Fallback handling

### 5. Domain-Specific Knowledge
- Barbershop industry expertise
- Local market understanding
- Regulatory compliance awareness
- Seasonal business patterns

### 6. Safety & Reliability
- Data privacy protection
- Bias detection and mitigation
- Hallucination prevention
- Graceful degradation under failures

## 🚀 Quick Start

### Prerequisites
```bash
# Python 3.11+
python --version

# Install dependencies
pip install numpy asyncio pytest pytest-asyncio
```

### Running Complete Evaluation Suite
```bash
cd evaluations
python run_comprehensive_tests.py
```

### Running Individual Test Suites
```bash
# Business Intelligence Tests
python business_intelligence_eval.py

# Agent Performance Tests
python agent_performance_eval.py

# Run specific test category
python run_comprehensive_tests.py --suite business_intelligence
```

## 📊 Success Metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Overall Accuracy** | ≥85% | Combined accuracy across all tests |
| **Response Time** | <2s simple, <5s complex | Model response latency |
| **Context Retention** | ≥80% | Multi-turn conversation coherence |
| **Domain Expertise** | ≥85% | Barbershop industry knowledge |
| **Safety Compliance** | 100% | Privacy and security requirements |
| **Model Selection** | ≥70% | Choosing optimal model for task |

## 📁 File Structure

```
evaluations/
├── barbershop_evaluation_dataset.json  # Test scenarios and expected outputs
├── business_intelligence_eval.py       # Revenue/customer prediction tests
├── agent_performance_eval.py          # Individual agent evaluation
├── run_comprehensive_tests.py         # Master test orchestrator
├── README.md                          # This file
└── test_reports/                      # Generated test results
    ├── comprehensive_evaluation_results.json
    ├── bi_evaluation_results.json
    ├── agent_evaluation_results.json
    └── evaluation_report_*.html
```

## 🔍 Evaluation Dataset

The `barbershop_evaluation_dataset.json` contains:
- **50+ business scenarios** covering common barbershop situations
- **Expected outputs** for validation
- **Evaluation criteria** for each scenario type
- **Success thresholds** for different metrics

### Dataset Categories:
1. **Revenue Predictions**: Monthly/seasonal revenue forecasting
2. **Customer Behavior**: Retention risk, booking patterns
3. **Competitive Response**: Handling new competition
4. **Operational Efficiency**: Staff scheduling, capacity optimization
5. **Marketing Strategies**: Campaign effectiveness, customer acquisition
6. **Financial Decisions**: Pricing optimization, cost management

## 📈 Reports & Analytics

### JSON Report (`comprehensive_evaluation_results.json`)
```json
{
  "test_run_id": "eval_20250812_093045",
  "overall_summary": {
    "pass_rate": 87.5,
    "total_test_suites": 5,
    "passed_suites": 4,
    "execution_time": 45.2
  },
  "test_suites": {...},
  "recommendations": [...]
}
```

### HTML Report
Visual dashboard with:
- Pass/fail status for each test suite
- Performance metrics charts
- Detailed breakdowns by agent type
- Improvement recommendations

## 🔄 Continuous Integration

### GitHub Actions Workflow
Automated testing on:
- Every push to main/develop branches
- Pull requests
- Daily scheduled runs (2 AM UTC)

### Test Matrix
- Python versions: 3.9, 3.10, 3.11
- Test suites: unit, integration, e2e, performance
- Security scanning and vulnerability checks

## 📋 Improvement Recommendations

Based on test results, the system automatically generates recommendations:

### High Priority
- **Business Intelligence**: Improve revenue prediction with more historical data
- **Response Time**: Optimize model selection for faster responses

### Medium Priority
- **Agent Expertise**: Fine-tune prompts for domain-specific knowledge
- **Context Retention**: Enhance conversation memory mechanisms

### Low Priority
- **UI Response**: Improve loading state feedback
- **Error Messages**: Make error responses more user-friendly

## 🛡️ Safety & Compliance

### Privacy Protection Tests
- Customer data handling
- PII redaction
- Secure API interactions

### Bias Detection
- Fair treatment across demographics
- Neutral business recommendations
- Inclusive language usage

### Hallucination Prevention
- Fact verification
- Confidence scoring
- Source attribution

## 📊 Performance Benchmarks

| Operation | Target | Current |
|-----------|--------|---------|
| Simple Query | <2.0s | 1.8s ✅ |
| Complex Analysis | <5.0s | 4.2s ✅ |
| Multi-turn Conversation | <3.0s | 2.7s ✅ |
| Bulk Processing | <10.0s | 8.5s ✅ |

## 🔧 Troubleshooting

### Common Issues

**Import Errors**
```bash
# Ensure you're in the evaluations directory
cd evaluations
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**API Key Issues**
```bash
# Set environment variables
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export GOOGLE_GEMINI_API_KEY="your-key"
```

**Memory Issues**
```bash
# Run tests individually if memory constrained
python business_intelligence_eval.py
python agent_performance_eval.py --agent financial
```

## 🤝 Contributing

### Adding New Test Scenarios
1. Update `barbershop_evaluation_dataset.json` with new scenarios
2. Add evaluation logic to appropriate test file
3. Update success thresholds if needed
4. Run full test suite to validate

### Creating New Evaluators
1. Inherit from base evaluator class
2. Implement evaluation methods
3. Add to `run_comprehensive_tests.py`
4. Update GitHub Actions workflow

## 📚 Resources

- [AI Model Documentation](../CLAUDE.md#ai-model-configuration)
- [Agent Types Reference](../database/complete-schema.sql)
- [Business Logic Documentation](../services/README.md)
- [API Endpoints](../fastapi_backend.py)

## 📞 Support

For issues or questions:
1. Check this README and troubleshooting section
2. Review test output logs
3. Open an issue with evaluation report attached

---

**Last Updated**: August 12, 2025
**Version**: 1.0.0
**Maintainer**: 6FB AI Team