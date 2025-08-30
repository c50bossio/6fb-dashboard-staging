/**
 * Comprehensive Payroll Export Service
 * Production-ready export system for 6FB AI Agent System payroll management
 * Supports PDF, Excel, CSV formats with professional branding and security
 */

import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import financialService from '@/lib/financial-service.js'
import staffService from '@/lib/staff-service.js'
import { createClient } from '@/lib/supabase/client'
import 'jspdf-autotable'

export class PayrollExportService {
  constructor() {
    this.supabase = createClient()
  }

  /**
   * Main export function - routes to specific format handlers
   * @param {Object} exportOptions - Export configuration
   * @returns {Object} Export result with download data
   */
  async generatePayrollExport(exportOptions) {
    try {
      const {
        format = 'pdf',
        dateRange = {},
        staffFilter = 'all',
        includeComponents = {},
        customizations = {}
      } = exportOptions

      // Validate date range
      const validatedDateRange = this.validateDateRange(dateRange)

      // Get payroll data based on filters
      const payrollData = await this.getPayrollData(validatedDateRange, staffFilter)

      // Route to appropriate format handler
      switch (format.toLowerCase()) {
        case 'pdf':
          return await this.generatePDFReport(payrollData, { 
            ...customizations, 
            dateRange: validatedDateRange,
            includeComponents 
          })
        
        case 'excel':
        case 'xlsx':
          return await this.generateExcelReport(payrollData, { 
            ...customizations, 
            dateRange: validatedDateRange,
            includeComponents 
          })
        
        case 'csv':
          return await this.generateCSVReport(payrollData, { 
            ...customizations, 
            dateRange: validatedDateRange,
            includeComponents 
          })
        
        case 'tax-summary':
          return await this.generateTaxSummary(payrollData, { 
            ...customizations, 
            dateRange: validatedDateRange 
          })
        
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

    } catch (error) {
      console.error('Error generating payroll export:', error)
      throw error
    }
  }

  /**
   * Validate and normalize date range
   * @param {Object} dateRange - Date range input
   * @returns {Object} Validated date range
   */
  validateDateRange(dateRange) {
    const now = new Date()
    
    // Default to current month if no range specified
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let start = dateRange.start ? new Date(dateRange.start) : defaultStart
    let end = dateRange.end ? new Date(dateRange.end) : defaultEnd

    // Ensure start is before end
    if (start > end) {
      [start, end] = [end, start]
    }

    // Limit to maximum 2 year range for performance
    const maxRange = 2 * 365 * 24 * 60 * 60 * 1000 // 2 years in milliseconds
    if (end - start > maxRange) {
      throw new Error('Date range cannot exceed 2 years')
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      startFormatted: start.toLocaleDateString(),
      endFormatted: end.toLocaleDateString(),
      period: this.determinePeriodType(start, end)
    }
  }

  /**
   * Determine if date range represents a standard period
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {string} Period type
   */
  determinePeriodType(start, end) {
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 7) return 'weekly'
    if (diffDays <= 31) return 'monthly'
    if (diffDays <= 92) return 'quarterly'
    if (diffDays <= 366) return 'yearly'
    return 'custom'
  }

  /**
   * Get comprehensive payroll data
   * @param {Object} dateRange - Date range filter
   * @param {string|Array} staffFilter - Staff filter criteria
   * @returns {Object} Complete payroll data
   */
  async getPayrollData(dateRange, staffFilter = 'all') {
    try {
      // Get barbershop context
      const { shopId } = await staffService.getUserBarbershopId()

      // Load staff data
      const staffData = await staffService.loadStaffData(shopId)

      // Filter staff if specified
      let filteredStaff = staffData.staff
      if (staffFilter !== 'all') {
        const filterIds = Array.isArray(staffFilter) ? staffFilter : [staffFilter]
        filteredStaff = staffData.staff.filter(staff => filterIds.includes(staff.id))
      }

      // Get service commission data
      const serviceCommissionData = await financialService.getFinancialSummary(shopId, dateRange)

      // Get product commission data
      const productCommissionData = await this.getProductCommissionData(shopId, dateRange)

      // Get tier information for each staff member
      const staffWithTiers = await Promise.all(
        filteredStaff.map(async (staff) => {
          const tierStatus = await financialService.getBarberTierStatus(staff.user_id, shopId)
          return {
            ...staff,
            tierStatus: tierStatus.data
          }
        })
      )

      // Calculate comprehensive payroll records
      const payrollRecords = await this.calculatePayrollRecords(staffWithTiers, dateRange, shopId)

      // Get booth rent information
      const boothRentData = await this.getBoothRentData(shopId, dateRange)

      return {
        barbershopInfo: await this.getBarbershopInfo(shopId),
        dateRange,
        staff: staffWithTiers,
        payrollRecords,
        serviceCommissions: serviceCommissionData.data,
        productCommissions: productCommissionData,
        boothRentData,
        summary: this.calculatePayrollSummary(payrollRecords),
        exportMetadata: {
          generatedAt: new Date().toISOString(),
          recordCount: payrollRecords.length,
          totalStaff: staffWithTiers.length
        }
      }

    } catch (error) {
      console.error('Error getting payroll data:', error)
      throw error
    }
  }

