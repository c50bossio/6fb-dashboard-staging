"""
Comprehensive test suite for the AI Agent System
Tests the core AI functionality, RAG implementation, and business intelligence features
"""

import pytest
import asyncio
import json
import numpy as np
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Import the modules under test
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from enhanced_fastapi_server_async import (
    AgenticCoach,
    BusinessKnowledgeBase,
    VectorSearchEngine,
    BusinessAnalytics,
    ConversationManager,
    app
)

# Test fixtures and mock data
@pytest.fixture
def mock_business_data():
    """Mock business data for testing"""
    return {
        'revenue': [
            {'date': '2024-01-01', 'amount': 1200, 'transactions': 15},
            {'date': '2024-01-02', 'amount': 1350, 'transactions': 18},
            {'date': '2024-01-03', 'amount': 1100, 'transactions': 12},
        ],
        'appointments': [
            {'date': '2024-01-01', 'count': 25, 'completed': 23, 'cancelled': 2},
            {'date': '2024-01-02', 'count': 30, 'completed': 28, 'cancelled': 2},
        ],
        'customers': [
            {'id': 1, 'name': 'John Smith', 'total_spent': 450, 'visits': 12},
            {'id': 2, 'name': 'Jane Doe', 'total_spent': 320, 'visits': 8},
        ],
        'services': [
            {'name': 'Haircut', 'price': 35, 'duration': 30, 'popularity': 0.85},
            {'name': 'Beard Trim', 'price': 25, 'duration': 20, 'popularity': 0.65},
        ]
    }

@pytest.fixture
def mock_vector_embeddings():
    """Mock vector embeddings for testing"""
    return np.random.rand(10, 384).astype(np.float32)  # 10 embeddings of 384 dimensions

@pytest.fixture
def sample_conversation_history():
    """Sample conversation history for testing"""
    return [
        {
            'role': 'user',
            'content': 'How can I increase my revenue?',
            'timestamp': datetime.now() - timedelta(minutes=5)
        },
        {
            'role': 'assistant',
            'content': 'Based on your current data, I recommend focusing on customer retention...',
            'timestamp': datetime.now() - timedelta(minutes=4),
            'context_used': ['revenue_trends', 'customer_retention']
        }
    ]

