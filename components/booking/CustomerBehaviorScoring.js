'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  UserCheck, 
  UserX,
  Star,
  AlertCircle,
  Brain,
  Target,
  RefreshCw
} from 'lucide-react'
import { format, subDays } from 'date-fns'

const TIER_COLORS = {
  green: '#10B981',   // Emerald-500
  yellow: '#F59E0B',  // Amber-500  
  red: '#EF4444'      // Red-500
}

const TIER_LABELS = {
  green: 'Reliable',
  yellow: 'Moderate Risk', 
  red: 'High Risk'
}

/**
 * CustomerBehaviorScoring Component
 * Extends BookingRulesAnalytics with AI-powered customer risk assessment
 * Integrates with existing analytics infrastructure to minimize code duplication
 */
export default function CustomerBehaviorScoring({ barbershopId }) {
  const [scoringData, setScoringData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedView, setSelectedView] = useState('overview')
  const [dateRange, setDateRange] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  // Load customer scoring data
  const loadScoringData = useCallback(async () => {
    if (!barbershopId) return
    
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = subDays(endDate, dateRange)
      
      const response = await fetch('/api/customer-behavior/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          view: selectedView
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load scoring data: ${response.statusText}`)
      }
      
      const data = await response.json()
      setScoringData(data)
    } catch (err) {
      console.error('Error loading customer behavior scoring:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [barbershopId, dateRange, selectedView])

  // Manual refresh with visual feedback
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadScoringData()
    setRefreshing(false)
  }

  useEffect(() => {
    loadScoringData()
  }, [loadScoringData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Analyzing customer behavior patterns...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadScoringData}
            className="ml-4"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Customer Intelligence</h2>
            <p className="text-muted-foreground">
              AI-powered risk assessment and behavior analysis
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(days => (
          <Button
            key={days}
            variant={dateRange === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(days)}
          >
            {days} days
          </Button>
        ))}
      </div>

      {/* Key Metrics - Customer Tier Distribution */}
      {scoringData?.tier_summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomerTierCard
            tier="green"
            title="Reliable Customers"
            count={scoringData.tier_summary.green?.count || 0}
            percentage={scoringData.tier_summary.green?.percentage || 0}
            trend={scoringData.tier_summary.green?.trend}
            description="Low risk, streamlined experience"
          />
          
          <CustomerTierCard
            tier="yellow"
            title="Moderate Risk"
            count={scoringData.tier_summary.yellow?.count || 0}
            percentage={scoringData.tier_summary.yellow?.percentage || 0}
            trend={scoringData.tier_summary.yellow?.trend}
            description="Guided booking with confirmations"
          />
          
          <CustomerTierCard
            tier="red"
            title="High Risk"
            count={scoringData.tier_summary.red?.count || 0}
            percentage={scoringData.tier_summary.red?.percentage || 0}
            trend={scoringData.tier_summary.red?.trend}
            description="White-glove concierge treatment"
          />
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scoring">Risk Factors</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {scoringData?.tier_distribution && (
            <Card>
              <CardHeader>
                <CardTitle>Customer Risk Distribution</CardTitle>
                <CardDescription>
                  How your customers are distributed across risk tiers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatTierDistribution(scoringData.tier_distribution)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderTierLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formatTierDistribution(scoringData.tier_distribution).map((entry) => (
                        <Cell key={entry.name} fill={TIER_COLORS[entry.tier]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {scoringData?.score_trends && (
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Trends</CardTitle>
                <CardDescription>
                  How customer risk scores have changed over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatScoreTrends(scoringData.score_trends)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgScore" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Average Risk Score"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="noShowRate" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      name="No-Show Rate %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Factors Tab */}
        <TabsContent value="scoring" className="space-y-4">
          {scoringData?.risk_factors && (
            <Card>
              <CardHeader>
                <CardTitle>Risk Scoring Factors</CardTitle>
                <CardDescription>
                  The key factors that influence customer risk scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formatRiskFactors(scoringData.risk_factors).map((factor) => (
                    <RiskFactorItem key={factor.name} factor={factor} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          {scoringData?.predictions && (
            <Card>
              <CardHeader>
                <CardTitle>No-Show Predictions</CardTitle>
                <CardDescription>
                  AI predictions for upcoming appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scoringData.predictions.slice(0, 10).map((prediction, index) => (
                    <PredictionItem key={index} prediction={prediction} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Effectiveness Tab */}
        <TabsContent value="effectiveness" className="space-y-4">
          {scoringData?.effectiveness && (
            <EffectivenessMetrics data={scoringData.effectiveness} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
function CustomerTierCard({ tier, title, count, percentage, trend, description }) {
  const TierIcon = tier === 'green' ? UserCheck : tier === 'yellow' ? AlertCircle : UserX
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <TierIcon className="h-4 w-4" style={{ color: TIER_COLORS[tier] }} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">
          {percentage}% of total customers
        </p>
        <div className="flex items-center text-xs mt-1">
          {trend && trend !== 0 && (
            <>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(trend)}%
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function RiskFactorItem({ factor }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium">{factor.name}</div>
        <div className="text-sm text-muted-foreground">{factor.description}</div>
      </div>
      <div className="text-right">
        <div className="font-medium">{factor.weight}%</div>
        <div className="text-sm text-muted-foreground">weight</div>
      </div>
    </div>
  )
}

function PredictionItem({ prediction }) {
  const riskLevel = prediction.risk_score >= 70 ? 'red' : prediction.risk_score >= 40 ? 'yellow' : 'green'
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: TIER_COLORS[riskLevel] }}
        />
        <div>
          <div className="font-medium">{prediction.customer_name}</div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(prediction.appointment_date), 'MMM dd, yyyy HH:mm')}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">{prediction.risk_score}% risk</div>
        <Badge variant="outline" style={{ color: TIER_COLORS[riskLevel] }}>
          {TIER_LABELS[riskLevel]}
        </Badge>
      </div>
    </div>
  )
}

function EffectivenessMetrics({ data }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>System Effectiveness</CardTitle>
          <CardDescription>
            How well the risk scoring system is performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {data.no_show_reduction}%
              </div>
              <p className="text-sm text-muted-foreground">No-show reduction</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {data.prediction_accuracy}%
              </div>
              <p className="text-sm text-muted-foreground">Prediction accuracy</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={data.model_confidence} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Model confidence: {data.model_confidence}%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Data Formatting Helpers
function formatTierDistribution(data) {
  return Object.entries(data || {}).map(([tier, count]) => ({
    name: TIER_LABELS[tier],
    tier: tier,
    value: count,
  }))
}

function formatScoreTrends(data) {
  return (data || []).map(item => ({
    date: format(new Date(item.date), 'MMM dd'),
    avgScore: item.average_score,
    noShowRate: item.no_show_rate
  }))
}

function formatRiskFactors(data) {
  return Object.entries(data || {}).map(([key, factor]) => ({
    name: factor.name,
    description: factor.description,
    weight: Math.round(factor.weight * 100)
  }))
}

function renderTierLabel(entry) {
  return `${entry.name}: ${entry.value}`
}