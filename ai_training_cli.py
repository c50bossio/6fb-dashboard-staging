#!/usr/bin/env python3
"""
AI Training CLI - Manage your barbershop AI knowledge and fine-tuning
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import List, Dict, Any

# Add services to path
sys.path.append('services')
from ai_training_service import AITrainingService
from vector_rag_service import VectorRAGService, setup_rag_knowledge

class AITrainingCLI:
    def __init__(self):
        self.training_service = AITrainingService()
        self.rag_service = VectorRAGService()
        
    def add_knowledge(self, args):
        """Add knowledge to the system"""
        if args.file:
            # Import from file
            try:
                count = self.rag_service.import_from_file(args.file, args.category)
                print(f"✅ Successfully imported {count} knowledge chunks from {args.file}")
            except Exception as e:
                print(f"❌ Error importing file: {e}")
        else:
            # Add single knowledge item
            content = args.content or input("Enter knowledge content: ")
            title = args.title or input("Enter title: ")
            
            # Add to both systems
            knowledge_id = self.training_service.add_knowledge(
                category=args.category,
                title=title,
                content=content
            )
            
            self.rag_service.add_document(content, {
                "title": title,
                "category": args.category,
                "db_id": knowledge_id
            })
            
            print(f"✅ Added knowledge: {title} (ID: {knowledge_id})")
    
    def search_knowledge(self, args):
        """Search for knowledge"""
        results = self.rag_service.search(
            query=args.query,
            category=args.category,
            n_results=args.limit
        )
        
        if not results:
            print("No matching knowledge found.")
            return
        
        print(f"\n🔍 Found {len(results)} results for '{args.query}':\n")
        
        for i, result in enumerate(results, 1):
            metadata = result['metadata']
            print(f"{i}. {metadata.get('title', 'Untitled')} ({metadata.get('category', 'general')})")
            print(f"   Similarity: {result['similarity']:.2%}")
            print(f"   Content: {result['content'][:150]}...")
            print()
    
    def list_knowledge(self, args):
        """List all knowledge by category"""
        stats = self.rag_service.get_stats()
        db_stats = self.training_service.calculate_knowledge_stats()
        
        print("\n📚 Knowledge Base Overview:\n")
        print(f"Total Documents: {stats['total_documents']}")
        print(f"Training Examples: {db_stats['training_examples']['total']}")
        print(f"Average Effectiveness: {db_stats['training_examples']['average_effectiveness']}")
        
        print("\nCategories:")
        for category, count in stats['categories'].items():
            print(f"  - {category}: {count} documents")
        
        print("\nSources:")
        for source, count in stats['sources'].items():
            print(f"  - {source}: {count} documents")
    
    def update_prompt(self, args):
        """Update custom prompt for an agent"""
        agent_id = args.agent or input("Enter agent ID (business_coach/marketing_expert/financial_advisor): ")
        
        if args.file:
            with open(args.file, 'r') as f:
                prompt_text = f.read()
        else:
            print("Enter custom prompt (press Ctrl+D when done):")
            prompt_text = sys.stdin.read()
        
        self.training_service.update_custom_prompt(
            agent_id=agent_id,
            prompt_type="system",
            prompt_text=prompt_text
        )
        
        print(f"✅ Updated prompt for {agent_id}")
    
    def export_training_data(self, args):
        """Export data for OpenAI fine-tuning"""
        output_file = args.output or f"training_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        
        # Export from SQL database
        self.training_service.export_training_data(output_file)
        
        # Also export from vector DB
        rag_output = output_file.replace('.jsonl', '_rag.jsonl')
        self.rag_service.export_for_fine_tuning(rag_output)
        
        print(f"✅ Exported training data to:")
        print(f"   - {output_file} (conversation examples)")
        print(f"   - {rag_output} (knowledge-based Q&A)")
        print(f"\n📝 Next steps for fine-tuning:")
        print(f"   1. Review and clean the data")
        print(f"   2. Combine files if needed: cat {output_file} {rag_output} > combined.jsonl")
        print(f"   3. Upload to OpenAI: openai api fine_tunes.create -t combined.jsonl -m gpt-3.5-turbo")
    
    def import_csv(self, args):
        """Import knowledge from CSV"""
        try:
            count = self.rag_service.import_from_file(args.file, args.category)
            print(f"✅ Imported {count} items from {args.file}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def init_sample_data(self, args):
        """Initialize with sample barbershop data"""
        print("🚀 Initializing sample barbershop knowledge...")
        
        # Setup RAG knowledge
        setup_rag_knowledge()
        
        # Add sample prompts
        prompts = {
            "business_coach": """You are an experienced barbershop business coach. 