class TestAgenticCoach:
    """Test the main AgenticCoach class"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        self.coach = AgenticCoach()
        self.coach.knowledge_base = Mock(spec=BusinessKnowledgeBase)
        self.coach.vector_search = Mock(spec=VectorSearchEngine)
        self.coach.analytics = Mock(spec=BusinessAnalytics)
        self.coach.conversation_manager = Mock(spec=ConversationManager)

    @pytest.mark.asyncio
    async def test_coach_initialization(self):
        """Test that the coach initializes correctly"""
        assert self.coach is not None
        assert hasattr(self.coach, 'knowledge_base')
        assert hasattr(self.coach, 'vector_search')
        assert hasattr(self.coach, 'analytics')
        assert hasattr(self.coach, 'conversation_manager')

    @pytest.mark.asyncio
    async def test_process_user_query_success(self, mock_business_data):
        """Test successful query processing"""
        # Mock dependencies
        self.coach.vector_search.find_relevant_context = AsyncMock(
            return_value=['revenue_optimization', 'customer_retention']
        )
        self.coach.analytics.get_business_insights = AsyncMock(
            return_value=mock_business_data
        )
        self.coach.knowledge_base.get_recommendations = AsyncMock(
            return_value=[
                'Implement loyalty program',
                'Optimize pricing strategy',
                'Improve service quality'
            ]
        )
        
        query = "How can I increase my barbershop revenue?"
        user_id = "user_123"
        
        response = await self.coach.process_query(query, user_id)
        
        assert response is not None
        assert 'content' in response
        assert 'context_used' in response
        assert 'recommendations' in response
        assert len(response['recommendations']) > 0

    @pytest.mark.asyncio
    async def test_process_query_with_conversation_context(self, sample_conversation_history):
        """Test query processing with conversation history"""
        self.coach.conversation_manager.get_conversation_history = AsyncMock(
            return_value=sample_conversation_history
        )
        self.coach.vector_search.find_relevant_context = AsyncMock(
            return_value=['customer_analysis']
        )
        
        query = "What about customer retention strategies?"
        user_id = "user_123"
        
        response = await self.coach.process_query(query, user_id)
        
        # Verify conversation context was used
        self.coach.conversation_manager.get_conversation_history.assert_called_once_with(user_id)
        assert 'building on your previous question' in response['content'].lower() or \
               'retention' in response['content'].lower()

    @pytest.mark.asyncio
    async def test_process_query_error_handling(self):
        """Test error handling in query processing"""
        # Mock an error in vector search
        self.coach.vector_search.find_relevant_context = AsyncMock(
            side_effect=Exception("Vector search failed")
        )
        
        query = "Test query"
        user_id = "user_123"
        
        response = await self.coach.process_query(query, user_id)
        
        assert response is not None
        assert 'error' in response or 'apologize' in response['content'].lower()

    def test_validate_business_context(self, mock_business_data):
        """Test business context validation"""
        # Valid context
        valid_result = self.coach._validate_business_context(mock_business_data)
        assert valid_result is True
        
        # Invalid context - missing revenue data
        invalid_data = {k: v for k, v in mock_business_data.items() if k != 'revenue'}
        invalid_result = self.coach._validate_business_context(invalid_data)
        assert invalid_result is False

    def test_format_response_structure(self):
        """Test response formatting"""
        raw_content = "Here are some recommendations for your business..."
        context_used = ['revenue_trends', 'customer_data']
        recommendations = ['Improve service quality', 'Implement loyalty program']
        
        formatted_response = self.coach._format_response(
            raw_content, context_used, recommendations
        )
        
        assert isinstance(formatted_response, dict)
        assert 'content' in formatted_response
        assert 'timestamp' in formatted_response
        assert 'context_used' in formatted_response
        assert 'recommendations' in formatted_response
        assert formatted_response['content'] == raw_content


class TestBusinessKnowledgeBase:
    """Test the BusinessKnowledgeBase class"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        self.knowledge_base = BusinessKnowledgeBase()

    @pytest.mark.asyncio
    async def test_load_business_knowledge(self):
        """Test loading business knowledge from various sources"""
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = json.dumps({
                'barbershop_best_practices': [
                    'Maintain clean workspace',
                    'Provide excellent customer service',
                    'Use quality tools and products'
                ]
            })
            
            await self.knowledge_base.load_knowledge()
            
            assert len(self.knowledge_base.knowledge_entries) > 0

    @pytest.mark.asyncio
    async def test_get_recommendations_by_category(self):
        """Test getting recommendations by business category"""
        # Mock knowledge entries
        self.knowledge_base.knowledge_entries = {
            'revenue_optimization': [
                'Implement dynamic pricing',
                'Offer premium services',
                'Create package deals'
            ],
            'customer_retention': [
                'Loyalty program',
                'Personalized service',
                'Follow-up communications'
            ]
        }
        
        revenue_recs = await self.knowledge_base.get_recommendations('revenue_optimization')
        retention_recs = await self.knowledge_base.get_recommendations('customer_retention')
        
        assert len(revenue_recs) == 3
        assert len(retention_recs) == 3
        assert 'dynamic pricing' in revenue_recs[0].lower()

    def test_search_knowledge_by_keywords(self):
        """Test keyword-based knowledge search"""
        self.knowledge_base.knowledge_entries = {
            'customer_service': [
                'Always greet customers warmly',
                'Listen to customer preferences',
                'Provide service recommendations'
            ]
        }
        
        results = self.knowledge_base.search_by_keywords(['customer', 'service'])
        
        assert len(results) > 0
        assert any('customer' in result.lower() for result in results)

    def test_validate_knowledge_structure(self):
        """Test knowledge entry validation"""
        valid_entry = {
            'category': 'revenue_optimization',
            'content': 'Implement upselling strategies',
            'confidence': 0.85,
            'source': 'industry_best_practices'
        }
        
        invalid_entry = {
            'category': 'revenue_optimization',
            # Missing required fields
        }
        
        assert self.knowledge_base._validate_entry(valid_entry) is True
        assert self.knowledge_base._validate_entry(invalid_entry) is False


