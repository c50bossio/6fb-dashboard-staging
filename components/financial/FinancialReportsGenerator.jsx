'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Users,
  DollarSign,
  Target,
  Clock
} from 'lucide-react'
import financialService from '@/lib/financial-service'

const FinancialReportsGenerator = ({ barbershopId }) => {
  const [reportType, setReportType] = useState('comprehensive')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [reportFormat, setReportFormat] = useState('pdf')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)

  const reportTypes = [
    {
      id: 'comprehensive',
      name: 'Comprehensive Financial Report',
      description: 'Complete overview of all financial activities',
      icon: BarChart3,
      includes: ['Revenue breakdown', 'Commission analysis', 'Tier performance', 'Product sales', 'Payout history']
    },
    {
      id: 'commission_summary',
      name: 'Commission Summary',
      description: 'Detailed commission breakdown by barber',
      icon: DollarSign,
      includes: ['Service commissions', 'Product commissions', 'Tier bonuses', 'Individual performance']
    },
    {
      id: 'tier_performance',
      name: 'Tier Performance Report',
      description: 'Analysis of tier system effectiveness',
      icon: TrendingUp,
      includes: ['Tier progression', 'Achievement rates', 'Revenue impact', 'Forecasting']
    },
    {
      id: 'payout_reconciliation',
      name: 'Payout Reconciliation',
      description: 'Reconciliation of all payouts and balances',
      icon: Target,
      includes: ['Outstanding balances', 'Payout history', 'Pending transactions', 'Adjustments']
    },
    {
      id: 'performance_analytics',
      name: 'Performance Analytics',
      description: 'Detailed performance metrics and trends',
      icon: Users,
      includes: ['Revenue trends', 'Booking patterns', 'Customer metrics', 'Growth analysis']
    }
  ]

  const generateReport = async () => {
    if (!barbershopId) return

    setIsGenerating(true)
    try {
      // Get comprehensive data based on report type
      const reportPromises = []

      // Base financial summary
      reportPromises.push(
        financialService.getComprehensiveCommissionSummary(barbershopId, dateRange)
      )

      // Real-time metrics
      reportPromises.push(
        financialService.getRealtimeFinancialMetrics(barbershopId, dateRange)
      )

      // Tier analytics (if relevant)
      if (['comprehensive', 'tier_performance'].includes(reportType)) {
        reportPromises.push(
          financialService.getTierProgressionAnalytics(barbershopId, dateRange)
        )
      }

      const results = await Promise.all(reportPromises)
      const [summaryResult, metricsResult, tierResult] = results

      if (summaryResult.error || metricsResult.error || (tierResult && tierResult.error)) {
        throw new Error('Failed to gather report data')
      }

      const compiledData = {
        summary: summaryResult.data,
        metrics: metricsResult.data,
        tierAnalytics: tierResult?.data || null,
        dateRange,
        reportType,
        generatedAt: new Date().toISOString()
      }

      setReportData(compiledData)

      // Generate the report file
      await downloadReport(compiledData)

    } catch (error) {
      console.error('Error generating report:', error)
    }
    setIsGenerating(false)
  }

  const downloadReport = async (data) => {
    // Create report content based on format
    let content = ''
    let filename = `financial-report-${reportType}-${dateRange.start}-to-${dateRange.end}`

    if (reportFormat === 'csv') {
      content = generateCSVReport(data)
      filename += '.csv'
    } else if (reportFormat === 'json') {
      content = JSON.stringify(data, null, 2)
      filename += '.json'
    } else {
      // PDF/HTML format
      content = generateHTMLReport(data)
      filename += '.html'
    }

    // Create and download file
    const blob = new Blob([content], { 
      type: reportFormat === 'csv' ? 'text/csv' : 'text/html' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateHTMLReport = (data) => {
    const selectedReport = reportTypes.find(r => r.id === reportType)
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${selectedReport.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .metric h4 { margin: 0 0 5px 0; color: #333; }
        .metric p { margin: 0; font-size: 1.2em; font-weight: bold; color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${selectedReport.name}</h1>
        <p>Generated on: ${new Date(data.generatedAt).toLocaleString()}</p>
        <p>Period: ${new Date(data.dateRange.start).toLocaleDateString()} - ${new Date(data.dateRange.end).toLocaleDateString()}</p>
    </div>
    
    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metric">
            <h4>Total Revenue</h4>
            <p>$${data.summary?.combined_totals?.total_revenue?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Total Commissions</h4>
            <p>$${data.summary?.combined_totals?.total_commission?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Shop Earnings</h4>
            <p>$${data.summary?.combined_totals?.total_shop_earnings?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Total Transactions</h4>
            <p>${data.summary?.combined_totals?.transaction_count?.toLocaleString() || '0'}</p>
        </div>
    </div>
    
    ${reportType === 'comprehensive' || reportType === 'commission_summary' ? `
    <div class="section">
        <h2>Barber Performance Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Barber</th>
                    <th>Total Revenue</th>
                    <th>Total Commission</th>
                    <th>Service Revenue</th>
                    <th>Product Revenue</th>
                    <th>Transactions</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.summary?.combined_totals?.barber_breakdown || {}).map(([barberId, barberData]) => `
                <tr>
                    <td>Barber ${barberId.slice(-4)}</td>
                    <td>$${barberData.total_revenue?.toLocaleString() || '0'}</td>
                    <td>$${barberData.total_commission?.toLocaleString() || '0'}</td>
                    <td>$${barberData.service_revenue?.toLocaleString() || '0'}</td>
                    <td>$${barberData.product_revenue?.toLocaleString() || '0'}</td>
                    <td>${barberData.total_transactions?.toLocaleString() || '0'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    ${reportType === 'comprehensive' || reportType === 'tier_performance' ? `
    <div class="section">
        <h2>Tier System Performance</h2>
        <p>Total Tier Achievements: ${data.tierAnalytics?.analytics?.total_achievements || '0'}</p>
        <p>Unique Barbers in Tier System: ${data.tierAnalytics?.analytics?.unique_barbers || '0'}</p>
        <p>Total Tier Bonuses Paid: $${data.summary?.tier_impact?.total_tier_bonuses?.toLocaleString() || '0'}</p>
    </div>
    ` : ''}
    
    <div class="section">
        <h2>Today's Snapshot</h2>
        <div class="metric">
            <h4>Today's Revenue</h4>
            <p>$${data.metrics?.today?.total_revenue?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Today's Commissions</h4>
            <p>$${data.metrics?.today?.total_commission?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Today's Transactions</h4>
            <p>${data.metrics?.today?.transaction_count?.toLocaleString() || '0'}</p>
        </div>
    </div>
    
    <div class="section">
        <h2>Outstanding Balances</h2>
        <div class="metric">
            <h4>Pending Payouts</h4>
            <p>$${data.metrics?.balances?.total_pending?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Total Paid</h4>
            <p>$${data.metrics?.balances?.total_paid?.toLocaleString() || '0'}</p>
        </div>
        <div class="metric">
            <h4>Total Earned</h4>
            <p>$${data.metrics?.balances?.total_earned?.toLocaleString() || '0'}</p>
        </div>
    </div>
</body>
</html>
    `
  }

  const generateCSVReport = (data) => {
    const headers = ['Metric', 'Value', 'Category']
    const rows = [
      ['Total Revenue', data.summary?.combined_totals?.total_revenue || 0, 'Summary'],
      ['Total Commissions', data.summary?.combined_totals?.total_commission || 0, 'Summary'],
      ['Shop Earnings', data.summary?.combined_totals?.total_shop_earnings || 0, 'Summary'],
      ['Total Transactions', data.summary?.combined_totals?.transaction_count || 0, 'Summary'],
      ['Service Revenue', data.summary?.service_commissions?.total_revenue || 0, 'Services'],
      ['Service Commissions', data.summary?.service_commissions?.total_commission || 0, 'Services'],
      ['Product Revenue', data.summary?.product_commissions?.total_revenue || 0, 'Products'],
      ['Product Commissions', data.summary?.product_commissions?.total_commission || 0, 'Products'],
      ['Pending Payouts', data.metrics?.balances?.total_pending || 0, 'Balances'],
      ['Total Paid', data.metrics?.balances?.total_paid || 0, 'Balances'],
      ['Today Revenue', data.metrics?.today?.total_revenue || 0, 'Today']
    ]

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Financial Reports Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Report Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((type) => {
              const IconComponent = type.icon
              return (
                <div
                  key={type.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    reportType === type.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setReportType(type.id)}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-sm">{type.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                      <ul className="text-xs text-gray-500">
                        {type.includes.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Configuration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <Select value={reportFormat} onValueChange={setReportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML Report</SelectItem>
                <SelectItem value="csv">CSV Data</SelectItem>
                <SelectItem value="json">JSON Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={generateReport} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        {reportData && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-2">Report Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Revenue:</span>
                <p className="font-semibold">${reportData.summary?.combined_totals?.total_revenue?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-gray-600">Total Commissions:</span>
                <p className="font-semibold">${reportData.summary?.combined_totals?.total_commission?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-gray-600">Transactions:</span>
                <p className="font-semibold">{reportData.summary?.combined_totals?.transaction_count?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-gray-600">Generated:</span>
                <p className="font-semibold">{new Date(reportData.generatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FinancialReportsGenerator