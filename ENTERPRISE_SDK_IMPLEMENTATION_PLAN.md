# 🚀 Enterprise SDK Implementation Plan - 6FB AI Agent System

## Overview
Transform the 6FB AI Agent System from SQLite/basic auth to enterprise-grade infrastructure using modern SDKs. Total timeline: 4 weeks.

## 🎯 Implementation Philosophy
- **Incremental Migration**: Keep the app running while upgrading
- **Feature Parity First**: Ensure existing features work before adding new ones
- **Cost Conscious**: Start with free tiers, scale as needed
- **Developer Experience**: Modern tooling for faster development

---

## 📅 Phase 1: Foundation (Week 1)
**Goal**: Replace SQLite with Supabase, add error tracking

### Day 1-3: Supabase Setup
```bash
# 1. Install Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
pip install supabase

# 2. Create Supabase project at supabase.com
# 3. Get project URL and anon key
```

**Migration Steps**:
1. Create Supabase project
2. Convert SQLite schema to PostgreSQL:
```sql
-- In Supabase SQL editor
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  shop_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  agent_id UUID REFERENCES agents(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats" ON chat_history
  FOR SELECT USING (auth.uid() = user_id);
```

3. Create migration script:
```python
# scripts/migrate_to_supabase.py
import sqlite3
from supabase import create_client
import os

# Load existing SQLite data
sqlite_conn = sqlite3.connect('data/agent_system.db')
sqlite_conn.row_factory = sqlite3.Row

# Connect to Supabase
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Migrate users
users = sqlite_conn.execute('SELECT * FROM users').fetchall()
for user in users:
    supabase.table('users').insert({
        'email': user['email'],
        'shop_name': user['shop_name']
    }).execute()

print(f"Migrated {len(users)} users")
```

4. Update environment variables:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Day 4-5: Sentry Integration
```bash
# Install Sentry
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Setup Steps**:
1. Create Sentry project at sentry.io
2. Run setup wizard
3. Add to `next.config.js`:
```javascript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  {
    // Your existing config
  },
  {
    silent: true,
    org: "your-org",
    project: "6fb-ai-agent",
  }
);
```

4. Wrap API routes:
```javascript
// app/api/v1/agents/route.js
import * as Sentry from "@sentry/nextjs";

export async function GET(req) {
  try {
    // Your code
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

### Day 6-7: Update Auth Flow
Replace SQLite auth with Supabase Auth:

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// contexts/AuthContext.js
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signup = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  };

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 📅 Phase 2: AI & Payments (Week 2)

### Day 8-10: Vercel AI SDK
```bash
npm install ai openai
```

**Implementation**:
1. Create streaming AI endpoint:
```typescript
// app/api/ai/chat/route.ts
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, agent } = await req.json();

  // Add agent-specific context
  const systemMessage = {
    role: 'system',
    content: `You are ${agent.name}. ${agent.description}`
  };

  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    stream: true,
    messages: [systemMessage, ...messages],
  });

  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      // Save to Supabase
      await supabase.from('chat_history').insert({
        user_id: req.headers.get('user-id'),
        agent_id: agent.id,
        message: messages[messages.length - 1].content,
        response: completion,
      });
    },
  });

  return new StreamingTextResponse(stream);
}
```

2. Update frontend chat component:
```javascript
// components/AIChat.js
import { useChat } from 'ai/react';

export function AIChat({ agent }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: { agent },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={`mb-4 ${
            message.role === 'user' ? 'text-right' : 'text-left'
          }`}>
            <div className={`inline-block p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-800'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

### Day 11-14: Stripe Integration
```bash
npm install stripe @stripe/stripe-js
pip install stripe
```

**Setup Steps**:
1. Create Stripe account and get API keys
2. Create products and prices in Stripe Dashboard
3. Add backend endpoints:

```python
# services/payment_service.py
import stripe
from fastapi import APIRouter, HTTPException
from supabase import create_client

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
router = APIRouter()

@router.post('/create-checkout-session')
async def create_checkout_session(plan: str, user_id: str):
    try:
        # Get user from Supabase
        user = supabase.table('users').select('*').eq('id', user_id).single().execute()
        
        # Create Stripe customer if needed
        if not user.data.get('stripe_customer_id'):
            customer = stripe.Customer.create(
                email=user.data['email'],
                metadata={'user_id': user_id}
            )
            supabase.table('users').update({
                'stripe_customer_id': customer.id
            }).eq('id', user_id).execute()
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=[{
                'price': PLAN_PRICES[plan],  # Your Stripe price IDs
                'quantity': 1,
            }],
            mode='subscription',
            success_url='https://your-app.com/dashboard?success=true',
            cancel_url='https://your-app.com/pricing',
        )
        
        return {'checkout_url': session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post('/webhook')
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            # Update user subscription status
            supabase.table('users').update({
                'subscription_status': 'active',
                'subscription_id': session['subscription']
            }).eq('stripe_customer_id', session['customer']).execute()
            
        return {'received': True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

4. Add pricing page:
```javascript
// app/pricing/page.js
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);