  /**
   * Calculate individual payroll records
   * @param {Array} staff - Staff data
   * @param {Object} dateRange - Date range
   * @param {string} shopId - Barbershop ID
   * @returns {Array} Payroll records
   */
  async calculatePayrollRecords(staff, dateRange, shopId) {
    const records = []

    for (const staffMember of staff) {
      try {
        // Get detailed commission transactions
        const serviceTransactions = await this.getStaffServiceTransactions(
          staffMember.user_id, shopId, dateRange
        )
        
        const productTransactions = await this.getStaffProductTransactions(
          staffMember.user_id, shopId, dateRange
        )

        // Calculate service commissions
        const serviceCommissionTotal = serviceTransactions.reduce((sum, tx) => 
          sum + (parseFloat(tx.commission_amount) || 0), 0
        )

        // Calculate product commissions
        const productCommissionTotal = productTransactions.reduce((sum, tx) => 
          sum + (parseFloat(tx.total_commission_amount) || 0), 0
        )

        // Calculate tier bonuses
        const serviceTierBonus = serviceTransactions.reduce((sum, tx) => 
          sum + (parseFloat(tx.tier_bonus_amount) || 0), 0
        )
        
        const productTierBonus = productTransactions.reduce((sum, tx) => 
          sum + (parseFloat(tx.tier_bonus_amount) || 0), 0
        )

        // Calculate booth rent deductions
        let boothRentDeduction = 0
        if (staffMember.financial_arrangement?.type === 'booth_rent') {
          boothRentDeduction = await this.calculateBoothRentForPeriod(
            staffMember.financial_arrangement, dateRange
          )
        }

        // Calculate totals
        const grossEarnings = serviceCommissionTotal + productCommissionTotal
        const totalTierBonuses = serviceTierBonus + productTierBonus
        const netEarnings = grossEarnings + totalTierBonuses - boothRentDeduction

        // Create comprehensive payroll record
        records.push({
          staffId: staffMember.id,
          userId: staffMember.user_id,
          staffName: staffMember.displayName,
          email: staffMember.profile.email,
          role: staffMember.role || 'BARBER',
          
          // Compensation model
          compensationModel: staffMember.compensationModel,
          
          // Service earnings
          serviceCommissions: {
            total: serviceCommissionTotal,
            transactionCount: serviceTransactions.length,
            tierBonus: serviceTierBonus,
            transactions: serviceTransactions
          },
          
          // Product earnings
          productCommissions: {
            total: productCommissionTotal,
            transactionCount: productTransactions.length,
            tierBonus: productTierBonus,
            transactions: productTransactions
          },
          
          // Tier information
          tierInfo: staffMember.tierStatus,
          
          // Deductions
          deductions: {
            boothRent: boothRentDeduction
          },
          
          // Totals
          grossEarnings,
          totalTierBonuses,
          totalDeductions: boothRentDeduction,
          netEarnings,
          
          // YTD totals
          ytdTotals: await this.calculateYTDTotals(staffMember.user_id, shopId),
          
          // Tax information
          taxInfo: {
            isEmployee: staffMember.role === 'EMPLOYEE',
            requires1099: staffMember.financial_arrangement?.type === 'booth_rent',
            withholdingRate: 0 // Assuming independent contractors for now
          }
        })

      } catch (error) {
        console.error(`Error calculating payroll for ${staffMember.displayName}:`, error)
        // Continue with other staff members, record error
        records.push({
          staffId: staffMember.id,
          staffName: staffMember.displayName,
          error: error.message,
          grossEarnings: 0,
          netEarnings: 0
        })
      }
    }

    return records
  }

