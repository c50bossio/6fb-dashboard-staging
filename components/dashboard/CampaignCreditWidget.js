'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  MessageSquare, 
  Mail, 
  TrendingUp, 
  Gift, 
  Zap,
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function CampaignCreditWidget({ barbershopId }) {
  const [creditData, setCreditData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchCreditBalance()
  }, [barbershopId])

  const fetchCreditBalance = async () => {
    try {
      const response = await fetch(`/api/campaigns/credit-allocation?barbershop_id=${barbershopId}`)
      const data = await response.json()
      
      if (data.success) {
        setCreditData(data)
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier) => {
    const colors = {
      starter: 'bg-gray-100 text-gray-800',
      growth: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-gold-100 text-gold-800'
    }
    return colors[tier] || colors.starter
  }

  const getTierIcon = (tier) => {
    if (tier === 'enterprise') return '👑'
    if (tier === 'professional') return '🚀'
    if (tier === 'growth') return '📈'
    return '✨'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Campaign Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!creditData) {
    return null
  }

  const { balance, usage, projections, tier_benefits } = creditData
  const smsPercentageUsed = usage.sms_sent_this_month > 0 
    ? (usage.sms_sent_this_month / (usage.sms_sent_this_month + balance.sms_credits)) * 100
    : 0

  // Calculate value provided
  const monthlyValue = projections.estimated_monthly_credits * 0.025
  const competitorCost = projections.estimated_monthly_credits > 1200 ? 195 : 95 // Textedly pricing

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Campaign Credits
          </CardTitle>
          <Badge className={getTierColor(balance.tier)}>
            {getTierIcon(balance.tier)} {tier_benefits.name}
          </Badge>
        </div>
        <CardDescription>
          Earn free credits with every payment processed
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Credit Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">SMS Credits</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Worth ${(balance.sms_credits * 0.025).toFixed(2)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold">{balance.sms_credits.toLocaleString()}</div>
            <Progress value={100 - smsPercentageUsed} className="h-2" />
            <p className="text-xs text-gray-500">
              {usage.sms_sent_this_month} used this month
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Email Credits</span>
            </div>
            <div className="text-2xl font-bold">Unlimited</div>
            <div className="h-2 bg-green-100 rounded-full"></div>
            <p className="text-xs text-gray-500">
              {usage.emails_sent_this_month} sent this month
            </p>
          </div>
        </div>

        {/* Value Proposition Alert */}
        {monthlyValue > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <Gift className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>You're saving ${competitorCost}/month!</strong>
              <br />
              <span className="text-xs">
                Textedly charges ${competitorCost}/mo for {projections.estimated_monthly_credits} SMS. 
                You get them FREE from payment processing!
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Monthly Projections */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monthly Earnings</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Processing Volume</span>
              <span className="font-medium">${(projections.processing_volume / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Credits Earned</span>
              <span className="font-medium text-green-600">
                +{projections.estimated_monthly_credits} SMS
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Value Provided</span>
              <span className="font-medium text-green-600">
                {projections.estimated_value}
              </span>
            </div>
          </div>
        </div>

        {/* Tier Benefits */}
        {showDetails && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-medium">Your {tier_benefits.name} Benefits</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• {tier_benefits.monthly_base_credits} base credits/month</li>
              <li>• {tier_benefits.email_campaigns}</li>
              <li>• {tier_benefits.automation}</li>
              <li>• {tier_benefits.support}</li>
              {tier_benefits.bonus_features && tier_benefits.bonus_features.map((feature, idx) => (
                <li key={idx}>• {feature}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'View'} Benefits
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => window.location.href = '/dashboard/campaigns'}
          >
            Send Campaign
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Quick Campaign Templates */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Quick Campaigns</p>
          <div className="grid grid-cols-3 gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8"
              onClick={() => window.location.href = '/dashboard/campaigns?template=reminder'}
            >
              Reminders
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8"
              onClick={() => window.location.href = '/dashboard/campaigns?template=review'}
            >
              Reviews
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8"
              onClick={() => window.location.href = '/dashboard/campaigns?template=promotion'}
            >
              Promotions
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}