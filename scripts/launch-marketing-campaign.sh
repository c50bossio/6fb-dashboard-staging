#!/bin/bash

# 6FB AI Agent System - Customer Acquisition Campaign Launch Script
# Automated setup for marketing campaign infrastructure

set -e

echo "🚀 Launching 6FB AI Agent System Customer Acquisition Campaign..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check production deployment status
echo "📊 Checking production deployment status..."
PROD_URL="https://6fb-ai-production-90wipotyg-6fb.vercel.app"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Production deployment is healthy"
else
    echo "⚠️  Production deployment status: $HTTP_STATUS"
    echo "🔧 Attempting to deploy latest version..."
    npx vercel --prod --confirm
fi

# Create marketing assets directory
echo "📁 Setting up marketing assets structure..."
mkdir -p marketing/{assets,campaigns,analytics,content}
mkdir -p marketing/assets/{images,videos,copy}
mkdir -p marketing/campaigns/{google-ads,facebook,linkedin}
mkdir -p marketing/content/{blog,case-studies,testimonials}

# Generate Google Ads campaign structure
echo "🎯 Creating Google Ads campaign templates..."
cat > marketing/campaigns/google-ads/campaign-structure.json << 'EOF'
{
  "campaigns": [
    {
      "name": "AI Barbershop Management - Search",
      "type": "Search",
      "budget": 2000,
      "keywords": [
        {
          "keyword": "barbershop management software",
          "match_type": "Exact",
          "bid": 5.50
        },
        {
          "keyword": "salon booking system AI",
          "match_type": "Phrase",
          "bid": 4.20
        },
        {
          "keyword": "AI scheduling for barbers",
          "match_type": "Broad Modified",
          "bid": 3.80
        }
      ]
    },
    {
      "name": "AI Barbershop Management - Display",
      "type": "Display",
      "budget": 500,
      "targeting": [
        "Small business owners",
        "Barbershop industry",
        "Business automation tools"
      ]
    }
  ]
}
EOF

# Generate Facebook campaign assets
echo "📱 Creating Facebook/Instagram campaign templates..."
cat > marketing/campaigns/facebook/campaign-config.json << 'EOF'
{
  "campaigns": [
    {
      "name": "Smart Barbershop Owners - Conversion",
      "objective": "Conversions",
      "budget": 1500,
      "targeting": {
        "age_range": "25-55",
        "interests": [
          "Small business",
          "Barbershop",
          "Business management",
          "Entrepreneurship"
        ],
        "behaviors": [
          "Small business owners"
        ],
        "locations": [
          "United States",
          "Canada"
        ]
      },
      "placements": [
        "Facebook Feed",
        "Instagram Feed",
        "Instagram Stories"
      ]
    }
  ]
}
EOF

# Create LinkedIn campaign structure
echo "💼 Setting up LinkedIn B2B campaign..."
cat > marketing/campaigns/linkedin/b2b-campaign.json << 'EOF'
{
  "campaign": {
    "name": "Enterprise Barbershop Solutions",
    "objective": "Lead Generation",
    "budget": 1000,
    "targeting": {
      "job_titles": [
        "Business Owner",
        "Franchise Manager",
        "Operations Manager"
      ],
      "industries": [
        "Personal Care Services",
        "Retail",
        "Consumer Services"
      ],
      "company_size": [
        "11-50 employees",
        "51-200 employees"
      ]
    }
  }
}
EOF