Your barbershop uses the following pricing: Haircut $25, Beard $15, Combo $35.
Always provide specific, actionable advice based on real barbershop experience.
Be friendly but professional, and focus on practical solutions.""",
            
            "marketing_expert": """You are a barbershop marketing specialist.
You know that social media works best with before/after photos, Tuesday/Wednesday promotions help fill slow days,
and referral programs with $5 rewards are highly effective. Always suggest proven strategies.""",
            
            "financial_advisor": """You are a financial advisor for barbershops.
You understand the importance of tracking service profitability, managing inventory costs,
and optimizing pricing. Average ticket should be $35-40. Focus on improving margins and cash flow."""
        }
        
        for agent_id, prompt in prompts.items():
            self.training_service.update_custom_prompt(agent_id, "system", prompt)
        
        print("✅ Sample data initialized successfully!")
        print("\n💡 Try these commands:")
        print("   python ai_training_cli.py search 'pricing'")
        print("   python ai_training_cli.py list")
        print("   python ai_training_cli.py export")

def main():
    parser = argparse.ArgumentParser(
        description="AI Training CLI - Manage your barbershop AI knowledge",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s add -c pricing -t "Weekend Rates" -content "Saturday premium: +$5"
  %(prog)s add -f pricing_guide.json -c pricing
  %(prog)s search "haircut price"
  %(prog)s list
  %(prog)s prompt -a business_coach -f custom_prompt.txt
  %(prog)s export -o training_data.jsonl
  %(prog)s init
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Add knowledge command
    add_parser = subparsers.add_parser('add', help='Add knowledge to the system')
    add_parser.add_argument('-c', '--category', default='general', 
                          choices=['pricing', 'policies', 'services', 'marketing', 'operations', 'general'],
                          help='Knowledge category')
    add_parser.add_argument('-t', '--title', help='Knowledge title')
    add_parser.add_argument('-content', '--content', help='Knowledge content')
    add_parser.add_argument('-f', '--file', help='Import from file (JSON, CSV, TXT, MD)')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search knowledge base')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('-c', '--category', help='Filter by category')
    search_parser.add_argument('-l', '--limit', type=int, default=5, help='Number of results')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List knowledge statistics')
    
    # Update prompt command
    prompt_parser = subparsers.add_parser('prompt', help='Update agent custom prompt')
    prompt_parser.add_argument('-a', '--agent', help='Agent ID')
    prompt_parser.add_argument('-f', '--file', help='Read prompt from file')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export training data for fine-tuning')
    export_parser.add_argument('-o', '--output', help='Output file path')
    
    # Import CSV command
    import_parser = subparsers.add_parser('import', help='Import knowledge from CSV')
    import_parser.add_argument('file', help='CSV file path')
    import_parser.add_argument('-c', '--category', default='general', help='Category for imported data')
    
    # Initialize command
    init_parser = subparsers.add_parser('init', help='Initialize with sample data')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Execute command
    cli = AITrainingCLI()
    command_map = {
        'add': cli.add_knowledge,
        'search': cli.search_knowledge,
        'list': cli.list_knowledge,
        'prompt': cli.update_prompt,
        'export': cli.export_training_data,
        'import': cli.import_csv,
        'init': cli.init_sample_data
    }
    
    command_func = command_map.get(args.command)
    if command_func:
        try:
            command_func(args)
        except KeyboardInterrupt:
            print("\n\nOperation cancelled.")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()