class TestVectorSearchEngine:
    """Test the VectorSearchEngine class"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        self.vector_engine = VectorSearchEngine()

    @pytest.mark.asyncio
    async def test_create_embeddings(self):
        """Test embedding creation from text"""
        text_samples = [
            "How to increase barbershop revenue",
            "Customer retention strategies",
            "Service pricing optimization"
        ]
        
        with patch.object(self.vector_engine, '_encode_text') as mock_encode:
            mock_encode.return_value = np.random.rand(384).astype(np.float32)
            
            embeddings = await self.vector_engine.create_embeddings(text_samples)
            
            assert embeddings.shape == (3, 384)
            assert embeddings.dtype == np.float32

    @pytest.mark.asyncio
    async def test_similarity_search(self, mock_vector_embeddings):
        """Test vector similarity search"""
        # Setup mock embeddings database
        self.vector_engine.embeddings_db = mock_vector_embeddings
        self.vector_engine.content_mapping = {
            i: f"Content item {i}" for i in range(10)
        }
        
        query_embedding = np.random.rand(384).astype(np.float32)
        
        results = await self.vector_engine.similarity_search(query_embedding, top_k=3)
        
        assert len(results) == 3
        assert all('similarity_score' in result for result in results)
        assert all(isinstance(result['content'], str) for result in results)
        
        # Verify results are sorted by similarity score
        scores = [result['similarity_score'] for result in results]
        assert scores == sorted(scores, reverse=True)

    @pytest.mark.asyncio
    async def test_find_relevant_context(self):
        """Test finding relevant context for a query"""
        query = "How can I improve customer satisfaction?"
        
        with patch.object(self.vector_engine, 'similarity_search') as mock_search:
            mock_search.return_value = [
                {'content': 'customer_service_tips', 'similarity_score': 0.85},
                {'content': 'feedback_collection', 'similarity_score': 0.78},
                {'content': 'service_quality', 'similarity_score': 0.72}
            ]
            
            context = await self.vector_engine.find_relevant_context(query, threshold=0.7)
            
            assert len(context) == 3
            assert all(item in ['customer_service_tips', 'feedback_collection', 'service_quality'] 
                      for item in context)

    def test_cosine_similarity_calculation(self):
        """Test cosine similarity calculation"""
        vec1 = np.array([1, 0, 1, 0], dtype=np.float32)
        vec2 = np.array([1, 1, 0, 0], dtype=np.float32)
        
        similarity = self.vector_engine._calculate_cosine_similarity(vec1, vec2)
        
        expected_similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        assert abs(similarity - expected_similarity) < 1e-6

    @pytest.mark.asyncio
    async def test_update_embeddings_database(self):
        """Test updating the embeddings database"""
        new_content = ["New business strategy", "Updated pricing model"]
        
        with patch.object(self.vector_engine, 'create_embeddings') as mock_create:
            mock_create.return_value = np.random.rand(2, 384).astype(np.float32)
            
            await self.vector_engine.update_embeddings_database(new_content)
            
            mock_create.assert_called_once_with(new_content)
            # Verify database was updated
            assert len(self.vector_engine.content_mapping) >= 2


class TestBusinessAnalytics:
    """Test the BusinessAnalytics class"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        self.analytics = BusinessAnalytics()

    @pytest.mark.asyncio
    async def test_get_revenue_insights(self, mock_business_data):
        """Test revenue analysis and insights"""
        with patch.object(self.analytics, '_fetch_revenue_data') as mock_fetch:
            mock_fetch.return_value = mock_business_data['revenue']
            
            insights = await self.analytics.get_revenue_insights('shop_123')
            
            assert 'total_revenue' in insights
            assert 'average_transaction' in insights
            assert 'growth_rate' in insights
            assert 'trend' in insights
            
            # Verify calculations
            total_revenue = sum(item['amount'] for item in mock_business_data['revenue'])
            assert insights['total_revenue'] == total_revenue

    @pytest.mark.asyncio
    async def test_customer_analysis(self, mock_business_data):
        """Test customer behavior analysis"""
        with patch.object(self.analytics, '_fetch_customer_data') as mock_fetch:
            mock_fetch.return_value = mock_business_data['customers']
            
            analysis = await self.analytics.analyze_customers('shop_123')
            
            assert 'total_customers' in analysis
            assert 'average_spend' in analysis
            assert 'customer_lifetime_value' in analysis
            assert 'retention_rate' in analysis

    @pytest.mark.asyncio
    async def test_service_performance_analysis(self, mock_business_data):
        """Test service performance metrics"""
        with patch.object(self.analytics, '_fetch_service_data') as mock_fetch:
            mock_fetch.return_value = mock_business_data['services']
            
            performance = await self.analytics.analyze_service_performance('shop_123')
            
            assert 'top_services' in performance
            assert 'revenue_by_service' in performance
            assert 'popularity_scores' in performance
            
            # Verify top services are sorted by revenue or popularity
            top_services = performance['top_services']
            assert len(top_services) > 0

    def test_calculate_growth_rate(self):
        """Test growth rate calculation"""
        current_value = 1500
        previous_value = 1200
        
        growth_rate = self.analytics._calculate_growth_rate(current_value, previous_value)
        expected_rate = ((current_value - previous_value) / previous_value) * 100
        
        assert abs(growth_rate - expected_rate) < 0.01

    def test_identify_trends(self):
        """Test trend identification in time series data"""
        data_points = [
            {'date': '2024-01-01', 'value': 100},
            {'date': '2024-01-02', 'value': 110},
            {'date': '2024-01-03', 'value': 120},
            {'date': '2024-01-04', 'value': 115},
            {'date': '2024-01-05', 'value': 125}
        ]
        
        trend = self.analytics._identify_trend(data_points)
        
        assert trend in ['increasing', 'decreasing', 'stable', 'volatile']
        # Given the data, should identify as increasing
        assert trend == 'increasing'

    @pytest.mark.asyncio
    async def test_predictive_analytics(self, mock_business_data):
        """Test predictive analytics functionality"""
        with patch.object(self.analytics, '_fetch_historical_data') as mock_fetch:
            mock_fetch.return_value = mock_business_data['revenue']
            
            predictions = await self.analytics.predict_future_performance('shop_123', days=30)
            
            assert 'predicted_revenue' in predictions
            assert 'confidence_interval' in predictions
            assert 'factors' in predictions
            assert len(predictions['predicted_revenue']) > 0