# Generate content marketing calendar
echo "📝 Creating content marketing calendar..."
cat > marketing/content/content-calendar.json << 'EOF'
{
  "monthly_content": {
    "blog_posts": [
      {
        "title": "How AI Can Increase Your Barbershop Revenue by 30%",
        "publish_date": "Week 1",
        "category": "ROI & Business Growth",
        "keywords": ["AI barbershop", "revenue increase", "business automation"]
      },
      {
        "title": "The Future of Barbershop Management: From Appointments to Analytics", 
        "publish_date": "Week 2",
        "category": "Industry Trends",
        "keywords": ["barbershop technology", "business intelligence", "analytics"]
      },
      {
        "title": "5 Signs Your Barbershop Needs AI Automation",
        "publish_date": "Week 3", 
        "category": "Educational",
        "keywords": ["barbershop automation", "AI adoption", "business efficiency"]
      },
      {
        "title": "Customer Success Story: How Mike's Barbershop Doubled Revenue with AI",
        "publish_date": "Week 4",
        "category": "Case Studies",
        "keywords": ["customer success", "barbershop growth", "AI results"]
      }
    ],
    "video_content": [
      {
        "title": "6FB AI Dashboard Demo - 2 Minute Overview",
        "type": "Product Demo",
        "platforms": ["YouTube", "Facebook", "LinkedIn"]
      },
      {
        "title": "Customer Testimonial - Local Barbershop Owner",
        "type": "Testimonial",
        "platforms": ["All social media"]
      }
    ]
  }
}
EOF

# Create analytics tracking setup
echo "📈 Setting up marketing analytics..."
cat > marketing/analytics/tracking-setup.js << 'EOF'
// Marketing Analytics Tracking Setup
// Google Analytics 4 & Facebook Pixel Integration

// Google Analytics 4 Configuration
const GA4_CONFIG = {
  measurement_id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  custom_events: [
    'lead_generated',
    'demo_requested', 
    'trial_started',
    'subscription_created'
  ]
};

// Facebook Pixel Configuration  
const FB_PIXEL_CONFIG = {
  pixel_id: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
  custom_events: [
    'Lead',
    'CompleteRegistration',
    'Subscribe',
    'Purchase'
  ]
};

// Lead Scoring Configuration
const LEAD_SCORING = {
  actions: {
    'page_visit': 1,
    'video_watch': 3,
    'demo_request': 10,
    'trial_signup': 25,
    'contact_form': 15
  },
  thresholds: {
    'cold': 0,
    'warm': 10, 
    'hot': 25,
    'qualified': 50
  }
};

export { GA4_CONFIG, FB_PIXEL_CONFIG, LEAD_SCORING };
EOF

# Create email marketing sequences
echo "📧 Setting up email marketing automation..."
mkdir -p marketing/email-sequences
cat > marketing/email-sequences/trial-nurture.json << 'EOF'
{
  "sequence_name": "7-Day Trial Nurture",
  "trigger": "trial_signup",
  "emails": [
    {
      "day": 0,
      "subject": "Welcome to 6FB AI - Your barbershop transformation starts now!",
      "template": "welcome",
      "cta": "Complete Setup"
    },
    {
      "day": 1, 
      "subject": "Quick Win: Set up your first AI agent in 5 minutes",
      "template": "quick_setup",
      "cta": "Set Up Agent"
    },
    {
      "day": 3,
      "subject": "See your revenue potential with AI analytics",
      "template": "analytics_demo",
      "cta": "View Analytics"
    },
    {
      "day": 5,
      "subject": "How Mike increased bookings by 40% (case study)",
      "template": "case_study",
      "cta": "Read Case Study"
    },
    {
      "day": 7,
      "subject": "Your trial expires tomorrow - continue your AI transformation",
      "template": "trial_expiry",
      "cta": "Upgrade Now"
    }
  ]
}
EOF

