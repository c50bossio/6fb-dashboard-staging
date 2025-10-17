#!/usr/bin/env python3
"""
LlamaIndex Vector Store Service
Provides RAG (Retrieval Augmented Generation) capabilities for the 6FB AI Agent System
Uses Supabase pgvector for efficient semantic search
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Document,
    StorageContext,
    ServiceContext,
    Settings
)
from llama_index.vector_stores.supabase import SupabaseVectorStore
from llama_index.llms.openai import OpenAI as LlamaOpenAI
from llama_index.llms.anthropic import Anthropic as LlamaAnthropic
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.indices.query.schema import QueryBundle

from supabase import create_client, Client
import numpy as np

logger = logging.getLogger(__name__)

class VectorStoreService:
    """
    Manages vector embeddings and semantic search for business data
    """
    
    def __init__(self):
        """Initialize the vector store service with Supabase"""
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("Supabase credentials not configured")
        
        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Configure LlamaIndex settings
        Settings.llm = LlamaOpenAI(
            model="gpt-4o-mini",
            api_key=self.openai_api_key,
            temperature=0.7
        )
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-3-small",
            api_key=self.openai_api_key
        )
        Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)
        
        # Initialize vector stores for different data types
        self.vector_stores = {}
        self.indices = {}
        
        # Set up vector stores
        self._initialize_vector_stores()
    
    def _initialize_vector_stores(self):
        """Initialize vector stores for different data collections"""
        
        collections = [
            "customers",
            "services", 
            "appointments",
            "products",
            "analytics",
            "knowledge_base"
        ]
        
        for collection in collections:
            try:
                # Create vector store for each collection
                vector_store = SupabaseVectorStore(
                    postgres_connection_string=self._get_connection_string(),
                    collection_name=f"vector_{collection}",
                    dimension=1536  # OpenAI embedding dimension
                )
                
                self.vector_stores[collection] = vector_store
                
                # Create index
                storage_context = StorageContext.from_defaults(
                    vector_store=vector_store
                )
                
                # Initialize with empty index (will be populated later)
                self.indices[collection] = VectorStoreIndex(
                    [],
                    storage_context=storage_context
                )
                
                logger.info(f"Initialized vector store for {collection}")
                
            except Exception as e:
                logger.error(f"Failed to initialize vector store for {collection}: {e}")
    
    def _get_connection_string(self):
        """Get PostgreSQL connection string from Supabase URL"""
        # Parse Supabase URL to get database connection details
        # Format: postgresql://user:password@host:port/database
        
        # This is a simplified version - in production, parse the actual URL
        # For now, use environment variable if available
        pg_url = os.getenv("SUPABASE_DB_URL")
        if pg_url:
            return pg_url
        
        # Fallback to constructing from Supabase URL
        # Note: This requires additional configuration in production
        return f"postgresql://postgres:{self.supabase_key}@db.{self.supabase_url.split('//')[1].split('.')[0]}.supabase.co:5432/postgres"
    
    async def index_customer_data(self, barbershop_id: str):
        """Index customer data for a barbershop"""
        try:
            # Fetch customers from database
            response = self.supabase.table('customers').select('*').eq('barbershop_id', barbershop_id).execute()
            customers = response.data
            
            # Create documents from customer data
            documents = []
            for customer in customers:
                # Create searchable text from customer data
                text = f"""
                Customer: {customer.get('name', 'Unknown')}
                Email: {customer.get('email', '')}
                Phone: {customer.get('phone', '')}
                Notes: {customer.get('notes', '')}
                Last Visit: {customer.get('last_visit', '')}
                Total Visits: {customer.get('visit_count', 0)}
                Preferred Services: {customer.get('preferred_services', '')}
                Loyalty Points: {customer.get('loyalty_points', 0)}
                """
                
                doc = Document(
                    text=text,
                    metadata={
                        'customer_id': customer['id'],
                        'barbershop_id': barbershop_id,
                        'name': customer.get('name'),
                        'type': 'customer'
                    }
                )
                documents.append(doc)
            
            # Index documents
            if documents:
                self.indices['customers'].insert_nodes(documents)
                logger.info(f"Indexed {len(documents)} customers for barbershop {barbershop_id}")
            
            return len(documents)
            
        except Exception as e:
            logger.error(f"Failed to index customer data: {e}")
            raise
    
    async def index_service_data(self, barbershop_id: str):
        """Index service data for a barbershop"""
        try:
            # Fetch services from database
            response = self.supabase.table('services').select('*').eq('shop_id', barbershop_id).execute()
            services = response.data
            
            # Create documents from service data
            documents = []
            for service in services:
                text = f"""
                Service: {service.get('name', 'Unknown')}
                Category: {service.get('category', '')}
                Description: {service.get('description', '')}
                Price: ${service.get('price', 0)}
                Duration: {service.get('duration_minutes', 30)} minutes
                Popular: {'Yes' if service.get('is_popular') else 'No'}
                Requirements: {service.get('requirements', '')}
                """
                
                doc = Document(
                    text=text,
                    metadata={
                        'service_id': service['id'],
                        'barbershop_id': barbershop_id,
                        'name': service.get('name'),
                        'price': service.get('price'),
                        'type': 'service'
                    }
                )
                documents.append(doc)
            
            # Index documents
            if documents:
                self.indices['services'].insert_nodes(documents)
                logger.info(f"Indexed {len(documents)} services for barbershop {barbershop_id}")
            
            return len(documents)
            
        except Exception as e:
            logger.error(f"Failed to index service data: {e}")
            raise
    
    async def index_appointment_data(self, barbershop_id: str):
        """Index appointment history for analytics and insights"""
        try:
            # Fetch recent appointments
            response = self.supabase.table('appointments').select('*').eq('barbershop_id', barbershop_id).limit(1000).execute()
            appointments = response.data
            
            # Create documents from appointment data
            documents = []
            for apt in appointments:
                text = f"""
                Appointment Date: {apt.get('date', '')}
                Time: {apt.get('time', '')}
                Service: {apt.get('service_name', '')}
                Barber: {apt.get('barber_name', '')}
                Customer: {apt.get('customer_name', '')}
                Status: {apt.get('status', '')}
                Notes: {apt.get('notes', '')}
                Revenue: ${apt.get('price', 0)}
                """
                
                doc = Document(
                    text=text,
                    metadata={
                        'appointment_id': apt['id'],
                        'barbershop_id': barbershop_id,
                        'date': apt.get('date'),
                        'status': apt.get('status'),
                        'type': 'appointment'
                    }
                )
                documents.append(doc)
            
            # Index documents
            if documents:
                self.indices['appointments'].insert_nodes(documents)
                logger.info(f"Indexed {len(documents)} appointments for barbershop {barbershop_id}")
            
            return len(documents)
            
        except Exception as e:
            logger.error(f"Failed to index appointment data: {e}")
            raise
    
    async def search(self, query: str, collection: str = 'customers', top_k: int = 5, barbershop_id: str = None) -> List[Dict[str, Any]]:
        """
        Perform semantic search on indexed data
        
        Args:
            query: Search query
            collection: Which collection to search
            top_k: Number of results to return
            barbershop_id: Filter by barbershop (optional)
        
        Returns:
            List of relevant documents with metadata
        """
        try:
            if collection not in self.indices:
                raise ValueError(f"Collection {collection} not found")
            
            # Create retriever
            retriever = VectorIndexRetriever(
                index=self.indices[collection],
                similarity_top_k=top_k
            )
            
            # Perform search
            query_bundle = QueryBundle(query_str=query)
            nodes = retriever.retrieve(query_bundle)
            
            # Filter by barbershop if specified
            results = []
            for node in nodes:
                if barbershop_id and node.metadata.get('barbershop_id') != barbershop_id:
                    continue
                
                results.append({
                    'text': node.text,
                    'score': node.score,
                    'metadata': node.metadata
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    async def query_with_context(self, query: str, collection: str = 'customers', barbershop_id: str = None) -> str:
        """
        Query with RAG - retrieves context and generates response
        
        Args:
            query: User query
            collection: Which collection to search
            barbershop_id: Filter by barbershop (optional)
        
        Returns:
            AI-generated response with context
        """
        try:
            # Get relevant context
            context_docs = await self.search(query, collection, top_k=3, barbershop_id=barbershop_id)
            
            # Build context string
            context = "\n\n".join([doc['text'] for doc in context_docs])
            
            # Create query engine
            query_engine = self.indices[collection].as_query_engine()
            
            # Generate response with context
            response = query_engine.query(
                f"Context:\n{context}\n\nQuestion: {query}"
            )
            
            return str(response)
            
        except Exception as e:
            logger.error(f"Query with context failed: {e}")
            return f"I encountered an error while searching for information: {str(e)}"
    
    async def get_analytics_insights(self, barbershop_id: str, query: str) -> Dict[str, Any]:
        """
        Get analytics insights using RAG on business data
        
        Args:
            barbershop_id: Barbershop to analyze
            query: Analytics query
        
        Returns:
            Analytics insights and recommendations
        """
        try:
            # Search across multiple collections for comprehensive insights
            customer_context = await self.search(query, 'customers', top_k=3, barbershop_id=barbershop_id)
            appointment_context = await self.search(query, 'appointments', top_k=3, barbershop_id=barbershop_id)
            service_context = await self.search(query, 'services', top_k=2, barbershop_id=barbershop_id)
            
            # Combine context
            all_context = {
                'customers': customer_context,
                'appointments': appointment_context,
                'services': service_context
            }
            
            # Generate insights using LLM with context
            context_text = f"""
            Customer Data: {customer_context}
            Appointment History: {appointment_context}
            Service Information: {service_context}
            """
            
            # Use analytics-focused prompt
            prompt = f"""
            As a business analytics expert, analyze the following barbershop data and provide insights:
            
            {context_text}
            
            Query: {query}
            
            Provide:
            1. Key findings
            2. Trends identified
            3. Actionable recommendations
            4. Potential opportunities
            """
            
            # Generate insights
            llm = LlamaOpenAI(model="gpt-4o", temperature=0.3)
            response = llm.complete(prompt)
            
            return {
                'insights': str(response),
                'context_used': all_context,
                'query': query,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate analytics insights: {e}")
            return {
                'error': str(e),
                'insights': 'Unable to generate insights at this time'
            }
    
    async def update_index(self, barbershop_id: str):
        """Update all indices for a barbershop"""
        try:
            tasks = [
                self.index_customer_data(barbershop_id),
                self.index_service_data(barbershop_id),
                self.index_appointment_data(barbershop_id)
            ]
            
            results = await asyncio.gather(*tasks)
            
            return {
                'customers_indexed': results[0],
                'services_indexed': results[1],
                'appointments_indexed': results[2],
                'total': sum(results)
            }
            
        except Exception as e:
            logger.error(f"Failed to update indices: {e}")
            raise

# Singleton instance
vector_service = None

def get_vector_service() -> VectorStoreService:
    """Get or create the vector store service singleton"""
    global vector_service
    if vector_service is None:
        vector_service = VectorStoreService()
    return vector_service