export default function PricingPage() {
  const handleSubscribe = async (plan) => {
    const stripe = await stripePromise;
    
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan }),
    });
    
    const { checkout_url } = await response.json();
    window.location.href = checkout_url;
  };

  return (
    <div className="grid md:grid-cols-3 gap-8 p-8">
      <PricingCard
        title="Starter"
        price="$45"
        features={['5 AI Agents', '1,000 chats/mo', 'Email support']}
        onSubscribe={() => handleSubscribe('starter')}
      />
      <PricingCard
        title="Professional"
        price="$99"
        features={['Unlimited agents', '10,000 chats/mo', 'Priority support']}
        onSubscribe={() => handleSubscribe('professional')}
        featured
      />
      <PricingCard
        title="Enterprise"
        price="Custom"
        features={['Custom limits', 'SLA', 'Dedicated support']}
        onSubscribe={() => handleSubscribe('enterprise')}
      />
    </div>
  );
}
```

---

## 📅 Phase 3: Communication (Week 3)

### Day 15-17: Novu Notifications
```bash
npm install @novu/node @novu/notification-center
pip install novu
```

**Implementation**:
1. Create Novu account and get API key
2. Create notification templates in Novu dashboard
3. Backend integration:

```python
# services/notification_service_v2.py
from novu.api.subscriber import SubscriberApi
from novu.api.event import EventApi
from novu.config import NovuConfig

config = NovuConfig(api_key=os.getenv('NOVU_API_KEY'))
subscriber_api = SubscriberApi(config)
event_api = EventApi(config)

class NotificationService:
    async def create_subscriber(self, user_id: str, email: str, phone: str = None):
        """Create or update Novu subscriber"""
        subscriber_api.create_or_update(
            subscriber_id=user_id,
            email=email,
            phone=phone,
            data={'source': '6fb-ai-agent'}
        )
    
    async def send_notification(self, template_id: str, user_id: str, data: dict):
        """Send notification through Novu"""
        event_api.trigger(
            name=template_id,
            recipients=[user_id],
            payload=data
        )
    
    async def send_booking_confirmation(self, user_id: str, booking_data: dict):
        await self.send_notification(
            'booking-confirmation',
            user_id,
            {
                'shopName': booking_data['shop_name'],
                'date': booking_data['date'],
                'time': booking_data['time'],
                'service': booking_data['service']
            }
        )
```

4. Frontend notification center:
```javascript
// components/NotificationCenter.js
import { NovuProvider, PopoverNotificationCenter } from '@novu/notification-center';

export function NotificationCenter() {
  return (
    <NovuProvider
      subscriberId={user.id}
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID}
    >
      <PopoverNotificationCenter colorScheme="light">
        {({ unseenCount }) => (
          <button className="relative">
            <BellIcon className="h-6 w-6" />
            {unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs flex items-center justify-center">
                {unseenCount}
              </span>
            )}
          </button>
        )}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
```

### Day 18-21: Pusher Real-time
```bash
npm install pusher-js pusher
```

**Implementation**:
1. Create Pusher account and get credentials
2. Backend setup:

```python
# services/realtime_service.py
import pusher

pusher_client = pusher.Pusher(
    app_id=os.getenv('PUSHER_APP_ID'),
    key=os.getenv('PUSHER_KEY'),
    secret=os.getenv('PUSHER_SECRET'),
    cluster=os.getenv('PUSHER_CLUSTER'),
    ssl=True
)

@router.post('/agents/{agent_id}/status')
async def update_agent_status(agent_id: str, status: str):
    # Update in database
    supabase.table('agents').update({
        'status': status,
        'updated_at': 'now()'
    }).eq('id', agent_id).execute()
    
    # Broadcast to all connected clients
    pusher_client.trigger(
        f'agent-{agent_id}',
        'status-update',
        {'status': status, 'timestamp': datetime.now().isoformat()}
    )
    
    return {'success': True}
```

3. Frontend real-time updates:
```javascript
// hooks/usePusher.js
import Pusher from 'pusher-js';
import { useEffect, useState } from 'react';