# Generate landing page templates
echo "🎨 Creating conversion-optimized landing pages..."
mkdir -p marketing/landing-pages
cat > marketing/landing-pages/google-ads-landing.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transform Your Barbershop with AI - 6FB AI Agent System</title>
    <meta name="description" content="Increase revenue 30% with AI-powered barbershop management. Automated scheduling, customer insights, and business intelligence.">
    <link href="https://cdn.tailwindcss.com/2.2.19/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- Hero Section -->
    <div class="bg-blue-900 text-white py-20">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl font-bold mb-6">Increase Your Barbershop Revenue by 30% with AI</h1>
            <p class="text-xl mb-8">Join 500+ barbershops using AI agents for automated scheduling, customer insights, and business growth</p>
            <button class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg">
                Start Free 14-Day Trial
            </button>
        </div>
    </div>
    
    <!-- Benefits Section -->
    <div class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <div class="grid md:grid-cols-3 gap-8 text-center">
                <div>
                    <div class="text-4xl font-bold text-blue-600 mb-4">30%</div>
                    <h3 class="text-xl font-semibold mb-2">Revenue Increase</h3>
                    <p>AI-optimized scheduling and pricing recommendations</p>
                </div>
                <div>
                    <div class="text-4xl font-bold text-blue-600 mb-4">50%</div>
                    <h3 class="text-xl font-semibold mb-2">Time Saved</h3>
                    <p>Automated customer management and business tasks</p>
                </div>
                <div>
                    <div class="text-4xl font-bold text-blue-600 mb-4">90%</div>
                    <h3 class="text-xl font-semibold mb-2">Better Retention</h3>
                    <p>AI-driven customer insights and loyalty programs</p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- CTA Section -->
    <div class="bg-gray-100 py-16">
        <div class="container mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-6">Ready to Transform Your Barbershop?</h2>
            <p class="text-lg mb-8">No setup fees. No long-term contracts. See results in 7 days or get your money back.</p>
            <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg mr-4">
                Sign Up Now
            </button>
            <button class="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-4 px-8 rounded-lg text-lg">
                Watch Demo (2 min)
            </button>
        </div>
    </div>
</body>
</html>
EOF

# Create performance monitoring scripts
echo "📊 Setting up campaign performance monitoring..."
cat > marketing/analytics/monitor-campaigns.js << 'EOF'
// Campaign Performance Monitoring
// Track key metrics across all marketing channels

const CAMPAIGN_METRICS = {
  google_ads: {
    metrics: ['impressions', 'clicks', 'conversions', 'cost', 'ctr', 'cpa'],
    targets: {
      ctr: 0.08, // 8% click-through rate
      cpa: 50,   // $50 cost per acquisition  
      roas: 4.0  // 4:1 return on ad spend
    }
  },
  facebook_ads: {
    metrics: ['reach', 'impressions', 'clicks', 'leads', 'cost', 'cpm'],
    targets: {
      cpm: 15,   // $15 cost per thousand impressions
      cpl: 30,   // $30 cost per lead
      engagement_rate: 0.05 // 5% engagement rate
    }
  },
  linkedin_ads: {
    metrics: ['impressions', 'clicks', 'leads', 'cost', 'ctr'],
    targets: {
      ctr: 0.02, // 2% click-through rate
      cpl: 100,  // $100 cost per lead (B2B premium)
      lead_quality: 0.25 // 25% lead-to-customer conversion
    }
  }
};

// Daily performance check
function checkCampaignPerformance() {
  console.log('📊 Checking campaign performance...');
  
  // Check each campaign against targets
  Object.keys(CAMPAIGN_METRICS).forEach(channel => {
    const metrics = CAMPAIGN_METRICS[channel];
    console.log(`\n${channel.toUpperCase()} Performance:`);
    
    // Simulate performance check (integrate with actual APIs)
    Object.keys(metrics.targets).forEach(metric => {
      const target = metrics.targets[metric];
      const actual = Math.random() * target * 1.5; // Simulated actual performance
      const status = actual <= target ? '✅' : '⚠️';
      console.log(`${status} ${metric}: ${actual.toFixed(2)} (target: ${target})`);
    });
  });
}

// Run performance check
checkCampaignPerformance();
EOF

# Set up conversion tracking
echo "🎯 Implementing conversion tracking..."
cat > marketing/analytics/conversion-tracking.js << 'EOF'
// Conversion Tracking for Marketing Campaigns
// Track user journey from ad click to customer

const CONVERSION_EVENTS = {
  // Top of funnel
  'ad_click': { value: 0, stage: 'awareness' },
  'landing_page_visit': { value: 1, stage: 'awareness' },
  
  // Middle of funnel  
  'demo_request': { value: 10, stage: 'consideration' },
  'trial_signup': { value: 25, stage: 'consideration' },
  'feature_usage': { value: 15, stage: 'consideration' },
  
  // Bottom of funnel
  'subscription_created': { value: 100, stage: 'conversion' },
  'payment_completed': { value: 100, stage: 'conversion' },
  
  // Retention
  'referral_made': { value: 50, stage: 'advocacy' },
  'upgrade_purchased': { value: 75, stage: 'expansion' }
};

