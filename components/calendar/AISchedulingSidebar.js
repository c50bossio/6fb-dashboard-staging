'use client'

/**
 * AI Scheduling Sidebar Component
 * Phase 5-6: Smart appointment time suggestions powered by AI
 */

import { 
  Sparkles, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAISchedulingSuggestions, useNoShowPrediction } from '@/hooks/queries/useAI'

export function AISchedulingSidebar({ 
  barbershopId, 
  service, 
  date, 
  onSelectTimeSlot,
  selectedAppointment 
}) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  const { 
    data: suggestions, 
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions 
  } = useAISchedulingSuggestions(barbershopId, service?.duration_minutes || 30, date)
  
  const { 
    data: noShowRisk 
  } = useNoShowPrediction(selectedAppointment)
  
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot)
    if (onSelectTimeSlot) {
      onSelectTimeSlot(slot)
    }
  }
  
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-blue-600'
    if (confidence >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }
  
  const getConfidenceIcon = (confidence) => {
    if (confidence >= 80) return <TrendingUp className="w-4 h-4" />
    if (confidence >= 60) return <CheckCircle className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
  }
  
  const getRiskBadgeVariant = (level) => {
    switch(level) {
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      default: return 'success'
    }
  }
  
  return (
    <div className="space-y-4">
      {/* AI Suggestions Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Suggestions
            </CardTitle>
            <Button
              onClick={() => refetchSuggestions()}
              variant="ghost"
              size="sm"
              disabled={suggestionsLoading}
            >
              <RefreshCw className={`w-4 h-4 ${suggestionsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {suggestionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : suggestions?.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((slot, index) => (
                <button
                  key={`${slot.time}-${index}`}
                  onClick={() => handleSelectSlot(slot)}
                  className={`w-full p-3 text-left border rounded-lg transition-all hover:shadow-md ${
                    selectedSlot?.time === slot.time 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {slot.time} - {slot.endTime}
                        </span>
                        <div className={`flex items-center gap-1 ${getConfidenceColor(slot.confidence)}`}>
                          {getConfidenceIcon(slot.confidence)}
                          <span className="text-sm font-medium">
                            {slot.confidence}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {slot.reasoning || 'Optimal time slot'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                No AI suggestions available for this date
              </p>
            </div>
          )}
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              These suggestions are based on your booking patterns, customer preferences, and peak hours
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      {/* No-Show Risk Assessment */}
      {selectedAppointment && noShowRisk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">No-show Risk</span>
                <Badge variant={getRiskBadgeVariant(noShowRisk.level)}>
                  {Math.round(noShowRisk.risk * 100)}% - {noShowRisk.level}
                </Badge>
              </div>
              
              {noShowRisk.factors?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Risk Factors:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {noShowRisk.factors.map((factor, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-orange-400 rounded-full" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {noShowRisk.recommendation && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Recommendation:</strong> {
                      noShowRisk.recommendation === 'send_confirmation_24h_and_2h' 
                        ? 'Send confirmation 24 hours and 2 hours before'
                        : noShowRisk.recommendation === 'send_reminder_2h'
                        ? 'Send reminder 2 hours before'
                        : 'Standard reminder protocol'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Insights
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-gray-700">Peak booking time: 10 AM - 2 PM</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-gray-700">60% prefer morning appointments</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-gray-700">Average lead time: 3 days</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => window.location.href = '/dashboard/analytics/ai'}
          >
            View Full AI Analytics
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}