export function usePusher(channelName, eventName, callback) {
  const [pusher, setPusher] = useState(null);
  
  useEffect(() => {
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    
    const channel = pusherClient.subscribe(channelName);
    channel.bind(eventName, callback);
    
    setPusher(pusherClient);
    
    return () => {
      channel.unbind(eventName, callback);
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName, eventName]);
  
  return pusher;
}

// Usage in component
export function AgentStatus({ agentId }) {
  const [status, setStatus] = useState('unknown');
  
  usePusher(`agent-${agentId}`, 'status-update', (data) => {
    setStatus(data.status);
  });
  
  return (
    <div className={`status-indicator ${status}`}>
      {status}
    </div>
  );
}
```

---

## 📅 Phase 4: Analytics & Control (Week 4)

### Day 22-24: PostHog Analytics
```bash
npm install posthog-js
```

**Implementation**:
1. Create PostHog account
2. Initialize in app:

```javascript
// app/layout.js
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // We'll do this manually
  });
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider client={posthog}>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}

// Track events
import { usePostHog } from 'posthog-js/react';

export function BookingForm() {
  const posthog = usePostHog();
  
  const handleSubmit = async (data) => {
    // Track conversion
    posthog.capture('booking_submitted', {
      service: data.service,
      value: data.price,
      agent: data.agent,
    });
    
    // Identify user traits
    posthog.identify(user.id, {
      email: user.email,
      shop_name: user.shop_name,
      total_bookings: user.bookings_count,
    });
  };
}
```

### Day 25-28: Feature Flags
```bash
npm install @vercel/flags
```

**Implementation**:
1. Define flags:

```javascript
// lib/flags.js
export const flags = {
  newDashboard: {
    key: 'new-dashboard',
    decide: async (context) => {
      // Roll out to 20% of users
      return Math.random() < 0.2;
    },
  },
  aiAgentV2: {
    key: 'ai-agent-v2',
    decide: async (context) => {
      // Enable for specific users
      const betaUsers = ['user1', 'user2'];
      return betaUsers.includes(context.user?.id);
    },
  },
};

// Usage in components
import { useFlag } from '@vercel/flags/react';

export function Dashboard() {
  const showNewDashboard = useFlag('new-dashboard');
  
  if (showNewDashboard) {
    return <NewDashboard />;
  }
  
  return <ClassicDashboard />;
}
```

---

## 🚀 Post-Implementation Checklist

### Testing
- [ ] All auth flows work with Supabase
- [ ] Payments process correctly
- [ ] Real-time updates function
- [ ] Notifications deliver
- [ ] Analytics track events
- [ ] Feature flags toggle correctly

### Performance
- [ ] Lighthouse score > 90
- [ ] First load < 3s
- [ ] API response < 200ms
- [ ] Real-time latency < 100ms

### Security
- [ ] Environment variables secured
- [ ] API routes protected
- [ ] CORS configured
- [ ] Webhooks validated

### Documentation
- [ ] API documentation updated
- [ ] Developer onboarding guide
- [ ] Architecture diagrams
- [ ] Deployment procedures

---

## 💰 Cost Tracking Dashboard

```javascript
// app/dashboard/costs/page.js
export default function CostsDashboard() {
  const [costs, setCosts] = useState({
    supabase: { used: 0, limit: 500, unit: 'MB' },
    openai: { used: 12.50, limit: 50, unit: 'USD' },
    stripe: { revenue: 450, fees: 13.50, unit: 'USD' },
    pusher: { used: 150000, limit: 200000, unit: 'messages' },
  });
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(costs).map(([service, data]) => (
        <ServiceCostCard
          key={service}
          service={service}
          used={data.used}
          limit={data.limit}
          unit={data.unit}
        />
      ))}
    </div>
  );
}
```

---

## 🎉 Success Metrics

### Week 1 Success
- SQLite → PostgreSQL migration complete
- Authentication working via Supabase
- Error tracking live with Sentry

### Week 2 Success  
- AI responses streaming in real-time
- Payments processing successfully
- Subscription management working

### Week 3 Success
- Multi-channel notifications sending
- Real-time updates functioning
- User engagement improved

### Week 4 Success
- Analytics providing insights
- Feature flags controlling rollout
- Full enterprise stack operational

---

## 🆘 Troubleshooting Guide

### Common Issues

1. **Supabase Connection Issues**
   - Check CORS settings in Supabase dashboard
   - Verify environment variables
   - Ensure RLS policies are correct

2. **Stripe Webhook Failures**
   - Verify webhook endpoint URL
   - Check webhook secret
   - Use Stripe CLI for local testing

3. **Pusher Not Connecting**
   - Verify cluster setting matches
   - Check firewall rules
   - Enable debug mode in Pusher client

4. **Vercel Deployment Issues**
   - Check build logs
   - Verify all env vars are set
   - Ensure package.json scripts are correct

---

This plan provides a structured approach to modernizing your application with enterprise SDKs while maintaining business continuity. Start with Phase 1 and progress incrementally!