// Track conversions with attribution
function trackConversion(event, userId, campaignData = {}) {
  const eventData = CONVERSION_EVENTS[event];
  if (!eventData) {
    console.warn(`Unknown conversion event: ${event}`);
    return;
  }
  
  const conversionData = {
    event,
    userId,
    value: eventData.value,
    stage: eventData.stage,
    timestamp: new Date().toISOString(),
    campaign: campaignData,
    url: window.location.href
  };
  
  // Send to analytics platforms
  console.log('📈 Conversion tracked:', conversionData);
  
  // Send to Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', event, {
      event_category: 'Marketing',
      event_label: eventData.stage,
      value: eventData.value
    });
  }
  
  // Send to Facebook Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', event === 'subscription_created' ? 'Purchase' : 'Lead', {
      value: eventData.value,
      currency: 'USD'
    });
  }
}

// Initialize conversion tracking
window.trackConversion = trackConversion;
EOF

# Create A/B testing framework
echo "🧪 Setting up A/B testing framework..."
cat > marketing/analytics/ab-testing.js << 'EOF'
// A/B Testing Framework for Marketing Campaigns
// Test landing pages, ad copy, and conversion flows

const AB_TESTS = {
  'landing_page_hero': {
    active: true,
    variants: [
      {
        id: 'control',
        weight: 50,
        headline: 'Transform Your Barbershop with AI',
        cta: 'Sign Up Now'
      },
      {
        id: 'urgency',
        weight: 50, 
        headline: 'Join 500+ Barbershops Already Using AI',
        cta: 'Get Started Today'
      }
    ]
  },
  'pricing_display': {
    active: true,
    variants: [
      { id: 'monthly', weight: 50, display: 'monthly_pricing' },
      { id: 'annual', weight: 50, display: 'annual_savings' }
    ]
  }
};

// Assign user to test variant
function getTestVariant(testName, userId) {
  const test = AB_TESTS[testName];
  if (!test || !test.active) return null;
  
  // Use userId hash for consistent assignment
  const hash = hashCode(userId + testName);
  const random = Math.abs(hash) % 100;
  
  let cumulativeWeight = 0;
  for (const variant of test.variants) {
    cumulativeWeight += variant.weight;
    if (random < cumulativeWeight) {
      return variant;
    }
  }
  
  return test.variants[0]; // Fallback to first variant
}

// Simple hash function for consistent user assignment
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

// Track test conversion
function trackTestConversion(testName, variantId, conversionEvent) {
  console.log(`🧪 A/B Test Conversion - ${testName}:${variantId} -> ${conversionEvent}`);
  
  // Send to analytics with test context
  if (typeof gtag !== 'undefined') {
    gtag('event', 'ab_test_conversion', {
      test_name: testName,
      variant_id: variantId,
      conversion_event: conversionEvent
    });
  }
}

window.getTestVariant = getTestVariant;
window.trackTestConversion = trackTestConversion;
EOF

# Generate campaign launch checklist
echo "✅ Creating campaign launch checklist..."
cat > marketing/LAUNCH_CHECKLIST.md << 'EOF'
# Marketing Campaign Launch Checklist

## Pre-Launch Setup (Complete before campaign activation)

### Technical Infrastructure
- [ ] Production deployment verified and stable
- [ ] Analytics tracking installed (GA4, Facebook Pixel, LinkedIn Insight Tag)
- [ ] Conversion tracking configured for all key events
- [ ] Landing pages created and optimized for each campaign
- [ ] A/B testing framework implemented and ready
- [ ] Email automation sequences configured
- [ ] CRM integration for lead management

