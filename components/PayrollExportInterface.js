/**
 * PayrollExportInterface Component
 * Comprehensive frontend interface for payroll export configuration
 * Includes format selection, date range, staff filtering, and scheduling options
 */

import { Calendar, Download, Mail, Settings, Users, Clock, FileText, Table, BarChart3 } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function PayrollExportInterface({ staffData = [], onExportGenerated = () => {} }) {
  const { toast } = useToast()
  
  // Export configuration state
  const [exportConfig, setExportConfig] = useState({
    format: 'pdf',
    dateRange: {
      preset: 'current-month',
      startDate: '',
      endDate: ''
    },
    staffFilter: 'all',
    selectedStaff: [],
    includeComponents: {
      summary: true,
      individual: true,
      transactions: false,
      tierDetails: true,
      formulas: false
    },
    customizations: {
      branding: true,
      companyLogo: null,
      customTitle: '',
      customMessage: '',
      includeCharts: true
    }
  })

  // Scheduling configuration state
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: false,
    name: '',
    description: '',
    frequency: 'monthly',
    scheduleDay: 1,
    recipients: [''],
    customMessage: ''
  })

  // UI state
  const [isExporting, setIsExporting] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [exportHistory, setExportHistory] = useState([])
  const [previewData, setPreviewData] = useState(null)

  // Load export history on component mount
  useEffect(() => {
    loadExportHistory()
    initializeDateRange()
  }, [])

  /**
   * Initialize date range based on preset
   */
  const initializeDateRange = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setExportConfig(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      }
    }))
  }

  /**
   * Load export history from API
   */
  const loadExportHistory = async () => {
    try {
      const response = await fetch('/api/payroll/export?action=history&limit=10')
      const data = await response.json()
      
      if (data.success) {
        setExportHistory(data.history)
      }
    } catch (error) {
      console.error('Failed to load export history:', error)
    }
  }

  /**
   * Handle date range preset selection
   */
  const handleDatePreset = (preset) => {
    const now = new Date()
    let startDate, endDate

    switch (preset) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'current-quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1)
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0)
        break
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = now
        break
      case 'custom':
        // Don't change dates for custom
        return
      default:
        return
    }

    setExportConfig(prev => ({
      ...prev,
      dateRange: {
        preset,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }))
  }

  /**
   * Handle staff selection changes
   */
  const handleStaffSelection = (staffFilter, selectedStaff = []) => {
    setExportConfig(prev => ({
      ...prev,
      staffFilter,
      selectedStaff: staffFilter === 'selected' ? selectedStaff : []
    }))
  }

  /**
   * Generate payroll export
   */
  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Validate configuration
      const validation = validateExportConfig(exportConfig)
      if (!validation.valid) {
        toast({
          title: 'Invalid Configuration',
          description: validation.message,
          variant: 'destructive'
        })
        return
      }

      // Prepare export request
      const exportRequest = {
        format: exportConfig.format,
        dateRange: {
          start: new Date(exportConfig.dateRange.startDate).toISOString(),
          end: new Date(exportConfig.dateRange.endDate).toISOString()
        },
        staffFilter: exportConfig.staffFilter === 'all' ? 'all' : exportConfig.selectedStaff,
        includeComponents: exportConfig.includeComponents,
        customizations: exportConfig.customizations
      }

      const response = await fetch('/api/payroll/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Export failed')
      }

      // Trigger download
      const link = document.createElement('a')
      link.href = result.export.downloadUrl
      link.download = result.export.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Export Generated Successfully',
        description: `${result.export.fileName} is ready for download`,
      })

      // Notify parent component
      onExportGenerated(result.export)

      // Reload export history
      loadExportHistory()

    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Create scheduled export
   */
  const handleScheduleExport = async () => {
    setIsScheduling(true)

    try {
      const scheduleRequest = {
        name: scheduleConfig.name || `${scheduleConfig.frequency} Payroll Report`,
        description: scheduleConfig.description,
        frequency: scheduleConfig.frequency,
        scheduleDay: scheduleConfig.scheduleDay,
        exportOptions: {
          format: exportConfig.format,
          includeComponents: exportConfig.includeComponents,
          customizations: exportConfig.customizations
        },
        emailOptions: {
          recipients: scheduleConfig.recipients.filter(email => email.trim()),
          customMessage: scheduleConfig.customMessage
        }
      }

      const response = await fetch('/api/payroll/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleRequest)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Schedule creation failed')
      }

      toast({
        title: 'Schedule Created',
        description: `${result.schedule.name} will run ${result.schedule.frequency}`,
      })

      // Reset schedule config
      setScheduleConfig({
        enabled: false,
        name: '',
        description: '',
        frequency: 'monthly',
        scheduleDay: 1,
        recipients: [''],
        customMessage: ''
      })

    } catch (error) {
      console.error('Schedule error:', error)
      toast({
        title: 'Schedule Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsScheduling(false)
    }
  }

  /**
   * Validate export configuration
   */
  const validateExportConfig = (config) => {
    if (!config.dateRange.startDate || !config.dateRange.endDate) {
      return { valid: false, message: 'Please select a valid date range' }
    }

    if (new Date(config.dateRange.startDate) >= new Date(config.dateRange.endDate)) {
      return { valid: false, message: 'End date must be after start date' }
    }

    if (config.staffFilter === 'selected' && config.selectedStaff.length === 0) {
      return { valid: false, message: 'Please select at least one staff member' }
    }

    return { valid: true }
  }

  /**
   * Preview export data (simplified)
   */
  const handlePreview = async () => {
    // This would typically make a lightweight API call to get preview data
    setPreviewData({
      staffCount: exportConfig.staffFilter === 'all' ? staffData.length : exportConfig.selectedStaff.length,
      dateRange: `${formatDate(exportConfig.dateRange.startDate)} - ${formatDate(exportConfig.dateRange.endDate)}`,
      estimatedSize: '2.3 MB', // Placeholder
      components: Object.entries(exportConfig.includeComponents)
        .filter(([_, included]) => included)
        .map(([component, _]) => component)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll Export</h2>
          <p className="text-muted-foreground">
            Generate comprehensive payroll reports with flexible formatting options
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isExporting}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">Configure Export</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Reports</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        {/* Configure Export Tab */}
        <TabsContent value="configure" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Format
                </CardTitle>
                <CardDescription>
                  Choose the output format for your payroll report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={exportConfig.format}
                  onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="flex-1">
                      <div className="font-medium">PDF Report</div>
                      <div className="text-sm text-muted-foreground">
                        Professional formatted report with charts and branding
                      </div>
                    </Label>
                    <Badge variant="secondary">Recommended</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="excel" id="excel" />
                    <Label htmlFor="excel" className="flex-1">
                      <div className="font-medium">Excel Spreadsheet</div>
                      <div className="text-sm text-muted-foreground">
                        Detailed data with formulas and multiple worksheets
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv" className="flex-1">
                      <div className="font-medium">CSV Data</div>
                      <div className="text-sm text-muted-foreground">
                        Raw data for external systems integration
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="tax-summary" id="tax-summary" />
                    <Label htmlFor="tax-summary" className="flex-1">
                      <div className="font-medium">Tax Summary</div>
                      <div className="text-sm text-muted-foreground">
                        1099 and tax preparation documents
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Date Range Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date Range
                </CardTitle>
                <CardDescription>
                  Select the period for payroll data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={exportConfig.dateRange.preset}
                  onValueChange={handleDatePreset}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Current Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="current-quarter">Current Quarter</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={exportConfig.dateRange.startDate}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, startDate: e.target.value, preset: 'custom' }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={exportConfig.dateRange.endDate}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, endDate: e.target.value, preset: 'custom' }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Selection
              </CardTitle>
              <CardDescription>
                Choose which staff members to include in the report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={exportConfig.staffFilter}
                onValueChange={(value) => handleStaffSelection(value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all-staff" />
                  <Label htmlFor="all-staff">All Staff Members ({staffData.length})</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active-staff" />
                  <Label htmlFor="active-staff">
                    Active Staff Only ({staffData.filter(s => s.is_active).length})
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected-staff" />
                  <Label htmlFor="selected-staff">Selected Staff Members</Label>
                </div>
              </RadioGroup>

              {exportConfig.staffFilter === 'selected' && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {staffData.map(staff => (
                    <div key={staff.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`staff-${staff.id}`}
                        checked={exportConfig.selectedStaff.includes(staff.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleStaffSelection('selected', [...exportConfig.selectedStaff, staff.id])
                          } else {
                            handleStaffSelection('selected', exportConfig.selectedStaff.filter(id => id !== staff.id))
                          }
                        }}
                      />
                      <Label htmlFor={`staff-${staff.id}`} className="text-sm">
                        {staff.displayName} - {staff.compensationModel?.display || 'No model set'}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Components */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Report Components
              </CardTitle>
              <CardDescription>
                Select which sections to include in your report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'summary', label: 'Executive Summary', description: 'High-level payroll overview' },
                  { key: 'individual', label: 'Individual Staff Details', description: 'Detailed staff breakdown' },
                  { key: 'transactions', label: 'Transaction History', description: 'Detailed transaction records' },
                  { key: 'tierDetails', label: 'Performance Tiers', description: 'Tier progress and bonuses' },
                  { key: 'formulas', label: 'Calculation Formulas', description: 'Excel formulas and references' }
                ].map(component => (
                  <div key={component.key} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={component.key}
                      checked={exportConfig.includeComponents[component.key]}
                      onCheckedChange={(checked) => 
                        setExportConfig(prev => ({
                          ...prev,
                          includeComponents: { ...prev.includeComponents, [component.key]: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor={component.key} className="font-medium">
                        {component.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {component.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced Options
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </Button>
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Company Branding</Label>
                      <p className="text-sm text-muted-foreground">
                        Include company logo and branding
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.customizations.branding}
                      onCheckedChange={(checked) =>
                        setExportConfig(prev => ({
                          ...prev,
                          customizations: { ...prev.customizations, branding: checked }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="custom-title">Custom Report Title</Label>
                    <Input
                      id="custom-title"
                      placeholder="Enter custom report title"
                      value={exportConfig.customizations.customTitle}
                      onChange={(e) =>
                        setExportConfig(prev => ({
                          ...prev,
                          customizations: { ...prev.customizations, customTitle: e.target.value }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="custom-message">Custom Message</Label>
                    <Textarea
                      id="custom-message"
                      placeholder="Add a custom message to the report"
                      value={exportConfig.customizations.customMessage}
                      onChange={(e) =>
                        setExportConfig(prev => ({
                          ...prev,
                          customizations: { ...prev.customizations, customMessage: e.target.value }
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Schedule Reports Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <ScheduleExportInterface
            scheduleConfig={scheduleConfig}
            setScheduleConfig={setScheduleConfig}
            exportConfig={exportConfig}
            isScheduling={isScheduling}
            onScheduleExport={handleScheduleExport}
          />
        </TabsContent>

        {/* Export History Tab */}
        <TabsContent value="history" className="space-y-4">
          <ExportHistoryInterface
            exportHistory={exportHistory}
            onRefresh={loadExportHistory}
          />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {previewData && (
        <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Preview</DialogTitle>
              <DialogDescription>
                Review your export configuration before generating
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Staff Count</Label>
                  <p className="font-medium">{previewData.staffCount}</p>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <p className="font-medium">{previewData.dateRange}</p>
                </div>
                <div>
                  <Label>Format</Label>
                  <p className="font-medium">{exportConfig.format.toUpperCase()}</p>
                </div>
                <div>
                  <Label>Estimated Size</Label>
                  <p className="font-medium">{previewData.estimatedSize}</p>
                </div>
              </div>
              <div>
                <Label>Included Components</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {previewData.components.map(component => (
                    <Badge key={component} variant="secondary">
                      {component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewData(null)}>
                Close
              </Button>
              <Button onClick={() => {
                setPreviewData(null)
                handleExport()
              }}>
                Generate Export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/**
 * Schedule Export Interface Component
 */
function ScheduleExportInterface({ 
  scheduleConfig, 
  setScheduleConfig, 
  exportConfig, 
  isScheduling, 
  onScheduleExport 
}) {
  const addRecipient = () => {
    setScheduleConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }))
  }

  const updateRecipient = (index, email) => {
    setScheduleConfig(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => i === index ? email : r)
    }))
  }

  const removeRecipient = (index) => {
    setScheduleConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Automated Reports
          </CardTitle>
          <CardDescription>
            Set up automatic payroll report generation and email delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                placeholder="Monthly Payroll Report"
                value={scheduleConfig.name}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="schedule-frequency">Frequency</Label>
              <Select
                value={scheduleConfig.frequency}
                onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="schedule-description">Description (Optional)</Label>
            <Textarea
              id="schedule-description"
              placeholder="Describe this scheduled report"
              value={scheduleConfig.description}
              onChange={(e) => setScheduleConfig(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <Label>Email Recipients</Label>
            <div className="space-y-2">
              {scheduleConfig.recipients.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => updateRecipient(index, e.target.value)}
                  />
                  {scheduleConfig.recipients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRecipient(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
                Add Recipient
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="custom-email-message">Custom Email Message (Optional)</Label>
            <Textarea
              id="custom-email-message"
              placeholder="Add a custom message to the email"
              value={scheduleConfig.customMessage}
              onChange={(e) => setScheduleConfig(prev => ({ ...prev, customMessage: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={onScheduleExport}
            disabled={isScheduling || scheduleConfig.recipients.filter(r => r.trim()).length === 0}
            className="min-w-[140px]"
          >
            {isScheduling ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Create Schedule
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Export History Interface Component
 */
function ExportHistoryInterface({ exportHistory, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Exports</h3>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {exportHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No export history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your generated reports will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          exportHistory.map(export_ => (
            <Card key={export_.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{export_.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(export_.createdAt)} • {export_.format.toUpperCase()} • {(export_.fileSize / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {export_.recordCount} records
                    </Badge>
                    <Badge
                      variant={export_.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {export_.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}