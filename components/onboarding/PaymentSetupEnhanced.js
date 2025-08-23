'use client'

import { useState, useEffect } from 'react'
import { Check, Lock, DollarSign, Building, Calculator, CreditCard, Info, TrendingUp, MessageSquare, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PaymentSetupEnhanced({ 
  onComplete, 
  initialData = {},
  currentStep = 'payment_setup' 
}) {
  const [completedSteps, setCompletedSteps] = useState(initialData.completedSteps || [])
  const [activeStep, setActiveStep] = useState(currentStep)
  const [showValueProposition, setShowValueProposition] = useState(true)

  // Define the setup flow with dependencies
  const setupSteps = [
    {
      id: 'payment_setup',
      title: 'Payment Processing',
      description: 'Accept payments with competitive rates',
      icon: CreditCard,
      required: true,
      unlocks: ['bank_account', 'service_pricing'],
      highlights: [
        '2.95% + $0.30 per transaction',
        'Next-day deposits available',
        'Earn free marketing credits with every payment'
      ]
    },
    {
      id: 'bank_account',
      title: 'Bank Account',
      description: 'Connect your bank for payouts',
      icon: Building,
      required: true,
      dependsOn: 'payment_setup',
      unlocks: ['payout_model']
    },
    {
      id: 'payout_model',
      title: 'Payout Schedule',
      description: 'Choose how often you get paid',
      icon: Calculator,
      required: false,
      dependsOn: 'bank_account',
      options: [
        { value: 'daily', label: 'Daily', description: 'Get paid every business day' },
        { value: 'weekly', label: 'Weekly', description: 'Paid every Friday' },
        { value: 'monthly', label: 'Monthly', description: 'Paid on the 1st' }
      ]
    },
    {
      id: 'service_pricing',
      title: 'Service Pricing',
      description: 'Set your service rates',
      icon: DollarSign,
      required: true,
      dependsOn: 'payment_setup'
    },
    {
      id: 'business_details',
      title: 'Business Details',
      description: 'Tax and business information',
      icon: Info,
      required: false,
      canDoAnytime: true
    }
  ]

  // Check if a step is unlocked
  const isStepUnlocked = (step) => {
    if (step.canDoAnytime) return true
    if (!step.dependsOn) return true
    return completedSteps.includes(step.dependsOn)
  }

  // Calculate progress
  const requiredSteps = setupSteps.filter(s => s.required)
  const completedRequired = requiredSteps.filter(s => completedSteps.includes(s.id))
  const progress = (completedRequired.length / requiredSteps.length) * 100

  // Value proposition component
  const ValueProposition = () => (
    <Card className="mb-6 border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          How You Earn Free Marketing Credits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$10,000</div>
              <div className="text-sm text-gray-600">Monthly Processing</div>
              <div className="text-xs mt-1">= 240 Free SMS/month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$25,000</div>
              <div className="text-sm text-gray-600">Monthly Processing</div>
              <div className="text-xs mt-1">= 600 Free SMS/month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$50,000+</div>
              <div className="text-sm text-gray-600">Monthly Processing</div>
              <div className="text-xs mt-1">= 1,200+ Free SMS/month</div>
            </div>
          </div>
          
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Industry Comparison:</span>
              Textedly charges $95/month for 1,200 SMS. You get them FREE!
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Badge variant="secondary">No monthly fees</Badge>
              <Badge variant="secondary">No SMS packages</Badge>
              <Badge variant="secondary">Unlimited emails</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowValueProposition(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Step card component
  const StepCard = ({ step }) => {
    const isUnlocked = isStepUnlocked(step)
    const isCompleted = completedSteps.includes(step.id)
    const isActive = activeStep === step.id
    const Icon = step.icon

    return (
      <Card 
        className={`cursor-pointer transition-all ${
          isActive ? 'ring-2 ring-blue-500' : ''
        } ${!isUnlocked ? 'opacity-50' : ''} ${
          isCompleted ? 'border-green-500 bg-green-50/50' : ''
        }`}
        onClick={() => isUnlocked && setActiveStep(step.id)}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${isCompleted ? 'text-green-600' : ''}`} />
              {step.title}
              {step.required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </div>
            {isCompleted && <Check className="h-5 w-5 text-green-600" />}
            {!isUnlocked && <Lock className="h-4 w-4 text-gray-400" />}
          </CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        {step.highlights && isActive && (
          <CardContent>
            <ul className="space-y-1">
              {step.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    )
  }

  // Campaign benefits display
  const CampaignBenefits = () => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>What You Get With Payment Processing</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="starter">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="starter">Starter</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="pro">Pro</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
          </TabsList>
          
          <TabsContent value="starter">
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span>Monthly Volume</span>
                <span className="font-semibold">Under $10k</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Free SMS Credits</span>
                <span className="font-semibold">50/month</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Campaigns</span>
                <span className="font-semibold">5/month</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Automation</span>
                <span className="font-semibold">Basic reminders</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="growth">
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span>Monthly Volume</span>
                <span className="font-semibold">$10k - $50k</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Free SMS Credits</span>
                <span className="font-semibold">200/month + bonuses</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Campaigns</span>
                <span className="font-semibold">Unlimited</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Automation</span>
                <span className="font-semibold">Full automation suite</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bonus Features</span>
                <span className="font-semibold">Review requests, Birthday campaigns</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="pro">
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span>Monthly Volume</span>
                <span className="font-semibold">$50k - $100k</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Free SMS Credits</span>
                <span className="font-semibold">500/month + bonuses</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Campaigns</span>
                <span className="font-semibold">Unlimited</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Automation</span>
                <span className="font-semibold">AI-powered automation</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bonus Features</span>
                <span className="font-semibold">Custom branding, Analytics, A/B testing</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="enterprise">
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span>Monthly Volume</span>
                <span className="font-semibold">$100k+</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Free SMS Credits</span>
                <span className="font-semibold">2000/month + bonuses</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Campaigns</span>
                <span className="font-semibold">Unlimited</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Automation</span>
                <span className="font-semibold">Custom workflows</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bonus Features</span>
                <span className="font-semibold">API access, Multi-location, White-label</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Support</span>
                <span className="font-semibold">Dedicated account manager</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Financial Setup</h2>
        <p className="text-gray-600">
          Set up payment processing to start earning free marketing credits
        </p>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-gray-500 mt-1">
          {completedRequired.length} of {requiredSteps.length} required steps completed
        </p>
      </div>

      {showValueProposition && <ValueProposition />}

      <div className="grid gap-4">
        {setupSteps.map(step => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>

      <CampaignBenefits />

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button 
          onClick={onComplete}
          disabled={completedRequired.length < requiredSteps.length}
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  )
}