  /**
   * Get staff service commission transactions
   * @param {string} staffId - Staff ID
   * @param {string} shopId - Shop ID
   * @param {Object} dateRange - Date range
   * @returns {Array} Service transactions
   */
  async getStaffServiceTransactions(staffId, shopId, dateRange) {
    const { data, error } = await this.supabase
      .from('commission_transactions')
      .select('*')
      .eq('barbershop_id', shopId)
      .eq('barber_id', staffId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get staff product commission transactions
   * @param {string} staffId - Staff ID
   * @param {string} shopId - Shop ID
   * @param {Object} dateRange - Date range
   * @returns {Array} Product transactions
   */
  async getStaffProductTransactions(staffId, shopId, dateRange) {
    const { data, error } = await this.supabase
      .from('product_commission_transactions')
      .select('*')
      .eq('barbershop_id', shopId)
      .eq('barber_id', staffId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Calculate booth rent for period
   * @param {Object} arrangement - Financial arrangement
   * @param {Object} dateRange - Date range
   * @returns {number} Booth rent amount
   */
  async calculateBoothRentForPeriod(arrangement, dateRange) {
    if (arrangement.type !== 'booth_rent') return 0

    const rentAmount = arrangement.booth_rent_amount || 0
    const frequency = arrangement.booth_rent_frequency || 'monthly'
    
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    switch (frequency) {
      case 'daily':
        return rentAmount * diffDays
      case 'weekly':
        return rentAmount * Math.ceil(diffDays / 7)
      case 'monthly':
        return rentAmount * Math.ceil(diffDays / 30)
      default:
        return rentAmount
    }
  }

  /**
   * Calculate Year-to-Date totals
   * @param {string} staffId - Staff ID
   * @param {string} shopId - Shop ID
   * @returns {Object} YTD totals
   */
  async calculateYTDTotals(staffId, shopId) {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
    const now = new Date().toISOString()

    // Get YTD service commissions
    const { data: ytdServiceCommissions } = await this.supabase
      .from('commission_transactions')
      .select('commission_amount, tier_bonus_amount')
      .eq('barbershop_id', shopId)
      .eq('barber_id', staffId)
      .gte('created_at', yearStart)
      .lte('created_at', now)

    // Get YTD product commissions
    const { data: ytdProductCommissions } = await this.supabase
      .from('product_commission_transactions')
      .select('total_commission_amount, tier_bonus_amount')
      .eq('barbershop_id', shopId)
      .eq('barber_id', staffId)
      .gte('created_at', yearStart)
      .lte('created_at', now)

    const serviceTotal = ytdServiceCommissions?.reduce((sum, tx) => 
      sum + (parseFloat(tx.commission_amount) || 0) + (parseFloat(tx.tier_bonus_amount) || 0), 0
    ) || 0

    const productTotal = ytdProductCommissions?.reduce((sum, tx) => 
      sum + (parseFloat(tx.total_commission_amount) || 0) + (parseFloat(tx.tier_bonus_amount) || 0), 0
    ) || 0

    return {
      serviceCommissions: serviceTotal,
      productCommissions: productTotal,
      totalEarnings: serviceTotal + productTotal,
      asOfDate: now
    }
  }

  /**
   * Calculate payroll summary
   * @param {Array} payrollRecords - Payroll records
   * @returns {Object} Summary data
   */
  calculatePayrollSummary(payrollRecords) {
    const validRecords = payrollRecords.filter(record => !record.error)

    return {
      totalStaff: payrollRecords.length,
      validRecords: validRecords.length,
      totalGrossEarnings: validRecords.reduce((sum, r) => sum + (r.grossEarnings || 0), 0),
      totalTierBonuses: validRecords.reduce((sum, r) => sum + (r.totalTierBonuses || 0), 0),
      totalDeductions: validRecords.reduce((sum, r) => sum + (r.totalDeductions || 0), 0),
      totalNetEarnings: validRecords.reduce((sum, r) => sum + (r.netEarnings || 0), 0),
      serviceCommissionsTotal: validRecords.reduce((sum, r) => sum + (r.serviceCommissions?.total || 0), 0),
      productCommissionsTotal: validRecords.reduce((sum, r) => sum + (r.productCommissions?.total || 0), 0),
      averageEarningsPerStaff: validRecords.length > 0 ? 
        validRecords.reduce((sum, r) => sum + (r.netEarnings || 0), 0) / validRecords.length : 0
    }
  }

  /**
   * Get barbershop information for branding
   * @param {string} shopId - Shop ID
   * @returns {Object} Barbershop info
   */
  async getBarbershopInfo(shopId) {
    const { data, error } = await this.supabase
      .from('barbershops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (error) {
      console.warn('Could not fetch barbershop info:', error)
      return {
        name: 'BookedBarber Business',
        address: 'Not specified',
        phone: 'Not specified',
        email: 'Not specified'
      }
    }

    return data
  }

  /**
   * Get product commission data summary
   * @param {string} shopId - Shop ID
   * @param {Object} dateRange - Date range
   * @returns {Object} Product commission summary
   */
  async getProductCommissionData(shopId, dateRange) {
    const { data, error } = await this.supabase
      .from('product_commission_transactions')
      .select('*')
      .eq('barbershop_id', shopId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)

    if (error) {
      console.warn('Could not fetch product commission data:', error)
      return { transactions: [], total: 0, byCategory: {} }
    }

    const transactions = data || []
    const total = transactions.reduce((sum, tx) => sum + (parseFloat(tx.total_commission_amount) || 0), 0)
    
    // Group by category
    const byCategory = transactions.reduce((acc, tx) => {
      const category = tx.product_category || 'uncategorized'
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 }
      }
      acc[category].total += parseFloat(tx.total_commission_amount) || 0
      acc[category].count += 1
      return acc
    }, {})

    return { transactions, total, byCategory }
  }

  /**
   * Get booth rent data
   * @param {string} shopId - Shop ID
   * @param {Object} dateRange - Date range
   * @returns {Object} Booth rent data
   */
  async getBoothRentData(shopId, dateRange) {
    const { data, error } = await this.supabase
      .from('financial_arrangements')
      .select('*')
      .eq('barbershop_id', shopId)
      .eq('arrangement_type', 'booth_rent')
      .eq('is_active', true)

    if (error) {
      console.warn('Could not fetch booth rent data:', error)
      return { arrangements: [], totalRent: 0 }
    }

    const arrangements = data || []
    
    // Calculate total rent for the period
    let totalRent = 0
    for (const arrangement of arrangements) {
      totalRent += await this.calculateBoothRentForPeriod(arrangement, dateRange)
    }

    return { arrangements, totalRent }
  }

  // ==========================================
  // PDF GENERATION METHODS
  // ==========================================

  /**
   * Generate professional PDF payroll report
   * @param {Object} payrollData - Complete payroll data
   * @param {Object} options - PDF generation options
   * @returns {Object} PDF generation result
   */
  async generatePDFReport(payrollData, options = {}) {
    try {
      const {
        includeComponents = {
          summary: true,
          individual: true,
          transactions: false,
          tierDetails: true
        },
        branding = true
      } = options

      const doc = new jsPDF()
      
      // Add branding and header
      if (branding) {
        this.addPDFHeader(doc, payrollData.barbershopInfo, payrollData.dateRange)
      }

      let yPosition = branding ? 60 : 20

      // Add executive summary
      if (includeComponents.summary) {
        yPosition = this.addPayrollSummaryToPDF(doc, payrollData.summary, yPosition)
      }

      // Add individual staff details
      if (includeComponents.individual) {
        yPosition = this.addStaffDetailsToPDF(doc, payrollData.payrollRecords, yPosition)
      }

      // Add tier information
      if (includeComponents.tierDetails) {
        yPosition = this.addTierDetailsToPDF(doc, payrollData.payrollRecords, yPosition)
      }

      // Add detailed transactions if requested
      if (includeComponents.transactions) {
        yPosition = this.addTransactionDetailsToPDF(doc, payrollData.payrollRecords, yPosition)
      }

      // Add footer
      this.addPDFFooter(doc, payrollData.exportMetadata)

      // Generate file
      const pdfBlob = doc.output('blob')
      const fileName = this.generateFileName('pdf', payrollData.dateRange)

      return {
        success: true,
        format: 'pdf',
        fileName,
        fileSize: pdfBlob.size,
        data: pdfBlob,
        downloadUrl: URL.createObjectURL(pdfBlob),
        metadata: {
          pages: doc.getNumberOfPages(),
          recordCount: payrollData.payrollRecords.length,
          generatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Error generating PDF report:', error)
      throw error
    }
  }

  /**
   * Add header with branding to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} shopInfo - Shop information
   * @param {Object} dateRange - Date range
   */
  addPDFHeader(doc, shopInfo, dateRange) {
    // Company logo area (placeholder)
    doc.setFillColor(0, 0, 0)
    doc.rect(20, 15, 40, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.text('LOGO', 35, 28)

    // Company info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.text(shopInfo.name || 'BookedBarber Business', 70, 25)
    
    doc.setFontSize(10)
    doc.text(`Address: ${shopInfo.address || 'Not specified'}`, 70, 32)
    doc.text(`Phone: ${shopInfo.phone || 'Not specified'}`, 70, 37)

    // Report title and period
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYROLL REPORT', 20, 50)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period: ${dateRange.startFormatted} - ${dateRange.endFormatted}`, 20, 57)
    
    // Add line separator
    doc.setDrawColor(0, 0, 0)
    doc.line(20, 62, 190, 62)
  }

  /**
   * Add payroll summary section to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} summary - Payroll summary
   * @param {number} yPos - Y position
   * @returns {number} New Y position
   */
  addPayrollSummaryToPDF(doc, summary, yPos) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Payroll Summary', 20, yPos)
    
    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const summaryData = [
      ['Total Staff Members', summary.totalStaff.toString()],
      ['Total Gross Earnings', `$${summary.totalGrossEarnings.toFixed(2)}`],
      ['Total Tier Bonuses', `$${summary.totalTierBonuses.toFixed(2)}`],
      ['Total Deductions', `$${summary.totalDeductions.toFixed(2)}`],
      ['Total Net Earnings', `$${summary.totalNetEarnings.toFixed(2)}`],
      ['Service Commissions', `$${summary.serviceCommissionsTotal.toFixed(2)}`],
      ['Product Commissions', `$${summary.productCommissionsTotal.toFixed(2)}`],
      ['Average per Staff', `$${summary.averageEarningsPerStaff.toFixed(2)}`]
    ]

    doc.autoTable({
      startY: yPos,
      head: [['Metric', 'Amount']],
      body: summaryData,
      theme: 'striped',
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right' } }
    })

    return doc.lastAutoTable.finalY + 15
  }

  /**
   * Add staff details section to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Array} payrollRecords - Payroll records
   * @param {number} yPos - Y position
   * @returns {number} New Y position
   */
  addStaffDetailsToPDF(doc, payrollRecords, yPos) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Individual Staff Payroll', 20, yPos)
    
    yPos += 5

    const tableData = payrollRecords
      .filter(record => !record.error)
      .map(record => [
        record.staffName,
        record.compensationModel.display,
        `$${record.serviceCommissions.total.toFixed(2)}`,
        `$${record.productCommissions.total.toFixed(2)}`,
        `$${record.totalTierBonuses.toFixed(2)}`,
        `$${record.totalDeductions.toFixed(2)}`,
        `$${record.netEarnings.toFixed(2)}`
      ])

    doc.autoTable({
      startY: yPos,
      head: [['Staff Member', 'Model', 'Service', 'Product', 'Bonuses', 'Deductions', 'Net Total']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      columnStyles: { 
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      }
    })

    return doc.lastAutoTable.finalY + 15
  }

  /**
   * Add tier details section to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Array} payrollRecords - Payroll records
   * @param {number} yPos - Y position
   * @returns {number} New Y position
   */
  addTierDetailsToPDF(doc, payrollRecords, yPos) {
    const staffWithTiers = payrollRecords.filter(record => record.tierInfo && !record.error)
    
    if (staffWithTiers.length === 0) return yPos

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Performance Tier Information', 20, yPos)
    
    yPos += 5

    const tierData = staffWithTiers.map(record => [
      record.staffName,
      record.tierInfo.current_tier?.tier_level || 'N/A',
      `${record.tierInfo.current_tier?.commission_percentage || 0}%`,
      `$${record.tierInfo.current_period_revenue || 0}`,
      `${record.tierInfo.progressToNextTier || 0}%`
    ])

    doc.autoTable({
      startY: yPos,
      head: [['Staff Member', 'Current Tier', 'Commission Rate', 'Period Revenue', 'Progress to Next']],
      body: tierData,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: { 
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    })

    return doc.lastAutoTable.finalY + 15
  }

  /**
   * Add detailed transactions to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Array} payrollRecords - Payroll records
   * @param {number} yPos - Y position
   * @returns {number} New Y position
   */
  addTransactionDetailsToPDF(doc, payrollRecords, yPos) {
    // Add new page for detailed transactions
    doc.addPage()
    yPos = 20

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Detailed Transaction History', 20, yPos)
    
    yPos += 10

    for (const record of payrollRecords.filter(r => !r.error)) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      // Staff member header
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`${record.staffName}`, 20, yPos)
      yPos += 8

      // Service transactions
      if (record.serviceCommissions.transactions.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('Service Commissions:', 25, yPos)
        yPos += 5

        const serviceData = record.serviceCommissions.transactions.slice(0, 10).map(tx => [
          new Date(tx.created_at).toLocaleDateString(),
          `$${parseFloat(tx.payment_amount || 0).toFixed(2)}`,
          `$${parseFloat(tx.commission_amount || 0).toFixed(2)}`,
          `${parseFloat(tx.commission_percentage || 0)}%`
        ])

        doc.autoTable({
          startY: yPos,
          head: [['Date', 'Sale Amount', 'Commission', 'Rate']],
          body: serviceData,
          theme: 'plain',
          styles: { fontSize: 8 },
          margin: { left: 30 }
        })

        yPos = doc.lastAutoTable.finalY + 5
      }

      // Product transactions
      if (record.productCommissions.transactions.length > 0) {
        doc.setFontSize(10)
        doc.text('Product Commissions:', 25, yPos)
        yPos += 5

        const productData = record.productCommissions.transactions.slice(0, 10).map(tx => [
          new Date(tx.created_at).toLocaleDateString(),
          tx.product_name || 'Product',
          `$${parseFloat(tx.total_sale_amount || 0).toFixed(2)}`,
          `$${parseFloat(tx.total_commission_amount || 0).toFixed(2)}`
        ])

        doc.autoTable({
          startY: yPos,
          head: [['Date', 'Product', 'Sale Amount', 'Commission']],
          body: productData,
          theme: 'plain',
          styles: { fontSize: 8 },
          margin: { left: 30 }
        })

        yPos = doc.lastAutoTable.finalY + 15
      }
    }

    return yPos
  }

  /**
   * Add footer to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} metadata - Export metadata
   */
  addPDFFooter(doc, metadata) {
    const pageCount = doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      
      // Footer text
      const footerText = `Generated on ${new Date(metadata.generatedAt).toLocaleString()} | BookedBarber Payroll System | Page ${i} of ${pageCount}`
      doc.text(footerText, 20, 285)
    }
  }

  // ==========================================
  // EXCEL GENERATION METHODS
  // ==========================================

  /**
   * Generate comprehensive Excel payroll report
   * @param {Object} payrollData - Complete payroll data
   * @param {Object} options - Excel generation options
   * @returns {Object} Excel generation result
   */
  async generateExcelReport(payrollData, options = {}) {
    try {
      const {
        includeComponents = {
          summary: true,
          individual: true,
          transactions: true,
          tierDetails: true,
          formulas: true
        }
      } = options

      const workbook = new ExcelJS.Workbook()
      
      // Set workbook properties
      workbook.creator = 'BookedBarber Payroll System'
      workbook.lastModifiedBy = 'BookedBarber'
      workbook.created = new Date()
      workbook.modified = new Date()
      workbook.properties.date1904 = true

      // Add summary worksheet
      if (includeComponents.summary) {
        this.addSummaryWorksheet(workbook, payrollData)
      }

      // Add individual staff worksheet
      if (includeComponents.individual) {
        this.addStaffWorksheet(workbook, payrollData)
      }

      // Add tier details worksheet
      if (includeComponents.tierDetails) {
        this.addTierWorksheet(workbook, payrollData)
      }

      // Add detailed transactions worksheet
      if (includeComponents.transactions) {
        this.addTransactionsWorksheet(workbook, payrollData)
      }

      // Add formulas and calculations worksheet
      if (includeComponents.formulas) {
        this.addCalculationsWorksheet(workbook, payrollData)
      }

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer()
      const fileName = this.generateFileName('xlsx', payrollData.dateRange)

      return {
        success: true,
        format: 'excel',
        fileName,
        fileSize: buffer.length,
        data: buffer,
        downloadUrl: URL.createObjectURL(new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        })),
        metadata: {
          worksheets: workbook.worksheets.length,
          recordCount: payrollData.payrollRecords.length,
          generatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Error generating Excel report:', error)
      throw error
    }
  }

  /**
   * Add summary worksheet to Excel workbook
   * @param {ExcelJS.Workbook} workbook - Excel workbook
   * @param {Object} payrollData - Payroll data
   */
  addSummaryWorksheet(workbook, payrollData) {
    const worksheet = workbook.addWorksheet('Payroll Summary', {
      headerFooter: { firstHeader: `Payroll Report - ${payrollData.dateRange.startFormatted} to ${payrollData.dateRange.endFormatted}` }
    })

    // Company header
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = `${payrollData.barbershopInfo.name || 'BookedBarber Business'} - Payroll Summary`
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Period info
    worksheet.mergeCells('A2:F2')
    const periodCell = worksheet.getCell('A2')
    periodCell.value = `Period: ${payrollData.dateRange.startFormatted} - ${payrollData.dateRange.endFormatted}`
    periodCell.font = { size: 12 }
    periodCell.alignment = { horizontal: 'center' }

    // Summary data starting row 4
    const summaryData = [
      ['Metric', 'Amount', '', 'Details', '', ''],
      ['Total Staff Members', payrollData.summary.totalStaff, '', '', '', ''],
      ['Total Gross Earnings', payrollData.summary.totalGrossEarnings, '', 'Before deductions', '', ''],
      ['Service Commissions', payrollData.summary.serviceCommissionsTotal, '', 'From services', '', ''],
      ['Product Commissions', payrollData.summary.productCommissionsTotal, '', 'From product sales', '', ''],
      ['Total Tier Bonuses', payrollData.summary.totalTierBonuses, '', 'Performance bonuses', '', ''],
      ['Total Deductions', payrollData.summary.totalDeductions, '', 'Booth rent, etc.', '', ''],
      ['Total Net Earnings', payrollData.summary.totalNetEarnings, '', 'Final payout amount', '', ''],
      ['Average per Staff', payrollData.summary.averageEarningsPerStaff, '', 'Mean earnings', '', '']
    ]

    worksheet.addRows(summaryData, 4)

    // Format currency columns
    worksheet.getColumn('B').numFmt = '$#,##0.00'
    
    // Style the header row
    const headerRow = worksheet.getRow(4)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } }

    // Set column widths
    worksheet.columns = [
      { width: 25 }, // Metric
      { width: 18 }, // Amount
      { width: 3 },  // Spacer
      { width: 20 }, // Details
      { width: 10 }, // Spacer
      { width: 10 }  // Spacer
    ]

    // Add border to summary table
    worksheet.getCell('A4').border = { top: { style: 'thick' }, left: { style: 'thick' } }
    worksheet.getCell('B4').border = { top: { style: 'thick' }, right: { style: 'thick' } }
    
    // Add generation info
    worksheet.getCell('A15').value = `Generated: ${new Date(payrollData.exportMetadata.generatedAt).toLocaleString()}`
    worksheet.getCell('A16').value = `Record Count: ${payrollData.exportMetadata.recordCount}`
  }

