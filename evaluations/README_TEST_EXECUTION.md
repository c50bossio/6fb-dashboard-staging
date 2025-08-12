# AI Evaluation Test Suite - Execution Guide

## Quick Start

### Run All Tests
```bash
cd "/Users/bossio/6FB AI Agent System/evaluations"
python run_comprehensive_tests.py
```

### Run Specific Test Suites
```bash
# Financial Agent Tests
python run_comprehensive_tests.py --suite=financial

# Marketing Agent Tests  
python run_comprehensive_tests.py --suite=marketing

# Model Integration Tests
python run_comprehensive_tests.py --suite=integration

# Conversation Quality Tests
python run_comprehensive_tests.py --suite=conversation

# Business Intelligence Tests
python run_comprehensive_tests.py --suite=business

# Safety & Reliability Tests
python run_comprehensive_tests.py --suite=safety

# Performance Benchmark Tests
python run_comprehensive_tests.py --suite=performance
```

### Quick Testing (Fast Execution)
```bash
python run_comprehensive_tests.py --quick
```

### Generate Reports Only
```bash
python run_comprehensive_tests.py --report-only
```

## Individual Test Files

### Unit Tests
```bash
pytest test_financial_agent.py -v
pytest test_marketing_agent.py -v
pytest test_operations_agent.py -v
```

### Integration Tests
```bash
pytest test_model_integration.py -v
pytest test_business_intelligence.py -v
```

### End-to-End Tests
```bash
pytest test_conversation_quality.py -v
pytest test_ai_agent_evaluation_suite.py -v
```

### Safety & Performance Tests
```bash
pytest test_safety_reliability.py -v
pytest test_performance_benchmarks.py -v
```

## Test Coverage Analysis
```bash
# Run with coverage
pytest --cov=. --cov-report=html test_*.py

# Coverage for specific modules
pytest --cov=financial_agent --cov-report=term-missing test_financial_agent.py
```

## Performance Profiling
```bash
# Run with profiling
pytest --profile test_performance_benchmarks.py

# Memory usage analysis
pytest --profile-svg test_model_integration.py
```

## Test Reports

The test runner generates comprehensive reports in multiple formats:

- **HTML Report**: `test_reports/comprehensive_test_report.html`
- **JSON Report**: `test_reports/test_results.json`
- **Text Summary**: `test_reports/test_summary.txt`
- **Performance Metrics**: `test_reports/performance_metrics.json`

## Success Criteria

### Unit Tests
- **Response Accuracy**: ≥90% for all agent types
- **Domain Knowledge**: ≥85% accuracy for barbershop-specific queries
- **Financial Calculations**: ≥95% accuracy for revenue/cost analysis

### Integration Tests  
- **Model Selection**: ≥80% optimal model selection
- **Cross-Model Consistency**: ≥75% response consistency
- **Fallback Mechanisms**: 100% fallback success rate

### E2E Tests
- **Context Retention**: ≥85% across multi-turn conversations
- **Role Consistency**: ≥90% agent personality maintenance
- **Progressive Depth**: ≥80% conversation complexity increase

### Performance Benchmarks
- **Response Time**: ≤2.0s for simple queries, ≤5.0s for complex analysis
- **Concurrent Load**: Handle 10+ concurrent conversations
- **Memory Usage**: ≤500MB per agent instance

## Troubleshooting

### Common Issues
1. **Import Errors**: Ensure all dependencies are installed
2. **API Timeouts**: Check network connectivity and API keys
3. **Memory Issues**: Reduce concurrent test execution with `--quick` flag
4. **Test Failures**: Review individual test logs in `test_reports/` directory

### Debug Mode
```bash
pytest -s -v --tb=long test_financial_agent.py
```

### Logging
Set environment variable for detailed logging:
```bash
export AI_TEST_LOG_LEVEL=DEBUG
python run_comprehensive_tests.py
```