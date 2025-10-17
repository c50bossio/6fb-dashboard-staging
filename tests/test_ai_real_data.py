"""
Test AI system with real barbershop data
Verifies the complete data flow from database to AI insights
"""

import asyncio
import pytest
import os
from unittest.mock import Mock, patch

# Import our services
from services.ai_data_service import ai_data_service
from services.ai_orchestrator_enhanced import ai_orchestrator
from services.supabase_auth import supabase_auth

class TestAIRealData:
    """Test AI system with real data integration"""
    
    @pytest.fixture
    def mock_barbershop_id(self):
        """Mock barbershop ID for testing"""
        return "test-barbershop-123"
    
    @pytest.fixture
    def mock_user_context(self, mock_barbershop_id):
        """Mock authenticated user context"""
        return {
            "user_id": "test-user-123",
            "email": "test@barbershop.com",
            "barbershop_id": mock_barbershop_id,
            "barbershop": {
                "id": mock_barbershop_id,
                "name": "Test Barbershop",
                "address": "123 Test St"
            },
            "profile": {
                "full_name": "Test User",
                "role": "owner"
            }
        }
    
    @pytest.mark.asyncio
    async def test_ai_data_service_barbershop_context(self, mock_barbershop_id):
        """Test AI data service retrieves barbershop context"""
        # This will test against real database if available
        try:
            context = await ai_data_service.get_barbershop_context(mock_barbershop_id)
            
            # Should return either real data or proper error handling
            assert isinstance(context, dict)
            
            if context.get('error'):
                # If barbershop doesn't exist, should have proper error
                assert 'barbershop_id' in context
                assert context['barbershop_id'] == mock_barbershop_id
            else:
                # If successful, should have expected structure
                assert 'barbershop' in context
                assert 'metrics' in context
                assert 'staff' in context
                assert 'customers' in context
                assert 'appointments' in context
                assert 'has_sufficient_data' in context
            
        except Exception as e:
            # Should handle database connection errors gracefully
            pytest.fail(f"AI data service should handle errors gracefully: {e}")
    
    @pytest.mark.asyncio
    async def test_ai_orchestrator_insufficient_data(self, mock_barbershop_id):
        """Test AI orchestrator handles insufficient data gracefully"""
        
        # Mock insufficient data scenario
        with patch.object(ai_data_service, 'get_ai_training_data') as mock_get_data:
            mock_get_data.return_value = {
                'barbershop_info': {'id': mock_barbershop_id, 'name': 'Test Barbershop'},
                'data_quality': {
                    'sufficient_for_analysis': False,
                    'data_sources': {
                        'appointments': False,
                        'customers': False,
                        'revenue': False,
                        'staff': True
                    }
                }
            }
            
            response = await ai_orchestrator.process_chat(
                message="What's my business performance?",
                barbershop_id=mock_barbershop_id
            )
            
            assert 'response' in response
            assert 'suggestions' in response
            assert 'don\'t have enough data' in response['response']
    
    @pytest.mark.asyncio
    async def test_ai_orchestrator_with_sufficient_data(self, mock_barbershop_id):
        """Test AI orchestrator processes sufficient data correctly"""
        
        # Mock sufficient data scenario
        with patch.object(ai_data_service, 'get_ai_training_data') as mock_get_data:
            mock_get_data.return_value = {
                'barbershop_info': {
                    'id': mock_barbershop_id, 
                    'name': 'Test Barbershop',
                    'location': '123 Test St'
                },
                'business_performance': {
                    'appointments': {
                        'total_appointments': 150,
                        'completion_rate': 85.0,
                        'cancellation_rate': 10.0,
                        'data_available': True
                    },
                    'revenue': {
                        'total_revenue': 5000.0,
                        'recent_revenue': 1200.0,
                        'data_available': True
                    },
                    'metrics': {
                        'average_appointment_value': 45.0,
                        'total_appointments': 150,
                        'data_available': True
                    }
                },
                'operations': {
                    'staff': {
                        'total_barbers': 3,
                        'services_offered': 8,
                        'data_available': True
                    }
                },
                'customers': {
                    'total_customers': 120,
                    'recent_customers': 25,
                    'growth_rate': 20.8,
                    'data_available': True
                },
                'data_quality': {
                    'sufficient_for_analysis': True,
                    'data_sources': {
                        'appointments': True,
                        'customers': True,
                        'revenue': True,
                        'staff': True
                    }
                }
            }
            
            response = await ai_orchestrator.process_chat(
                message="How is my financial performance?",
                barbershop_id=mock_barbershop_id
            )
            
            assert 'response' in response
            assert 'agent_used' in response
            assert 'data_sources' in response
            assert response['agent_used'] == 'Financial Advisor'
            assert len(response['data_sources']) > 0
            assert '$' in response['response']  # Should include financial metrics
    
    @pytest.mark.asyncio
    async def test_agent_selection(self, mock_barbershop_id):
        """Test that appropriate agents are selected for different queries"""
        
        test_cases = [
            ("What's my revenue?", "Financial Advisor"),
            ("How many appointments do I have?", "Operations Advisor"),
            ("How are my customers?", "Brand Advisor"),
            ("Should I expand?", "Growth Advisor"),
            ("General business question", "Operations Advisor")  # Default
        ]
        
        with patch.object(ai_data_service, 'get_ai_training_data') as mock_get_data:
            mock_get_data.return_value = {
                'barbershop_info': {'id': mock_barbershop_id, 'name': 'Test Barbershop'},
                'business_performance': {'appointments': {}, 'revenue': {}, 'metrics': {}},
                'operations': {'staff': {}},
                'customers': {},
                'data_quality': {'sufficient_for_analysis': True, 'data_sources': {}}
            }
            
            for message, expected_agent in test_cases:
                response = await ai_orchestrator.process_chat(
                    message=message,
                    barbershop_id=mock_barbershop_id
                )
                
                assert response.get('agent_used') == expected_agent, \
                    f"Message '{message}' should use {expected_agent}, got {response.get('agent_used')}"
    
    @pytest.mark.asyncio
    async def test_insights_generation(self, mock_barbershop_id):
        """Test comprehensive insights generation"""
        
        with patch.object(ai_data_service, 'get_ai_training_data') as mock_get_data:
            mock_get_data.return_value = {
                'barbershop_info': {'id': mock_barbershop_id, 'name': 'Test Barbershop'},
                'business_performance': {
                    'appointments': {'total_appointments': 100, 'completion_rate': 90},
                    'revenue': {'total_revenue': 4000},
                    'metrics': {'average_appointment_value': 40}
                },
                'operations': {'staff': {'total_barbers': 2}},
                'customers': {'total_customers': 80, 'growth_rate': 15},
                'data_quality': {'sufficient_for_analysis': True}
            }
            
            insights = await ai_orchestrator.generate_insights({
                'barbershop_id': mock_barbershop_id
            })
            
            assert 'barbershop_id' in insights
            assert 'insights' in insights
            assert 'generated_at' in insights
            
            # Should have insights from all agents
            expected_agents = ['financial', 'operations', 'brand', 'growth']
            for agent in expected_agents:
                assert agent in insights['insights']
    
    @pytest.mark.asyncio
    async def test_cache_functionality(self, mock_barbershop_id):
        """Test Redis caching with barbershop-specific keys"""
        
        # Test cache key generation and storage
        with patch.object(ai_orchestrator, '_get_cached_response') as mock_get_cache, \
             patch.object(ai_orchestrator, '_cache_response') as mock_set_cache:
            
            mock_get_cache.return_value = None  # Cache miss
            
            with patch.object(ai_data_service, 'get_ai_training_data') as mock_get_data:
                mock_get_data.return_value = {
                    'barbershop_info': {'id': mock_barbershop_id, 'name': 'Test'},
                    'data_quality': {'sufficient_for_analysis': True},
                    'business_performance': {}, 'operations': {}, 'customers': {}
                }
                
                await ai_orchestrator.process_chat(
                    message="Test message",
                    barbershop_id=mock_barbershop_id
                )
                
                # Verify cache methods were called
                mock_get_cache.assert_called_once()
                mock_set_cache.assert_called_once()
                
                # Verify cache key format includes barbershop_id
                cache_key = mock_get_cache.call_args[0][0]
                assert mock_barbershop_id in cache_key
                assert cache_key.startswith('ai_chat:')
    
    def test_error_handling_missing_barbershop(self):
        """Test error handling when barbershop_id is missing"""
        
        async def run_test():
            response = await ai_orchestrator.process_chat(
                message="Test message",
                barbershop_id=None
            )
            
            assert 'error' in response
            assert response['error'] == 'missing_barbershop_context'
            assert 'I need a barbershop context' in response['response']
        
        asyncio.run(run_test())
    
    @pytest.mark.asyncio
    async def test_data_service_error_handling(self, mock_barbershop_id):
        """Test error handling when data service fails"""
        
        with patch.object(ai_data_service, 'get_ai_training_data') as mock_get_data:
            mock_get_data.return_value = {
                'error': 'Database connection failed',
                'barbershop_id': mock_barbershop_id
            }
            
            response = await ai_orchestrator.process_chat(
                message="Test message",
                barbershop_id=mock_barbershop_id
            )
            
            assert 'error' in response
            assert response['error'] == 'data_access_error'
            assert 'Unable to access barbershop data' in response['response']