  /**
   * Add staff details worksheet
   * @param {ExcelJS.Workbook} workbook - Excel workbook
   * @param {Object} payrollData - Payroll data
   */
  addStaffWorksheet(workbook, payrollData) {
    const worksheet = workbook.addWorksheet('Staff Details')

    // Headers
    const headers = [
      'Staff Name',
      'Email',
      'Role',
      'Compensation Model',
      'Service Commissions',
      'Service Transactions',
      'Product Commissions', 
      'Product Transactions',
      'Tier Bonuses',
      'Deductions',
      'Gross Earnings',
      'Net Earnings',
      'YTD Service',
      'YTD Product',
      'YTD Total'
    ]

    worksheet.addRow(headers)

    // Data rows
    const validRecords = payrollData.payrollRecords.filter(record => !record.error)
    
    validRecords.forEach(record => {
      worksheet.addRow([
        record.staffName,
        record.email,
        record.role,
        record.compensationModel.display,
        record.serviceCommissions.total,
        record.serviceCommissions.transactionCount,
        record.productCommissions.total,
        record.productCommissions.transactionCount,
        record.totalTierBonuses,
        record.totalDeductions,
        record.grossEarnings,
        record.netEarnings,
        record.ytdTotals.serviceCommissions,
        record.ytdTotals.productCommissions,
        record.ytdTotals.totalEarnings
      ])
    })

    // Format currency columns (E, G, I, J, K, L, M, N, O)
    const currencyColumns = ['E', 'G', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
    currencyColumns.forEach(col => {
      worksheet.getColumn(col).numFmt = '$#,##0.00'
    })

    // Format number columns (F, H)
    worksheet.getColumn('F').numFmt = '#,##0'
    worksheet.getColumn('H').numFmt = '#,##0'

    // Style the header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0
      column.eachCell({ includeEmpty: true }, function(cell, rowNumber) {
        const length = cell.value ? cell.value.toString().length : 10
        if (length > maxLength) {
          maxLength = length
        }
      })
      column.width = Math.max(maxLength + 2, 12)
    })