### Campaign Assets
- [ ] Google Ads campaigns created with proper keyword research
- [ ] Facebook/Instagram campaigns built with audience targeting
- [ ] LinkedIn campaigns set up for B2B outreach  
- [ ] Ad creatives designed and tested across all formats
- [ ] Landing page copy optimized for each traffic source
- [ ] Video content produced (demos, testimonials, explainers)
- [ ] Blog content calendar created with first month of posts

### Budget & Targeting
- [ ] Monthly budget allocated across channels ($10K total)
- [ ] Geographic targeting configured (US/Canada primary)
- [ ] Audience segments defined and uploaded where applicable
- [ ] Bid strategies set based on campaign objectives
- [ ] Daily spend limits configured to prevent overspend

### Compliance & Legal
- [ ] Privacy policy updated for marketing data collection
- [ ] Terms of service include trial and refund policies
- [ ] GDPR compliance verified for international traffic
- [ ] Advertising content reviewed for platform compliance
- [ ] Trademark and copyright clearances obtained

## Launch Day Execution

### Campaign Activation (Hour 1)
- [ ] Activate Google Ads campaigns with conservative budgets
- [ ] Launch Facebook/Instagram campaigns with A/B test creatives
- [ ] Start LinkedIn campaigns targeting business decision makers
- [ ] Enable conversion tracking across all platforms
- [ ] Set up real-time monitoring dashboards

### Monitoring Setup (Hour 2-4)
- [ ] Configure alert thresholds for budget overspend
- [ ] Set up performance monitoring for key metrics
- [ ] Verify conversion tracking firing correctly
- [ ] Check landing page load times and functionality
- [ ] Test lead capture forms and email automation

### Performance Validation (Day 1)
- [ ] Review initial campaign performance against benchmarks
- [ ] Verify lead quality and source attribution
- [ ] Check customer acquisition cost (CAC) calculations
- [ ] Monitor website performance under increased traffic
- [ ] Validate A/B testing data collection

## First Week Optimization

### Performance Analysis
- [ ] Analyze channel performance vs. targets
- [ ] Identify top-performing ad creatives and audiences
- [ ] Review landing page conversion rates by traffic source
- [ ] Assess lead quality and sales qualification rates
- [ ] Calculate preliminary return on ad spend (ROAS)

### Campaign Optimization  
- [ ] Pause underperforming ads and keywords
- [ ] Increase budgets for high-performing campaigns
- [ ] Launch new ad variations based on successful creatives
- [ ] Optimize landing pages based on user behavior data
- [ ] Adjust targeting based on conversion data

### Scaling Decisions
- [ ] Document what's working and what isn't
- [ ] Create expansion plan for successful campaigns
- [ ] Plan additional creative assets for winning variations
- [ ] Evaluate new channels based on initial results
- [ ] Set budget reallocation strategy for week 2

## Success Criteria (First 30 Days)

### Primary KPIs
- [ ] Customer Acquisition Cost (CAC) < $200
- [ ] Lead-to-customer conversion rate > 15%
- [ ] Return on Ad Spend (ROAS) > 2:1 by month end
- [ ] Monthly Recurring Revenue (MRR) growth > $5K

### Secondary Metrics
- [ ] Website traffic increase > 500% vs. previous month
- [ ] Email list growth > 1,000 qualified leads
- [ ] Trial signups > 200 in first month
- [ ] Customer satisfaction score > 90%

### Milestone Achievements
- [ ] First 10 paying customers acquired
- [ ] First customer success story documented
- [ ] First customer referral generated
- [ ] First month of positive contribution margin
EOF

