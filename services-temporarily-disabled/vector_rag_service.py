"""
Vector RAG (Retrieval Augmented Generation) Service
Implements semantic search using ChromaDB for intelligent knowledge retrieval
"""

import os
import json
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import openai
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

class VectorRAGService:
    def __init__(self, persist_directory="data/vector_db", collection_name="barbershop_knowledge"):
        """Initialize RAG service with ChromaDB and embedding model"""
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        
        # Initialize ChromaDB client with persistence
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection
        try:
            self.collection = self.client.get_collection(collection_name)
        except:
            self.collection = self.client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        # Initialize text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Categories for organizing knowledge
        self.categories = {
            "pricing": "Service pricing and package deals",
            "policies": "Business policies and procedures",
            "services": "Service descriptions and details",
            "marketing": "Marketing strategies and campaigns",
            "operations": "Operational procedures and standards",
            "training": "Staff training and protocols",
            "faqs": "Frequently asked questions",
            "reviews": "Customer feedback and testimonials"
        }
    
    def generate_id(self, content: str, metadata: Dict) -> str:
        """Generate unique ID for document"""
        unique_string = f"{content}{json.dumps(metadata, sort_keys=True)}"
        return hashlib.md5(unique_string.encode()).hexdigest()
    
    def add_document(self, content: str, metadata: Dict[str, Any]) -> List[str]:
        """Add document to vector database with automatic chunking"""
        # Ensure required metadata
        metadata.setdefault("category", "general")
        metadata.setdefault("added_at", datetime.now().isoformat())
        metadata.setdefault("source", "manual")
        
        # Split content into chunks
        chunks = self.text_splitter.split_text(content)
        
        # Prepare documents for insertion
        ids = []
        documents = []
        metadatas = []
        
        for i, chunk in enumerate(chunks):
            chunk_metadata = metadata.copy()
            chunk_metadata["chunk_index"] = i
            chunk_metadata["total_chunks"] = len(chunks)
            
            doc_id = self.generate_id(chunk, chunk_metadata)
            ids.append(doc_id)
            documents.append(chunk)
            metadatas.append(chunk_metadata)
        
        # Add to ChromaDB
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        
        return ids
    
    def add_knowledge_batch(self, knowledge_items: List[Dict[str, Any]]) -> int:
        """Add multiple knowledge items at once"""
        total_added = 0
        
        for item in knowledge_items:
            content = item.get("content", "")
            metadata = {
                "title": item.get("title", "Untitled"),
                "category": item.get("category", "general"),
                "source": item.get("source", "batch_import")
            }
            
            # Add any extra metadata
            for key, value in item.items():
                if key not in ["content", "title", "category", "source"]:
                    metadata[key] = value
            
            ids = self.add_document(content, metadata)
            total_added += len(ids)
        
        return total_added
    
    def search(self, query: str, category: Optional[str] = None, 
              n_results: int = 5, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search for relevant documents using semantic similarity"""
        
        # Build where clause for filtering
        where = {}
        if category:
            where["category"] = category
        
        # Perform search
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where if where else None
        )
        
        # Format results
        formatted_results = []
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                # Calculate similarity score (1 - distance)
                distance = results['distances'][0][i] if results['distances'] else 0
                similarity = 1 - distance
                
                # Only include results above threshold
                if similarity >= threshold:
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'similarity': similarity
                    })
        
        return formatted_results
    
    def generate_context(self, query: str, category: Optional[str] = None,
                        max_context_length: int = 2000) -> str:
        """Generate context for LLM based on query"""
        # Search for relevant documents
        results = self.search(query, category, n_results=10)
        
        if not results:
            return ""
        
        # Build context from results
        context_parts = []
        total_length = 0
        
        for result in results:
            metadata = result['metadata']
            content = result['content']
            
            # Format each piece of context
            if metadata.get('title'):
                context_part = f"[{metadata['title']}]: {content}"
            else:
                context_part = content
            
            # Check if adding this would exceed max length
            if total_length + len(context_part) > max_context_length:
                break
            
            context_parts.append(context_part)
            total_length += len(context_part)
        
        return "\n\n".join(context_parts)
    
    def import_from_file(self, file_path: str, category: str = "general") -> int:
        """Import knowledge from various file types"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension == '.json':
            return self._import_json(file_path, category)
        elif file_extension == '.csv':
            return self._import_csv(file_path, category)
        elif file_extension in ['.txt', '.md']:
            return self._import_text(file_path, category)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    
    def _import_json(self, file_path: str, category: str) -> int:
        """Import from JSON file"""
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            knowledge_items = data
        elif isinstance(data, dict):
            knowledge_items = [data]
        else:
            raise ValueError("JSON must contain object or array of objects")
        
        # Ensure category is set
        for item in knowledge_items:
            item.setdefault('category', category)
        
        return self.add_knowledge_batch(knowledge_items)
    
    def _import_csv(self, file_path: str, category: str) -> int:
        """Import from CSV file"""
        import csv
        
        knowledge_items = []
        with open(file_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Combine all fields into content
                content_parts = []
                metadata = {"category": category, "source": "csv"}
                
                for key, value in row.items():
                    if value:
                        content_parts.append(f"{key}: {value}")
                        metadata[key.lower().replace(' ', '_')] = value
                
                knowledge_items.append({
                    "content": "\n".join(content_parts),
                    "title": row.get('title', row.get('name', 'CSV Import')),
                    "category": category,
                    **metadata
                })
        
        return self.add_knowledge_batch(knowledge_items)
    
    def _import_text(self, file_path: str, category: str) -> int:
        """Import from text or markdown file"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        # For markdown, try to extract sections
        if file_path.endswith('.md'):
            sections = self._parse_markdown_sections(content)
            if sections:
                return self.add_knowledge_batch([
                    {
                        "content": section['content'],
                        "title": section['title'],
                        "category": category
                    }
                    for section in sections
                ])
        
        # Otherwise, add as single document
        ids = self.add_document(content, {
            "title": os.path.basename(file_path),
            "category": category,
            "source": "text_file"
        })
        return len(ids)
    
    def _parse_markdown_sections(self, content: str) -> List[Dict[str, str]]:
        """Parse markdown into sections based on headers"""
        sections = []
        current_section = None
        
        for line in content.split('\n'):
            if line.startswith('#'):
                # Save previous section
                if current_section and current_section['content'].strip():
                    sections.append(current_section)
                
                # Start new section
                title = line.lstrip('#').strip()
                current_section = {
                    'title': title,
                    'content': ''
                }
            elif current_section:
                current_section['content'] += line + '\n'
        
        # Save last section
        if current_section and current_section['content'].strip():
            sections.append(current_section)
        
        return sections
    
    def update_document(self, doc_id: str, new_content: str, new_metadata: Dict = None):
        """Update existing document"""
        # Get existing document
        existing = self.collection.get(ids=[doc_id])
        
        if not existing['ids']:
            raise ValueError(f"Document {doc_id} not found")
        
        # Prepare update
        metadata = existing['metadatas'][0] if existing['metadatas'] else {}
        if new_metadata:
            metadata.update(new_metadata)
        metadata['updated_at'] = datetime.now().isoformat()
        
        # Update in collection
        self.collection.update(
            ids=[doc_id],
            documents=[new_content],
            metadatas=[metadata]
        )
    
    def delete_documents(self, ids: List[str]):
        """Delete documents by IDs"""
        self.collection.delete(ids=ids)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector database"""
        # Get all documents to calculate stats
        all_docs = self.collection.get()
        
        stats = {
            "total_documents": len(all_docs['ids']) if all_docs['ids'] else 0,
            "categories": {},
            "sources": {},
            "last_updated": None
        }
        
        if all_docs['metadatas']:
            for metadata in all_docs['metadatas']:
                # Count by category
                category = metadata.get('category', 'unknown')
                stats['categories'][category] = stats['categories'].get(category, 0) + 1
                
                # Count by source
                source = metadata.get('source', 'unknown')
                stats['sources'][source] = stats['sources'].get(source, 0) + 1
                
                # Track last update
                updated_at = metadata.get('updated_at') or metadata.get('added_at')
                if updated_at and (not stats['last_updated'] or updated_at > stats['last_updated']):
                    stats['last_updated'] = updated_at
        
        return stats
    
    def export_for_fine_tuning(self, output_path: str, min_similarity: float = 0.8):
        """Export high-quality Q&A pairs for OpenAI fine-tuning"""
        # Get all documents
        all_docs = self.collection.get()
        
        if not all_docs['ids']:
            print("No documents found in vector database")
            return
        
        # Prepare training examples
        training_data = []
        
        # Group documents by category for context
        category_docs = {}
        for i, doc_id in enumerate(all_docs['ids']):
            metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
            category = metadata.get('category', 'general')
            
            if category not in category_docs:
                category_docs[category] = []
            
            category_docs[category].append({
                'content': all_docs['documents'][i],
                'metadata': metadata
            })
        
        # Generate Q&A pairs for each category
        for category, docs in category_docs.items():
            # Create sample questions for this category
            if category == "pricing":
                questions = [
                    "What are your prices?",
                    "How much does a haircut cost?",
                    "Do you have any package deals?"
                ]
            elif category == "policies":
                questions = [
                    "What is your cancellation policy?",
                    "How do I book an appointment?",
                    "What are your payment methods?"
                ]
            elif category == "services":
                questions = [
                    "What services do you offer?",
                    "Do you do beard trims?",
                    "What's included in a premium cut?"
                ]
            else:
                questions = [
                    f"Tell me about your {category}",
                    f"What should I know about {category}?"
                ]
            
            # For each question, use the relevant docs as context
            for question in questions:
                context = "\n".join([d['content'] for d in docs[:3]])  # Use top 3 docs
                
                training_data.append({
                    "messages": [
                        {"role": "system", "content": "You are a helpful barbershop assistant with access to specific business information."},
                        {"role": "user", "content": question},
                        {"role": "assistant", "content": f"Based on our {category} information: {context}"}
                    ]
                })
        
        # Write to JSONL format for OpenAI
        with open(output_path, 'w') as f:
            for item in training_data:
                f.write(json.dumps(item) + '\n')
        
        print(f"Exported {len(training_data)} training examples to {output_path}")

# Helper class for enhanced prompting with RAG
class RAGEnhancedPrompt:
    def __init__(self, rag_service: VectorRAGService):
        self.rag = rag_service
    
    def enhance_prompt(self, user_query: str, agent_type: str = "general") -> str:
        """Enhance user prompt with relevant context from vector DB"""
        
        # Map agent types to relevant categories
        category_mapping = {
            "business_coach": ["operations", "policies", "training"],
            "marketing_expert": ["marketing", "reviews", "services"],
            "financial_advisor": ["pricing", "services", "policies"],
            "general": None  # Search all categories
        }
        
        category = category_mapping.get(agent_type)
        
        # Get relevant context
        context = self.rag.generate_context(user_query, category)
        
        if context:
            enhanced_prompt = f"""User Question: {user_query}

Relevant Business Information:
{context}

Please provide a helpful response based on the above business information."""
        else:
            enhanced_prompt = user_query
        
        return enhanced_prompt

# Example initialization function
def setup_rag_knowledge():
    """Initialize RAG with sample barbershop knowledge"""
    rag = VectorRAGService()
    
    # Add sample knowledge
    sample_knowledge = [
        {
            "title": "Basic Pricing",
            "category": "pricing",
            "content": """
            Our standard pricing:
            - Men's Haircut: $25
            - Beard Trim: $15
            - Hair & Beard Combo: $35 (save $5)
            - Kids Cut (under 12): $18
            - Senior Discount: 10% off all services
            """
        },
        {
            "title": "Booking Policy",
            "category": "policies",
            "content": """
            Booking and Cancellation Policy:
            - Online booking available 24/7
            - Walk-ins welcome based on availability
            - 24-hour cancellation notice required
            - No-shows may be charged 50% of service price
            - Appointments held for 10 minutes past scheduled time
            """
        },
        {
            "title": "Premium Services",
            "category": "services",
            "content": """
            Premium Service Options:
            - Hot Towel Shave: Traditional straight razor shave with hot towel treatment ($30)
            - Executive Package: Haircut, beard trim, hot towel, and scalp massage ($60)
            - VIP Treatment: Full service with priority booking and complimentary products ($75)
            """
        },
        {
            "title": "Marketing Success",
            "category": "marketing",
            "content": """
            Proven Marketing Strategies:
            - Tuesday/Wednesday 20% off promotions fill slow days
            - Loyalty card program: 10th service free
            - Referral rewards: $5 off for both referrer and new customer
            - Social media: Before/after photos get highest engagement
            - Email campaigns: 68% open rate for appointment reminders
            """
        }
    ]
    
    # Add to vector DB
    total = rag.add_knowledge_batch(sample_knowledge)
    print(f"Added {total} knowledge chunks to vector database")
    
    # Show stats
    stats = rag.get_stats()
    print(f"Vector DB Stats: {json.dumps(stats, indent=2)}")
    
    return rag

if __name__ == "__main__":
    # Initialize with sample data
    rag_service = setup_rag_knowledge()
    
    # Test search
    results = rag_service.search("How much for a haircut?", category="pricing")
    print("\nSearch Results:")
    for result in results:
        print(f"- {result['content'][:100]}... (similarity: {result['similarity']:.2f})")