class TestConversationManager:
    """Test the ConversationManager class"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        self.conversation_manager = ConversationManager()

    @pytest.mark.asyncio
    async def test_store_conversation(self):
        """Test storing conversation messages"""
        user_id = "user_123"
        message = {
            'role': 'user',
            'content': 'How can I improve my business?',
            'timestamp': datetime.now()
        }
        
        await self.conversation_manager.store_message(user_id, message)
        
        # Verify message was stored
        history = await self.conversation_manager.get_conversation_history(user_id)
        assert len(history) == 1
        assert history[0]['content'] == message['content']

    @pytest.mark.asyncio
    async def test_conversation_history_retrieval(self, sample_conversation_history):
        """Test retrieving conversation history"""
        user_id = "user_123"
        
        # Mock stored conversations
        with patch.object(self.conversation_manager, '_load_from_storage') as mock_load:
            mock_load.return_value = sample_conversation_history
            
            history = await self.conversation_manager.get_conversation_history(user_id, limit=5)
            
            assert len(history) <= 5
            assert all('role' in msg for msg in history)
            assert all('content' in msg for msg in history)

    @pytest.mark.asyncio
    async def test_conversation_context_extraction(self, sample_conversation_history):
        """Test extracting relevant context from conversation"""
        user_id = "user_123"
        current_query = "What about customer retention?"
        
        with patch.object(self.conversation_manager, 'get_conversation_history') as mock_history:
            mock_history.return_value = sample_conversation_history
            
            context = await self.conversation_manager.extract_context(user_id, current_query)
            
            assert 'previous_topics' in context
            assert 'related_discussions' in context
            assert len(context['previous_topics']) > 0

    def test_conversation_summarization(self, sample_conversation_history):
        """Test conversation summarization"""
        summary = self.conversation_manager._summarize_conversation(sample_conversation_history)
        
        assert isinstance(summary, str)
        assert len(summary) > 0
        assert 'revenue' in summary.lower() or 'customer' in summary.lower()

    @pytest.mark.asyncio
    async def test_conversation_cleanup(self):
        """Test automatic conversation cleanup"""
        user_id = "user_123"
        old_messages = [
            {
                'role': 'user',
                'content': 'Old message',
                'timestamp': datetime.now() - timedelta(days=31)  # Older than 30 days
            }
        ]
        
        with patch.object(self.conversation_manager, '_load_from_storage') as mock_load:
            mock_load.return_value = old_messages
            
            await self.conversation_manager.cleanup_old_conversations(days_to_keep=30)
            
            # Verify old messages were cleaned up
            history = await self.conversation_manager.get_conversation_history(user_id)
            assert len(history) == 0


class TestAPIEndpoints:
    """Test the FastAPI endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client"""
        from fastapi.testclient import TestClient
        self.client = TestClient(app)

    def test_health_check_endpoint(self):
        """Test health check endpoint"""
        response = self.client.get("/health")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_chat_endpoint_success(self):
        """Test successful chat interaction"""
        with patch('enhanced_fastapi_server_async.agentic_coach') as mock_coach:
            mock_coach.process_query = AsyncMock(return_value={
                'content': 'Here are some revenue optimization strategies...',
                'context_used': ['revenue_trends'],
                'recommendations': ['Improve service quality'],
                'timestamp': datetime.now().isoformat()
            })
            
            response = self.client.post("/api/chat", json={
                'message': 'How can I increase revenue?',
                'user_id': 'user_123'
            })
            
            assert response.status_code == 200
            data = response.json()
            assert 'content' in data
            assert 'recommendations' in data

    def test_chat_endpoint_validation(self):
        """Test chat endpoint input validation"""
        # Missing message
        response = self.client.post("/api/chat", json={
            'user_id': 'user_123'
        })
        assert response.status_code == 422
        
        # Missing user_id
        response = self.client.post("/api/chat", json={
            'message': 'Test message'
        })
        assert response.status_code == 422

    def test_analytics_endpoint(self):
        """Test business analytics endpoint"""
        with patch('enhanced_fastapi_server_async.business_analytics') as mock_analytics:
            mock_analytics.get_business_insights = AsyncMock(return_value={
                'revenue_insights': {'total': 15000, 'growth': 12.5},
                'customer_insights': {'total': 128, 'retention': 85.2},
                'service_insights': {'top_service': 'Haircut'}
            })
            
            response = self.client.get("/api/analytics/shop123")
            
            assert response.status_code == 200
            data = response.json()
            assert 'revenue_insights' in data
            assert 'customer_insights' in data

    def test_conversation_history_endpoint(self):
        """Test conversation history retrieval"""
        with patch('enhanced_fastapi_server_async.conversation_manager') as mock_manager:
            mock_manager.get_conversation_history = AsyncMock(return_value=[
                {
                    'role': 'user',
                    'content': 'Test message',
                    'timestamp': datetime.now().isoformat()
                }
            ])
            
            response = self.client.get("/api/conversations/user123")
            
            assert response.status_code == 200
            data = response.json()
            assert 'conversations' in data
            assert len(data['conversations']) > 0


class TestPerformanceAndSecurity:
    """Test performance and security aspects"""
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_handling(self):
        """Test handling multiple concurrent requests"""
        coach = AgenticCoach()
        
        # Mock dependencies
        coach.vector_search = Mock()
        coach.vector_search.find_relevant_context = AsyncMock(return_value=['context1'])
        coach.analytics = Mock()
        coach.analytics.get_business_insights = AsyncMock(return_value={})
        coach.knowledge_base = Mock()
        coach.knowledge_base.get_recommendations = AsyncMock(return_value=['rec1'])
        
        # Create multiple concurrent requests
        tasks = []
        for i in range(10):
            task = coach.process_query(f"Query {i}", f"user_{i}")
            tasks.append(task)
        
        # Execute all requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all requests completed successfully
        assert len(results) == 10
        assert all(not isinstance(result, Exception) for result in results)

    def test_input_sanitization(self):
        """Test input sanitization and validation"""
        from enhanced_fastapi_server_async import sanitize_input
        
        # Test XSS prevention
        malicious_input = "<script>alert('xss')</script>How to improve revenue?"
        sanitized = sanitize_input(malicious_input)
        assert "<script>" not in sanitized
        assert "alert" not in sanitized
        
        # Test SQL injection prevention
        sql_injection = "'; DROP TABLE users; --"
        sanitized = sanitize_input(sql_injection)
        assert "DROP TABLE" not in sanitized
        assert "--" not in sanitized

    def test_rate_limiting_logic(self):
        """Test rate limiting implementation"""
        from enhanced_fastapi_server_async import RateLimiter
        
        limiter = RateLimiter(max_requests=5, time_window=60)
        user_id = "test_user"
        
        # Test normal usage
        for i in range(5):
            assert limiter.is_allowed(user_id) is True
        
        # Test rate limit exceeded
        assert limiter.is_allowed(user_id) is False

    @pytest.mark.asyncio
    async def test_response_time_performance(self):
        """Test response time requirements"""
        import time
        
        coach = AgenticCoach()
        # Mock fast responses
        coach.vector_search = Mock()
        coach.vector_search.find_relevant_context = AsyncMock(return_value=['context1'])
        coach.analytics = Mock()
        coach.analytics.get_business_insights = AsyncMock(return_value={})
        coach.knowledge_base = Mock()
        coach.knowledge_base.get_recommendations = AsyncMock(return_value=['rec1'])
        
        start_time = time.time()
        response = await coach.process_query("Test query", "user_123")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < 3.0  # Should respond within 3 seconds
        assert response is not None

    def test_memory_usage_optimization(self):
        """Test memory usage optimization"""
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss
        
        # Create multiple coach instances to test memory management
        coaches = []
        for i in range(100):
            coach = AgenticCoach()
            coaches.append(coach)
        
        # Force garbage collection
        del coaches
        gc.collect()
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB for 100 instances)
        assert memory_increase < 100 * 1024 * 1024


class TestIntegrationScenarios:
    """Test complete integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_complete_business_consultation_flow(self):
        """Test a complete business consultation conversation"""
        # This would be a longer test that simulates a real conversation
        coach = AgenticCoach()
        
        # Mock all dependencies with realistic responses
        coach.vector_search = Mock()
        coach.analytics = Mock()
        coach.knowledge_base = Mock()
        coach.conversation_manager = Mock()
        
        # Simulate conversation flow
        queries = [
            "What's my current business performance?",
            "How can I improve customer retention?",
            "What pricing strategies would work best?",
            "How do I implement these recommendations?"
        ]
        
        user_id = "integration_test_user"
        responses = []
        
        for query in queries:
            # Mock appropriate responses for each stage
            if "performance" in query:
                coach.analytics.get_business_insights = AsyncMock(return_value={
                    'revenue': {'total': 15000, 'growth': 12.5},
                    'customers': {'total': 128, 'retention': 85.2}
                })
            elif "retention" in query:
                coach.knowledge_base.get_recommendations = AsyncMock(return_value=[
                    'Implement loyalty program',
                    'Personalize customer service',
                    'Follow up after appointments'
                ])
            
            response = await coach.process_query(query, user_id)
            responses.append(response)
        
        # Verify the conversation progression
        assert len(responses) == 4
        assert all('content' in response for response in responses)
        assert any('retention' in response['content'].lower() for response in responses[1:])

    @pytest.mark.asyncio
    async def test_multi_user_conversation_isolation(self):
        """Test that conversations between different users are isolated"""
        coach = AgenticCoach()
        conversation_manager = ConversationManager()
        
        user1_id = "user_1"
        user2_id = "user_2"
        
        # Store different conversations for each user
        await conversation_manager.store_message(user1_id, {
            'role': 'user',
            'content': 'Revenue optimization question',
            'timestamp': datetime.now()
        })
        
        await conversation_manager.store_message(user2_id, {
            'role': 'user',
            'content': 'Customer service question',
            'timestamp': datetime.now()
        })
        
        # Retrieve conversations
        user1_history = await conversation_manager.get_conversation_history(user1_id)
        user2_history = await conversation_manager.get_conversation_history(user2_id)
        
        # Verify isolation
        assert len(user1_history) == 1
        assert len(user2_history) == 1
        assert 'revenue' in user1_history[0]['content'].lower()
        assert 'customer service' in user2_history[0]['content'].lower()