    // Add totals row
    const totalRow = worksheet.addRow([
      'TOTALS',
      '',
      '',
      '',
      { formula: `SUM(E2:E${validRecords.length + 1})` },
      { formula: `SUM(F2:F${validRecords.length + 1})` },
      { formula: `SUM(G2:G${validRecords.length + 1})` },
      { formula: `SUM(H2:H${validRecords.length + 1})` },
      { formula: `SUM(I2:I${validRecords.length + 1})` },
      { formula: `SUM(J2:J${validRecords.length + 1})` },
      { formula: `SUM(K2:K${validRecords.length + 1})` },
      { formula: `SUM(L2:L${validRecords.length + 1})` },
      { formula: `SUM(M2:M${validRecords.length + 1})` },
      { formula: `SUM(N2:N${validRecords.length + 1})` },
      { formula: `SUM(O2:O${validRecords.length + 1})` }
    ])

    totalRow.font = { bold: true }
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC' } }
  }

  /**
   * Add tier details worksheet
   * @param {ExcelJS.Workbook} workbook - Excel workbook
   * @param {Object} payrollData - Payroll data
   */
  addTierWorksheet(workbook, payrollData) {
    const worksheet = workbook.addWorksheet('Tier Performance')
    const staffWithTiers = payrollData.payrollRecords.filter(record => record.tierInfo && !record.error)

    if (staffWithTiers.length === 0) {
      worksheet.addRow(['No tier system data available'])
      return
    }

    // Headers
    const headers = [
      'Staff Name',
      'Current Tier Level',
      'Current Commission Rate',
      'Period Revenue',
      'Period Bookings',
      'Progress to Next Tier',
      'Next Tier Threshold',
      'Days Remaining',
      'Projected Revenue',
      'On Track for Next Tier'
    ]

    worksheet.addRow(headers)

    // Data rows
    staffWithTiers.forEach(record => {
      const tierInfo = record.tierInfo
      worksheet.addRow([
        record.staffName,
        tierInfo.current_tier?.tier_level || 'N/A',
        `${tierInfo.current_tier?.commission_percentage || 0}%`,
        tierInfo.current_period_revenue || 0,
        tierInfo.current_period_bookings || 0,
        `${tierInfo.progressToNextTier || 0}%`,
        tierInfo.nextTierThreshold || 'Max Tier',
        tierInfo.daysRemaining || 0,
        tierInfo.projectedEndRevenue || 0,
        tierInfo.isOnTrackForNextTier ? 'Yes' : 'No'
      ])
    })

    // Format columns
    worksheet.getColumn('D').numFmt = '$#,##0.00' // Period Revenue
    worksheet.getColumn('G').numFmt = '$#,##0.00' // Next Tier Threshold
    worksheet.getColumn('I').numFmt = '$#,##0.00' // Projected Revenue

    // Style header
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  /**
   * Add transactions worksheet with full transaction details
   * @param {ExcelJS.Workbook} workbook - Excel workbook
   * @param {Object} payrollData - Payroll data
   */
  addTransactionsWorksheet(workbook, payrollData) {
    const worksheet = workbook.addWorksheet('Transaction Details')

    // Headers
    const headers = [
      'Staff Name',
      'Transaction Type',
      'Date',
      'Amount',
      'Commission',
      'Commission Rate',
      'Tier Bonus',
      'Product/Service',
      'Category',
      'Transaction ID'
    ]

    worksheet.addRow(headers)

    // Add all transactions
    payrollData.payrollRecords
      .filter(record => !record.error)
      .forEach(record => {
        // Add service transactions
        record.serviceCommissions.transactions.forEach(tx => {
          worksheet.addRow([
            record.staffName,
            'Service Commission',
            new Date(tx.created_at).toLocaleDateString(),
            parseFloat(tx.payment_amount || 0),
            parseFloat(tx.commission_amount || 0),
            `${parseFloat(tx.commission_percentage || 0)}%`,
            parseFloat(tx.tier_bonus_amount || 0),
            tx.service_name || 'Service',
            'Service',
            tx.id
          ])
        })

        // Add product transactions
        record.productCommissions.transactions.forEach(tx => {
          worksheet.addRow([
            record.staffName,
            'Product Commission',
            new Date(tx.created_at).toLocaleDateString(),
            parseFloat(tx.total_sale_amount || 0),
            parseFloat(tx.total_commission_amount || 0),
            `${parseFloat(tx.commission_rate || 0) * 100}%`,
            parseFloat(tx.tier_bonus_amount || 0),
            tx.product_name || 'Product',
            tx.product_category || 'Uncategorized',
            tx.id
          ])
        })
      })

    // Format currency columns
    worksheet.getColumn('D').numFmt = '$#,##0.00' // Amount
    worksheet.getColumn('E').numFmt = '$#,##0.00' // Commission
    worksheet.getColumn('G').numFmt = '$#,##0.00' // Tier Bonus

    // Style header
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  /**
   * Add calculations worksheet with formulas
   * @param {ExcelJS.Workbook} workbook - Excel workbook
   * @param {Object} payrollData - Payroll data
   */
  addCalculationsWorksheet(workbook, payrollData) {
    const worksheet = workbook.addWorksheet('Calculations & Formulas')

    // Add calculation formulas and references
    worksheet.addRow(['Payroll Calculation Formulas'])
    worksheet.addRow([])
    worksheet.addRow(['Formula', 'Description', 'Example'])
    
    const formulas = [
      ['Service Commission = Sale Amount × Commission Rate', 'Basic service commission calculation', '$100 × 60% = $60'],
      ['Product Commission = Product Price × Product Commission Rate', 'Product commission calculation', '$25 × 15% = $3.75'],
      ['Tier Bonus = Transaction Amount × Tier Bonus Rate', 'Performance tier bonus', '$100 × 2% = $2'],
      ['Net Earnings = Gross Earnings + Bonuses - Deductions', 'Final payout calculation', '$500 + $10 - $150 = $360'],
      ['Booth Rent = Daily Rate × Days or Weekly/Monthly Rate', 'Booth rent deduction', '$50/day × 20 days = $1000']
    ]

    formulas.forEach(formula => {
      worksheet.addRow(formula)
    })

    // Add summary calculations with references to other sheets
    worksheet.addRow([])
    worksheet.addRow(['Live Calculations (referencing Staff Details sheet):'])
    worksheet.addRow([])
    
    // These formulas reference the Staff Details sheet
    worksheet.addRow(['Total Gross Earnings', { formula: 'SUM(\'Staff Details\'.K:K)' }])
    worksheet.addRow(['Total Net Earnings', { formula: 'SUM(\'Staff Details\'.L:L)' }])
    worksheet.addRow(['Average Earnings per Staff', { formula: 'AVERAGE(\'Staff Details\'.L:L)' }])

    // Format currency
    worksheet.getColumn('B').numFmt = '$#,##0.00'

    // Style
    const titleCell = worksheet.getCell('A1')
    titleCell.font = { size: 14, bold: true }
    
    const headerRow = worksheet.getRow(3)
    headerRow.font = { bold: true }

    worksheet.columns = [
      { width: 40 },
      { width: 30 },
      { width: 25 }
    ]
  }

  // ==========================================
  // CSV GENERATION METHODS
  // ==========================================

  /**
   * Generate CSV payroll report
   * @param {Object} payrollData - Complete payroll data
   * @param {Object} options - CSV generation options
   * @returns {Object} CSV generation result
   */
  async generateCSVReport(payrollData, options = {}) {
    try {
      const {
        format = 'detailed', // 'summary', 'detailed', 'transactions'
        delimiter = ',',
        includeHeaders = true
      } = options

      let csvContent = ''
      let fileName = ''

      switch (format) {
        case 'summary':
          csvContent = this.generateSummaryCSV(payrollData, delimiter, includeHeaders)
          fileName = this.generateFileName('summary.csv', payrollData.dateRange)
          break
        
        case 'detailed':
          csvContent = this.generateDetailedCSV(payrollData, delimiter, includeHeaders)
          fileName = this.generateFileName('detailed.csv', payrollData.dateRange)
          break
        
        case 'transactions':
          csvContent = this.generateTransactionsCSV(payrollData, delimiter, includeHeaders)
          fileName = this.generateFileName('transactions.csv', payrollData.dateRange)
          break
        
        default:
          throw new Error(`Unsupported CSV format: ${format}`)
      }

      // Convert to blob
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

      return {
        success: true,
        format: 'csv',
        fileName,
        fileSize: csvBlob.size,
        data: csvContent,
        downloadUrl: URL.createObjectURL(csvBlob),
        metadata: {
          format: format,
          delimiter: delimiter,
          recordCount: payrollData.payrollRecords.length,
          generatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Error generating CSV report:', error)
      throw error
    }
  }

  /**
   * Generate summary CSV format
   * @param {Object} payrollData - Payroll data
   * @param {string} delimiter - CSV delimiter
   * @param {boolean} includeHeaders - Include header row
   * @returns {string} CSV content
   */
  generateSummaryCSV(payrollData, delimiter = ',', includeHeaders = true) {
    const rows = []

    if (includeHeaders) {
      rows.push([
        'Staff Name',
        'Email',
        'Compensation Model',
        'Service Commissions',
        'Product Commissions',
        'Tier Bonuses',
        'Total Deductions',
        'Net Earnings'
      ].join(delimiter))
    }

    const validRecords = payrollData.payrollRecords.filter(record => !record.error)
    
    validRecords.forEach(record => {
      rows.push([
        this.escapeCSV(record.staffName),
        this.escapeCSV(record.email),
        this.escapeCSV(record.compensationModel.display),
        record.serviceCommissions.total.toFixed(2),
        record.productCommissions.total.toFixed(2),
        record.totalTierBonuses.toFixed(2),
        record.totalDeductions.toFixed(2),
        record.netEarnings.toFixed(2)
      ].join(delimiter))
    })

    return rows.join('\n')
  }

  /**
   * Generate detailed CSV format
   * @param {Object} payrollData - Payroll data
   * @param {string} delimiter - CSV delimiter
   * @param {boolean} includeHeaders - Include header row
   * @returns {string} CSV content
   */
  generateDetailedCSV(payrollData, delimiter = ',', includeHeaders = true) {
    const rows = []

    if (includeHeaders) {
      rows.push([
        'Staff Name',
        'Email',
        'Role',
        'Compensation Model',
        'Service Commissions',
        'Service Transaction Count',
        'Service Tier Bonus',
        'Product Commissions',
        'Product Transaction Count',
        'Product Tier Bonus',
        'Total Tier Bonuses',
        'Booth Rent Deduction',
        'Total Deductions',
        'Gross Earnings',
        'Net Earnings',
        'YTD Service Commissions',
        'YTD Product Commissions',
        'YTD Total Earnings',
        'Current Tier Level',
        'Current Commission Rate',
        'Period Revenue',
        'Progress to Next Tier'
      ].join(delimiter))
    }

    const validRecords = payrollData.payrollRecords.filter(record => !record.error)
    
    validRecords.forEach(record => {
      rows.push([
        this.escapeCSV(record.staffName),
        this.escapeCSV(record.email),
        this.escapeCSV(record.role),
        this.escapeCSV(record.compensationModel.display),
        record.serviceCommissions.total.toFixed(2),
        record.serviceCommissions.transactionCount,
        record.serviceCommissions.tierBonus.toFixed(2),
        record.productCommissions.total.toFixed(2),
        record.productCommissions.transactionCount,
        record.productCommissions.tierBonus.toFixed(2),
        record.totalTierBonuses.toFixed(2),
        record.deductions.boothRent.toFixed(2),
        record.totalDeductions.toFixed(2),
        record.grossEarnings.toFixed(2),
        record.netEarnings.toFixed(2),
        record.ytdTotals.serviceCommissions.toFixed(2),
        record.ytdTotals.productCommissions.toFixed(2),
        record.ytdTotals.totalEarnings.toFixed(2),
        record.tierInfo?.current_tier?.tier_level || 'N/A',
        record.tierInfo?.current_tier?.commission_percentage || 'N/A',
        record.tierInfo?.current_period_revenue || 0,
        `${record.tierInfo?.progressToNextTier || 0}%`
      ].join(delimiter))
    })

    return rows.join('\n')
  }

  /**
   * Generate transactions CSV format
   * @param {Object} payrollData - Payroll data
   * @param {string} delimiter - CSV delimiter
   * @param {boolean} includeHeaders - Include header row
   * @returns {string} CSV content
   */
  generateTransactionsCSV(payrollData, delimiter = ',', includeHeaders = true) {
    const rows = []

    if (includeHeaders) {
      rows.push([
        'Staff Name',
        'Transaction Type',
        'Date',
        'Transaction ID',
        'Item Name',
        'Category',
        'Sale Amount',
        'Commission Amount',
        'Commission Rate',
        'Tier Bonus',
        'Total Commission'
      ].join(delimiter))
    }

    payrollData.payrollRecords
      .filter(record => !record.error)
      .forEach(record => {
        // Add service transactions
        record.serviceCommissions.transactions.forEach(tx => {
          rows.push([
            this.escapeCSV(record.staffName),
            'Service Commission',
            new Date(tx.created_at).toLocaleDateString(),
            tx.id,
            this.escapeCSV(tx.service_name || 'Service'),
            'Service',
            parseFloat(tx.payment_amount || 0).toFixed(2),
            parseFloat(tx.commission_amount || 0).toFixed(2),
            `${parseFloat(tx.commission_percentage || 0)}%`,
            parseFloat(tx.tier_bonus_amount || 0).toFixed(2),
            (parseFloat(tx.commission_amount || 0) + parseFloat(tx.tier_bonus_amount || 0)).toFixed(2)
          ].join(delimiter))
        })

        // Add product transactions
        record.productCommissions.transactions.forEach(tx => {
          rows.push([
            this.escapeCSV(record.staffName),
            'Product Commission',
            new Date(tx.created_at).toLocaleDateString(),
            tx.id,
            this.escapeCSV(tx.product_name || 'Product'),
            this.escapeCSV(tx.product_category || 'Uncategorized'),
            parseFloat(tx.total_sale_amount || 0).toFixed(2),
            parseFloat(tx.base_commission_amount || 0).toFixed(2),
            `${parseFloat(tx.commission_rate || 0) * 100}%`,
            parseFloat(tx.tier_bonus_amount || 0).toFixed(2),
            parseFloat(tx.total_commission_amount || 0).toFixed(2)
          ].join(delimiter))
        })
      })

    return rows.join('\n')
  }

  /**
   * Escape CSV values to handle commas, quotes, and newlines
   * @param {string} value - Value to escape
   * @returns {string} Escaped value
   */
  escapeCSV(value) {
    if (value == null) return ''
    
    const str = value.toString()
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // ==========================================
  // TAX SUMMARY GENERATION
  // ==========================================

  /**
   * Generate tax summary documents
   * @param {Object} payrollData - Payroll data
   * @param {Object} options - Tax generation options
   * @returns {Object} Tax summary result
   */
  async generateTaxSummary(payrollData, options = {}) {
    try {
      const {
        format = 'pdf', // 'pdf', 'excel', 'csv'
        taxYear = new Date().getFullYear(),
        includeQuarterly = true
      } = options

      // Calculate tax summary data
      const taxSummary = this.calculateTaxSummary(payrollData, taxYear)

      // Generate based on format
      switch (format) {
        case 'pdf':
          return await this.generateTaxSummaryPDF(taxSummary, payrollData)
        case 'excel':
          return await this.generateTaxSummaryExcel(taxSummary, payrollData)
        case 'csv':
          return await this.generateTaxSummaryCSV(taxSummary, payrollData)
        default:
          throw new Error(`Unsupported tax summary format: ${format}`)
      }

    } catch (error) {
      console.error('Error generating tax summary:', error)
      throw error
    }
  }

  /**
   * Calculate tax summary data
   * @param {Object} payrollData - Payroll data
   * @param {number} taxYear - Tax year
   * @returns {Object} Tax summary
   */
  calculateTaxSummary(payrollData, taxYear) {
    const validRecords = payrollData.payrollRecords.filter(record => !record.error)

    const taxSummary = {
      taxYear,
      totalPayments: 0,
      totalCommissions: 0,
      totalTierBonuses: 0,
      totalDeductions: 0,
      staffSummaries: [],
      requires1099: []
    }

    validRecords.forEach(record => {
      const staffTaxData = {
        staffName: record.staffName,
        email: record.email,
        role: record.role,
        totalEarnings: record.netEarnings,
        serviceCommissions: record.serviceCommissions.total,
        productCommissions: record.productCommissions.total,
        tierBonuses: record.totalTierBonuses,
        deductions: record.totalDeductions,
        ytdTotals: record.ytdTotals,
        requires1099: record.taxInfo.requires1099,
        isEmployee: record.taxInfo.isEmployee
      }

      taxSummary.staffSummaries.push(staffTaxData)
      taxSummary.totalPayments += record.netEarnings
      taxSummary.totalCommissions += record.serviceCommissions.total + record.productCommissions.total
      taxSummary.totalTierBonuses += record.totalTierBonuses
      taxSummary.totalDeductions += record.totalDeductions

      if (staffTaxData.requires1099 && staffTaxData.totalEarnings >= 600) {
        taxSummary.requires1099.push(staffTaxData)
      }
    })

    return taxSummary
  }

  /**
   * Generate tax summary PDF
   * @param {Object} taxSummary - Tax summary data
   * @param {Object} payrollData - Full payroll data
   * @returns {Object} PDF result
   */
  async generateTaxSummaryPDF(taxSummary, payrollData) {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`${taxSummary.taxYear} Tax Summary Report`, 20, 25)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35)
    doc.text(`Business: ${payrollData.barbershopInfo.name || 'BookedBarber Business'}`, 20, 42)

    // Summary table
    const summaryData = [
      ['Total Staff Payments', `$${taxSummary.totalPayments.toFixed(2)}`],
      ['Total Commissions Paid', `$${taxSummary.totalCommissions.toFixed(2)}`],
      ['Total Performance Bonuses', `$${taxSummary.totalTierBonuses.toFixed(2)}`],
      ['Total Deductions', `$${taxSummary.totalDeductions.toFixed(2)}`],
      ['Staff Requiring 1099s', taxSummary.requires1099.length.toString()]
    ]

    doc.autoTable({
      startY: 50,
      head: [['Tax Summary', 'Amount']],
      body: summaryData,
      theme: 'striped'
    })

    // Individual staff tax data
    if (taxSummary.staffSummaries.length > 0) {
      const staffTaxData = taxSummary.staffSummaries.map(staff => [
        staff.staffName,
        staff.requires1099 ? 'Yes' : 'No',
        `$${staff.totalEarnings.toFixed(2)}`,
        `$${staff.ytdTotals.totalEarnings.toFixed(2)}`
      ])

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Staff Member', 'Requires 1099', 'Period Total', 'YTD Total']],
        body: staffTaxData,
        theme: 'striped',
        styles: { fontSize: 9 }
      })
    }

    // Footer
    doc.setFontSize(8)
    doc.text('This report is for tax preparation purposes only. Consult a tax professional for compliance.', 20, 270)

    const pdfBlob = doc.output('blob')
    const fileName = `tax-summary-${taxSummary.taxYear}.pdf`

    return {
      success: true,
      format: 'tax-summary-pdf',
      fileName,
      fileSize: pdfBlob.size,
      data: pdfBlob,
      downloadUrl: URL.createObjectURL(pdfBlob),
      metadata: {
        taxYear: taxSummary.taxYear,
        requires1099Count: taxSummary.requires1099.length,
        generatedAt: new Date().toISOString()
      }
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Generate standardized file names
   * @param {string} format - File format
   * @param {Object} dateRange - Date range
   * @returns {string} Generated filename
   */
  generateFileName(format, dateRange) {
    const startDate = new Date(dateRange.start).toISOString().split('T')[0]
    const endDate = new Date(dateRange.end).toISOString().split('T')[0]
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    
    return `payroll-report_${startDate}_to_${endDate}_${timestamp}.${format}`
  }

  /**
   * Save export record for history tracking
   * @param {Object} exportResult - Export result
   * @param {Object} exportOptions - Original export options
   * @returns {Object} Saved record
   */
  async saveExportRecord(exportResult, exportOptions) {
    try {
      const { shopId, userId } = await staffService.getUserBarbershopId()

      const exportRecord = {
        barbershop_id: shopId,
        generated_by: userId,
        export_format: exportResult.format,
        file_name: exportResult.fileName,
        file_size: exportResult.fileSize,
        date_range_start: exportOptions.dateRange?.start,
        date_range_end: exportOptions.dateRange?.end,
        staff_filter: exportOptions.staffFilter || 'all',
        export_options: exportOptions,
        record_count: exportResult.metadata?.recordCount || 0,
        status: 'completed',
        created_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('payroll_export_history')
        .insert([exportRecord])
        .select()
        .single()

      if (error) {
        console.warn('Could not save export record:', error)
        return null
      }

      return data
    } catch (error) {
      console.warn('Error saving export record:', error)
      return null
    }
  }

  /**
   * Get export history for a barbershop
   * @param {number} limit - Number of records to return
   * @returns {Array} Export history
   */
  async getExportHistory(limit = 50) {
    try {
      const { shopId } = await staffService.getUserBarbershopId()

      const { data, error } = await this.supabase
        .from('payroll_export_history')
        .select('*')
        .eq('barbershop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching export history:', error)
      return []
    }
  }

  /**
   * Clean up old export records and files
   * @param {number} daysOld - Age threshold in days
   * @returns {Object} Cleanup result
   */
  async cleanupOldExports(daysOld = 30) {
    try {
      const { shopId } = await staffService.getUserBarbershopId()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await this.supabase
        .from('payroll_export_history')
        .delete()
        .eq('barbershop_id', shopId)
        .lt('created_at', cutoffDate.toISOString())
        .select()

      if (error) throw error

      return {
        success: true,
        deletedRecords: data?.length || 0,
        cutoffDate: cutoffDate.toISOString()
      }
    } catch (error) {
      console.error('Error cleaning up old exports:', error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const payrollExportService = new PayrollExportService()
export default payrollExportService