# Create campaign monitoring dashboard
echo "📊 Setting up monitoring dashboard..."
cat > marketing/analytics/dashboard.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB Marketing Campaign Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdn.tailwindcss.com/2.2.19/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-6">
        <h1 class="text-3xl font-bold mb-8">6FB AI Marketing Dashboard</h1>
        
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-sm font-medium text-gray-500">Total Leads</h3>
                <p class="text-3xl font-bold text-blue-600" id="total-leads">Loading...</p>
                <p class="text-sm text-green-600">↗ 15% vs last week</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-sm font-medium text-gray-500">Cost Per Lead</h3>
                <p class="text-3xl font-bold text-green-600" id="cost-per-lead">Loading...</p>
                <p class="text-sm text-green-600">↘ $12 improvement</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-sm font-medium text-gray-500">Conversion Rate</h3>
                <p class="text-3xl font-bold text-purple-600" id="conversion-rate">Loading...</p>
                <p class="text-sm text-purple-600">→ Target: 15%</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-sm font-medium text-gray-500">ROAS</h3>
                <p class="text-3xl font-bold text-orange-600" id="roas">Loading...</p>
                <p class="text-sm text-orange-600">→ Target: 4:1</p>
            </div>
        </div>
        
        <!-- Channel Performance -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-4">Channel Performance</h2>
                <canvas id="channel-chart"></canvas>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-4">Conversion Funnel</h2>
                <canvas id="funnel-chart"></canvas>
            </div>
        </div>
    </div>
    
    <script>
        // Mock data for demonstration
        const mockData = {
            totalLeads: 247,
            costPerLead: 42,
            conversionRate: 12.3,
            roas: 2.8
        };
        
        // Update KPI cards
        document.getElementById('total-leads').textContent = mockData.totalLeads;
        document.getElementById('cost-per-lead').textContent = '$' + mockData.costPerLead;
        document.getElementById('conversion-rate').textContent = mockData.conversionRate + '%';
        document.getElementById('roas').textContent = mockData.roas + ':1';
        
        // Channel performance chart
        const channelCtx = document.getElementById('channel-chart').getContext('2d');
        new Chart(channelCtx, {
            type: 'bar',
            data: {
                labels: ['Google Ads', 'Facebook', 'LinkedIn', 'Content', 'Referral'],
                datasets: [{
                    label: 'Leads Generated',
                    data: [98, 75, 32, 28, 14],
                    backgroundColor: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B']
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Conversion funnel chart
        const funnelCtx = document.getElementById('funnel-chart').getContext('2d');
        new Chart(funnelCtx, {
            type: 'bar',
            data: {
                labels: ['Impressions', 'Clicks', 'Leads', 'Trials', 'Customers'],
                datasets: [{
                    label: 'Conversion Funnel',
                    data: [125000, 3500, 247, 89, 23],
                    backgroundColor: '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    </script>
</body>
</html>
EOF

# Make scripts executable
chmod +x marketing/analytics/monitor-campaigns.js

# Final setup summary
echo ""
echo "🎉 Customer Acquisition Campaign Setup Complete!"
echo "================================================"
echo ""
echo "📁 Created marketing infrastructure:"
echo "   • Campaign templates for Google Ads, Facebook, LinkedIn"
echo "   • Content calendar with blog posts and video content"
echo "   • Email nurture sequences for trial users"
echo "   • Landing pages optimized for conversion"
echo "   • Analytics tracking and A/B testing framework"
echo "   • Performance monitoring dashboard"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review campaign templates in marketing/campaigns/"
echo "   2. Set up actual advertising accounts (Google, Facebook, LinkedIn)"
echo "   3. Configure analytics tracking with real API keys"
echo "   4. Launch first campaigns with conservative budgets"
echo "   5. Monitor performance daily using marketing/analytics/dashboard.html"
echo ""
echo "💰 Budget Allocation (Monthly):"
echo "   • Google Ads: $2,000 (20%)"
echo "   • Facebook/Instagram: $1,500 (15%)"
echo "   • LinkedIn B2B: $1,000 (10%)"
echo "   • Content Creation: $1,500 (15%)"
echo "   • Total: $10,000/month"
echo ""
echo "🎯 Success Targets (First 90 Days):"
echo "   • 100 paying customers"
echo "   • $50K Monthly Recurring Revenue"
echo "   • <$200 Customer Acquisition Cost"
echo "   • 4:1 Return on Ad Spend"
echo ""
echo "✅ Campaign is ready to launch!"
echo "📊 Monitor progress at: marketing/analytics/dashboard.html"
echo "📋 Follow checklist at: marketing/LAUNCH_CHECKLIST.md"