# Performance benchmarks
class TestPerformanceBenchmarks:
    """Performance benchmarks for the AI agent system"""
    
    @pytest.mark.benchmark
    def test_query_processing_benchmark(self, benchmark):
        """Benchmark query processing speed"""
        coach = AgenticCoach()
        
        # Mock fast dependencies
        coach.vector_search = Mock()
        coach.vector_search.find_relevant_context = AsyncMock(return_value=['context'])
        coach.analytics = Mock()
        coach.analytics.get_business_insights = AsyncMock(return_value={})
        coach.knowledge_base = Mock()
        coach.knowledge_base.get_recommendations = AsyncMock(return_value=['recommendation'])
        
        async def process_query_wrapper():
            return await coach.process_query("Test query", "user_123")
        
        # Use asyncio to run the async function
        import asyncio
        result = benchmark(lambda: asyncio.run(process_query_wrapper()))
        assert result is not None

    @pytest.mark.benchmark
    def test_vector_search_benchmark(self, benchmark, mock_vector_embeddings):
        """Benchmark vector search performance"""
        vector_engine = VectorSearchEngine()
        vector_engine.embeddings_db = mock_vector_embeddings
        vector_engine.content_mapping = {i: f"Content {i}" for i in range(10)}
        
        query_embedding = np.random.rand(384).astype(np.float32)
        
        async def search_wrapper():
            return await vector_engine.similarity_search(query_embedding, top_k=5)
        
        import asyncio
        result = benchmark(lambda: asyncio.run(search_wrapper()))
        assert len(result) == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=enhanced_fastapi_server_async", "--cov-report=html"])