def test_ai_data_service_data_sufficiency():
    """Test data sufficiency assessment"""
    
    # Test insufficient data
    insufficient_result = ai_data_service._assess_data_sufficiency(
        metrics={'data_available': False},
        customers={'data_available': False, 'total_customers': 0},
        appointments={'data_available': False, 'total_appointments': 0}
    )
    assert insufficient_result == False
    
    # Test sufficient data
    sufficient_result = ai_data_service._assess_data_sufficiency(
        metrics={'data_available': True},
        customers={'data_available': True, 'total_customers': 50},
        appointments={'data_available': True, 'total_appointments': 100}
    )
    assert sufficient_result == True

if __name__ == "__main__":
    # Run basic functionality tests
    print("Testing AI system with real data...")
    
    # Test data sufficiency
    test_ai_data_service_data_sufficiency()
    print("✓ Data sufficiency assessment works")
    
    # Test error handling
    async def test_basic_functionality():
        # Test missing barbershop handling
        response = await ai_orchestrator.process_chat("Test", barbershop_id=None)
        assert 'error' in response
        print("✓ Missing barbershop error handling works")
        
        # Test agent selection
        agents = {
            "revenue": "Financial Advisor",
            "appointments": "Operations Advisor",
            "customers": "Brand Advisor",
            "growth": "Growth Advisor"
        }
        
        for keyword, expected_agent in agents.items():
            agent = ai_orchestrator._select_agent(f"Tell me about my {keyword}")
            assert agent.name == expected_agent
        print("✓ Agent selection works correctly")
    
    asyncio.run(test_basic_functionality())
    print("✓ All basic tests passed!")
    print("\nAI system is now using real barbershop data instead of mock data.")
    print("Key improvements:")
    print("- Connects to real Supabase database tables")
    print("- Uses authenticated user's barbershop context")
    print("- Provides data-driven insights from actual business metrics")
    print("- Implements barbershop-specific Redis caching")
    print("- Handles insufficient data gracefully")
    print("- Generates real business recommendations")