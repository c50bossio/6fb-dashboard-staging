# 🎓 AI Training & RAG System Guide

## Overview
Your 6FB AI Agent System now includes a complete AI training infrastructure with:
- **Vector RAG (Retrieval Augmented Generation)** using ChromaDB
- **Knowledge Base Management** with semantic search
- **CLI Tools** for easy management
- **OpenAI Fine-tuning** export capabilities

## 🚀 Quick Start

### 1. Initialize with Sample Data
```bash
cd "6FB AI Agent System"
python ai_training_cli.py init
```

### 2. Add Your Business Knowledge
```bash
# Add single knowledge item
python ai_training_cli.py add -c pricing -t "Holiday Special" -content "20% off all services in December"

# Import from CSV
python ai_training_cli.py import data/knowledge/sample_pricing.csv -c pricing

# Import from JSON
python ai_training_cli.py add -f knowledge.json -c policies
```

### 3. Search Your Knowledge
```bash
# Search all categories
python ai_training_cli.py search "haircut price"

# Search specific category
python ai_training_cli.py search "cancellation" -c policies
```

## 📚 Knowledge Categories

- **pricing**: Service prices, packages, discounts
- **policies**: Booking, cancellation, payment policies  
- **services**: Service descriptions and details
- **marketing**: Campaigns, strategies, promotions
- **operations**: Procedures, standards, protocols
- **general**: Everything else

## 🤖 How RAG Works

1. **User asks question** → "How much is a beard trim?"
2. **Vector search** → Finds similar content in your knowledge base
3. **Context injection** → Adds relevant info to the AI prompt
4. **Smart response** → AI answers using YOUR specific information

## 🔧 Advanced Usage

### Custom Prompts for Each Agent
```bash
# Create a prompt file
echo "You are a friendly barbershop assistant. Our shop specializes in modern cuts and traditional shaves." > prompt.txt

# Update agent
python ai_training_cli.py prompt -a business_coach -f prompt.txt
```

### Import Various File Types
```bash
# CSV with your pricing
python ai_training_cli.py import pricing.csv -c pricing

# JSON with policies
python ai_training_cli.py add -f policies.json -c policies

# Markdown documentation
python ai_training_cli.py add -f employee_handbook.md -c operations

# Text files
python ai_training_cli.py add -f service_descriptions.txt -c services
```

### Export for Fine-tuning
```bash
# Export all training data
python ai_training_cli.py export -o my_training_data.jsonl

# This creates two files:
# - my_training_data.jsonl (conversation examples)
# - my_training_data_rag.jsonl (knowledge Q&A pairs)
```

## 🎯 OpenAI Fine-tuning

### Prerequisites
```bash
pip install openai
export OPENAI_API_KEY="your-api-key"
```

### Fine-tune Process
```bash
# 1. Export your data
python ai_training_cli.py export -o training.jsonl

# 2. Validate the data
openai tools fine_tunes.prepare_data -f training.jsonl

# 3. Start fine-tuning
openai api fine_tunes.create \
  -t training.jsonl \
  -m gpt-3.5-turbo \
  --suffix "barbershop"

# 4. Monitor progress
openai api fine_tunes.follow -i <FINE_TUNE_JOB_ID>

# 5. Use your model
# Update OPENAI_MODEL in .env to your fine-tuned model ID
```

## 📊 Web UI Usage

### Access AI Training Dashboard
1. Go to `http://localhost:9999/dashboard/ai-training`
2. Use the web interface to:
   - Add knowledge items
   - View training examples
   - Update AI personality

### API Endpoints
- `POST /api/v1/ai/knowledge` - Add knowledge
- `GET /api/v1/ai/knowledge` - List knowledge
- `POST /api/v1/ai/training-example` - Add training example
- `POST /api/v1/ai/custom-prompt` - Update prompts
- `GET /api/v1/ai/stats` - Get statistics

## 💡 Best Practices

### 1. Structure Your Knowledge
```json
{
  "title": "Weekend Pricing",
  "category": "pricing",
  "content": "Saturday and Sunday: All services +$5. Premium time slots."
}
```

### 2. Use Specific Examples
Instead of: "We offer discounts"
Use: "Senior discount: 10% off all services for 65+"

### 3. Regular Updates
- Export successful conversations as training examples
- Update knowledge when policies change
- Review and refine AI responses

### 4. Category Guidelines
- **Pricing**: Exact prices, packages, discounts
- **Policies**: Clear rules and procedures
- **Services**: Detailed descriptions
- **Marketing**: Proven campaigns and strategies
- **Operations**: Step-by-step procedures

## 🔍 Troubleshooting

### Issue: AI not using my knowledge
```bash
# Check if knowledge is indexed
python ai_training_cli.py list

# Search for specific content
python ai_training_cli.py search "your content"

# Rebuild vector database if needed
rm -rf data/vector_db
python ai_training_cli.py init
```

### Issue: Poor search results
- Use more specific search terms
- Check similarity threshold (default 0.7)
- Ensure content is properly categorized

### Issue: Export has no data
- Add training examples first
- Mark successful conversations in the UI
- Check database permissions

## 📈 Monitoring & Analytics

### View Statistics
```bash
python ai_training_cli.py list
```

Shows:
- Total documents
- Documents per category
- Training examples count
- Average effectiveness score

### Database Locations
- SQL Database: `data/6fb_agent_system.db`
- Vector Database: `data/vector_db/`
- Exports: Current directory or specified path

## 🚀 Production Tips

1. **Backup your data**
   ```bash
   cp -r data/ data_backup_$(date +%Y%m%d)
   ```

2. **Use environment variables**
   ```bash
   export OPENAI_API_KEY="sk-..."
   export CUSTOM_PROMPT_PATH="/path/to/prompts/"
   ```

3. **Monitor usage**
   - Track which knowledge gets accessed most
   - Review chat logs for improvement areas
   - Update based on customer feedback

## 🎉 Next Steps

1. **Import your real data** - Pricing, policies, services
2. **Customize prompts** - Match your brand voice
3. **Train from success** - Mark helpful conversations
4. **Fine-tune when ready** - Create your custom model
5. **Monitor and improve** - Continuous learning

Remember: The more specific knowledge you add, the better your AI becomes at representing YOUR business!