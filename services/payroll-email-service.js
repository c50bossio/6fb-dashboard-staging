/**
 * Payroll Email Service
 * Handles automated email delivery for payroll reports
 * Integrates with SendGrid for professional email templates and delivery
 */

import sgMail from '@sendgrid/mail'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export class PayrollEmailService {
  constructor() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    }
    this.supabase = createClient()
  }

  /**
   * Send payroll report via email
   * @param {Object} emailOptions - Email configuration
   * @returns {Object} Send result
   */
  async sendPayrollReport(emailOptions) {
    try {
      const {
        recipients,
        reportData,
        scheduleName = 'Payroll Report',
        barbershopId,
        customMessage = '',
        includeDownloadLink = true
      } = emailOptions

      // Get barbershop information for email branding
      const barbershopInfo = await this.getBarbershopInfo(barbershopId)

      // Prepare email content
      const emailContent = this.generateEmailContent({
        barbershopInfo,
        reportData,
        scheduleName,
        customMessage,
        includeDownloadLink
      })

      // Prepare attachment
      const attachment = await this.prepareAttachment(reportData)

      // Send email to each recipient
      const sendResults = await Promise.allSettled(
        recipients.map(recipient => this.sendIndividualEmail({
          to: recipient,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          attachments: attachment ? [attachment] : [],
          barbershopInfo
        }))
      )

      // Process results
      const successCount = sendResults.filter(result => result.status === 'fulfilled').length
      const failedRecipients = sendResults
        .map((result, index) => ({ result, recipient: recipients[index] }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ recipient, result }) => ({ 
          email: recipient, 
          error: result.reason?.message || 'Unknown error' 
        }))

      // Log email activity
      await this.logEmailActivity({
        barbershopId,
        reportFileName: reportData.fileName,
        recipients,
        successCount,
        failedRecipients,
        scheduleName
      })

      return {
        success: successCount > 0,
        totalRecipients: recipients.length,
        successCount,
        failedCount: failedRecipients.length,
        failedRecipients,
        messageId: sendResults[0]?.value?.messageId
      }

    } catch (error) {
      console.error('Error sending payroll report email:', error)
      throw error
    }
  }

  /**
   * Send individual email
   * @param {Object} emailData - Individual email data
   * @returns {Object} SendGrid response
   */
  async sendIndividualEmail(emailData) {
    const {
      to,
      subject,
      html,
      text,
      attachments = [],
      barbershopInfo
    } = emailData

    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'reports@bookedbarber.com',
        name: barbershopInfo.name || 'BookedBarber'
      },
      replyTo: barbershopInfo.email || process.env.SENDGRID_REPLY_TO_EMAIL,
      subject,
      text,
      html,
      attachments,
      categories: ['payroll-report', 'automated-report'],
      customArgs: {
        barbershop_id: barbershopInfo.id,
        report_type: 'payroll'
      }
    }

    return await sgMail.send(msg)
  }

  /**
   * Generate email content with professional template
   * @param {Object} contentOptions - Content generation options
   * @returns {Object} Email content (subject, html, text)
   */
  generateEmailContent(contentOptions) {
    const {
      barbershopInfo,
      reportData,
      scheduleName,
      customMessage,
      includeDownloadLink
    } = contentOptions

    const subject = `${scheduleName} - ${barbershopInfo.name || 'Payroll Report'}`
    
    // Generate HTML content
    const html = this.generateHTMLTemplate({
      barbershopInfo,
      reportData,
      scheduleName,
      customMessage,
      includeDownloadLink
    })

    // Generate plain text version
    const text = this.generateTextTemplate({
      barbershopInfo,
      reportData,
      scheduleName,
      customMessage,
      includeDownloadLink
    })

    return { subject, html, text }
  }

  /**
   * Generate professional HTML email template
   * @param {Object} templateData - Template data
   * @returns {string} HTML content
   */
  generateHTMLTemplate(templateData) {
    const {
      barbershopInfo,
      reportData,
      scheduleName,
      customMessage,
      includeDownloadLink
    } = templateData

    const reportDate = new Date().toLocaleDateString()
    const reportSizeMB = (reportData.fileSize / 1024 / 1024).toFixed(1)
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${scheduleName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: #1a1a1a; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .report-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .report-info h3 { margin: 0 0 15px 0; color: #1a1a1a; }
        .report-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .detail-item { }
        .detail-label { font-weight: bold; color: #666; font-size: 14px; }
        .detail-value { font-size: 16px; color: #1a1a1a; margin-top: 2px; }
        .download-section { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .download-button { display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px; }
        .download-button:hover { background-color: #218838; }
        .custom-message { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .footer a { color: #007bff; text-decoration: none; }
        .security-note { font-size: 12px; color: #666; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }
        @media (max-width: 600px) {
            .report-details { grid-template-columns: 1fr; }
            .content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>${barbershopInfo.name || 'BookedBarber'}</h1>
            <p>Payroll Report Delivery</p>
        </div>

        <!-- Main Content -->
        <div class="content">
            <h2>Your ${scheduleName} is Ready</h2>
            <p>Hello,</p>
            <p>Your scheduled payroll report has been generated and is attached to this email.</p>

            ${customMessage ? `
            <div class="custom-message">
                <h3>Message from ${barbershopInfo.name}</h3>
                <p>${customMessage.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}

            <!-- Report Information -->
            <div class="report-info">
                <h3>Report Details</h3>
                <div class="report-details">
                    <div class="detail-item">
                        <div class="detail-label">Report Name</div>
                        <div class="detail-value">${reportData.fileName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Generated Date</div>
                        <div class="detail-value">${reportDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Format</div>
                        <div class="detail-value">${reportData.format.toUpperCase()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">File Size</div>
                        <div class="detail-value">${reportSizeMB} MB</div>
                    </div>
                    ${reportData.metadata?.recordCount ? `
                    <div class="detail-item">
                        <div class="detail-label">Records Included</div>
                        <div class="detail-value">${reportData.metadata.recordCount}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${includeDownloadLink && reportData.downloadUrl ? `
            <div class="download-section">
                <h3>Alternative Download</h3>
                <p>If you cannot access the attachment, you can download the report using the link below:</p>
                <a href="${reportData.downloadUrl}" class="download-button">Download Report</a>
                <div class="security-note">
                    <strong>Security Note:</strong> This download link is valid for 24 hours and will expire automatically.
                </div>
            </div>
            ` : ''}

            <!-- Instructions -->
            <h3>What's Included</h3>
            <ul>
                <li><strong>Executive Summary:</strong> High-level payroll overview and totals</li>
                <li><strong>Staff Details:</strong> Individual commission breakdowns and earnings</li>
                <li><strong>Service Commissions:</strong> Revenue from services provided</li>
                <li><strong>Product Commissions:</strong> Revenue from product sales</li>
                <li><strong>Performance Tiers:</strong> Bonus calculations and tier progress</li>
                <li><strong>YTD Summaries:</strong> Year-to-date totals for tax preparation</li>
            </ul>

            <h3>Questions or Support</h3>
            <p>If you have questions about this report or need assistance:</p>
            <ul>
                <li>Email: ${barbershopInfo.email || 'support@bookedbarber.com'}</li>
                <li>Phone: ${barbershopInfo.phone || 'Contact your administrator'}</li>
            </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>BookedBarber Payroll System</strong></p>
            <p>This is an automated report delivery. Please do not reply to this email.</p>
            <p>
                <a href="https://bookedbarber.com/privacy">Privacy Policy</a> | 
                <a href="https://bookedbarber.com/terms">Terms of Service</a>
            </p>
            <div class="security-note">
                <p><strong>Security Reminder:</strong> This email contains confidential payroll information. Please ensure it is shared only with authorized personnel.</p>
            </div>
        </div>
    </div>
</body>
</html>`
  }

  /**
   * Generate plain text email template
   * @param {Object} templateData - Template data
   * @returns {string} Plain text content
   */
  generateTextTemplate(templateData) {
    const {
      barbershopInfo,
      reportData,
      scheduleName,
      customMessage,
      includeDownloadLink
    } = templateData

    const reportDate = new Date().toLocaleDateString()
    const reportSizeMB = (reportData.fileSize / 1024 / 1024).toFixed(1)

    return `
${barbershopInfo.name || 'BookedBarber'} - Payroll Report Delivery

Your ${scheduleName} is Ready

Hello,

Your scheduled payroll report has been generated and is attached to this email.

${customMessage ? `
MESSAGE FROM ${barbershopInfo.name?.toUpperCase() || 'MANAGEMENT'}:
${customMessage}

` : ''}REPORT DETAILS:
- Report Name: ${reportData.fileName}
- Generated Date: ${reportDate}
- Format: ${reportData.format.toUpperCase()}
- File Size: ${reportSizeMB} MB${reportData.metadata?.recordCount ? `
- Records Included: ${reportData.metadata.recordCount}` : ''}

${includeDownloadLink && reportData.downloadUrl ? `
ALTERNATIVE DOWNLOAD:
If you cannot access the attachment, download here:
${reportData.downloadUrl}

Security Note: This download link is valid for 24 hours and will expire automatically.

` : ''}WHAT'S INCLUDED:
- Executive Summary: High-level payroll overview and totals
- Staff Details: Individual commission breakdowns and earnings
- Service Commissions: Revenue from services provided
- Product Commissions: Revenue from product sales
- Performance Tiers: Bonus calculations and tier progress
- YTD Summaries: Year-to-date totals for tax preparation

QUESTIONS OR SUPPORT:
- Email: ${barbershopInfo.email || 'support@bookedbarber.com'}
- Phone: ${barbershopInfo.phone || 'Contact your administrator'}

---
BookedBarber Payroll System
This is an automated report delivery. Please do not reply to this email.

Privacy Policy: https://bookedbarber.com/privacy
Terms of Service: https://bookedbarber.com/terms

Security Reminder: This email contains confidential payroll information. 
Please ensure it is shared only with authorized personnel.
`
  }

  /**
   * Prepare report attachment for email
   * @param {Object} reportData - Report data
   * @returns {Object} Attachment object
   */
  async prepareAttachment(reportData) {
    try {
      let content, contentType, encoding

      // Handle different data types
      if (reportData.data instanceof Blob) {
        // Convert Blob to Buffer
        const arrayBuffer = await reportData.data.arrayBuffer()
        content = Buffer.from(arrayBuffer).toString('base64')
        encoding = 'base64'
      } else if (Buffer.isBuffer(reportData.data)) {
        // Buffer data (Excel)
        content = reportData.data.toString('base64')
        encoding = 'base64'
      } else if (typeof reportData.data === 'string') {
        // String data (CSV)
        content = Buffer.from(reportData.data).toString('base64')
        encoding = 'base64'
      } else {
        throw new Error('Unsupported report data format')
      }

      // Determine content type
      switch (reportData.format) {
        case 'pdf':
          contentType = 'application/pdf'
          break
        case 'excel':
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'csv':
          contentType = 'text/csv'
          break
        default:
          contentType = 'application/octet-stream'
      }

      return {
        content,
        filename: reportData.fileName,
        type: contentType,
        disposition: 'attachment',
        contentId: 'payroll-report'
      }

    } catch (error) {
      console.error('Error preparing email attachment:', error)
      return null
    }
  }

  /**
   * Get barbershop information for email branding
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Barbershop info
   */
  async getBarbershopInfo(barbershopId) {
    try {
      const { data, error } = await this.supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single()

      if (error) {
        console.warn('Could not fetch barbershop info:', error)
        return {
          id: barbershopId,
          name: 'BookedBarber Business',
          email: null,
          phone: null
        }
      }

      return data
    } catch (error) {
      console.warn('Error fetching barbershop info:', error)
      return {
        id: barbershopId,
        name: 'BookedBarber Business',
        email: null,
        phone: null
      }
    }
  }

  /**
   * Log email activity for tracking
   * @param {Object} logData - Log data
   */
  async logEmailActivity(logData) {
    try {
      const {
        barbershopId,
        reportFileName,
        recipients,
        successCount,
        failedRecipients,
        scheduleName
      } = logData

      const logEntry = {
        barbershop_id: barbershopId,
        activity_type: 'payroll_email_sent',
        details: {
          scheduleName,
          reportFileName,
          recipientCount: recipients.length,
          successCount,
          failedCount: failedRecipients.length,
          failedRecipients: failedRecipients.map(f => ({ email: f.email, error: f.error }))
        },
        created_at: new Date().toISOString()
      }

      await this.supabase
        .from('email_activity_log')
        .insert([logEntry])

    } catch (error) {
      console.error('Error logging email activity:', error)
    }
  }

  /**
   * Send test email to verify configuration
   * @param {Object} testOptions - Test email options
   * @returns {Object} Test result
   */
  async sendTestEmail(testOptions) {
    try {
      const {
        recipient,
        barbershopId,
        senderName = 'BookedBarber Test'
      } = testOptions

      const barbershopInfo = await this.getBarbershopInfo(barbershopId)

      const testMessage = {
        to: recipient,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'test@bookedbarber.com',
          name: senderName
        },
        subject: 'BookedBarber Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Email Configuration Test</h2>
            <p>Hello,</p>
            <p>This is a test email to verify your BookedBarber email configuration is working correctly.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Configuration Details:</h3>
              <ul>
                <li><strong>Business:</strong> ${barbershopInfo.name}</li>
                <li><strong>Test Date:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Recipient:</strong> ${recipient}</li>
              </ul>
            </div>
            <p>If you received this email, your configuration is working properly and you can proceed to schedule automated payroll reports.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666;">
              This is a test email from BookedBarber. Please do not reply to this message.
            </p>
          </div>
        `,
        text: `
BookedBarber Email Configuration Test

Hello,

This is a test email to verify your BookedBarber email configuration is working correctly.

Configuration Details:
- Business: ${barbershopInfo.name}
- Test Date: ${new Date().toLocaleString()}
- Recipient: ${recipient}

If you received this email, your configuration is working properly and you can proceed to schedule automated payroll reports.

This is a test email from BookedBarber. Please do not reply to this message.
        `,
        categories: ['test-email'],
        customArgs: {
          barbershop_id: barbershopId,
          test_type: 'email_configuration'
        }
      }

      const result = await sgMail.send(testMessage)

      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        message: 'Test email sent successfully'
      }

    } catch (error) {
      console.error('Error sending test email:', error)
      return {
        success: false,
        error: error.message,
        message: 'Failed to send test email'
      }
    }
  }

  /**
   * Get email delivery statistics
   * @param {string} barbershopId - Barbershop ID
   * @param {number} days - Number of days to look back
   * @returns {Object} Email statistics
   */
  async getEmailStatistics(barbershopId, days = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await this.supabase
        .from('email_activity_log')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('activity_type', 'payroll_email_sent')
        .gte('created_at', startDate.toISOString())

      if (error) throw error

      const logs = data || []
      
      const statistics = {
        totalEmails: logs.length,
        totalRecipients: logs.reduce((sum, log) => sum + (log.details.recipientCount || 0), 0),
        successfulDeliveries: logs.reduce((sum, log) => sum + (log.details.successCount || 0), 0),
        failedDeliveries: logs.reduce((sum, log) => sum + (log.details.failedCount || 0), 0),
        uniqueRecipients: new Set(
          logs.flatMap(log => log.details.failedRecipients?.map(f => f.email) || [])
        ).size,
        deliveryRate: 0,
        mostRecentSend: logs.length > 0 ? logs[0].created_at : null,
        dailyBreakdown: this.calculateDailyBreakdown(logs, days)
      }

      // Calculate delivery rate
      const totalAttempts = statistics.successfulDeliveries + statistics.failedDeliveries
      statistics.deliveryRate = totalAttempts > 0 
        ? (statistics.successfulDeliveries / totalAttempts * 100).toFixed(1)
        : 0

      return statistics

    } catch (error) {
      console.error('Error getting email statistics:', error)
      return {
        totalEmails: 0,
        totalRecipients: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        uniqueRecipients: 0,
        deliveryRate: 0,
        mostRecentSend: null,
        dailyBreakdown: []
      }
    }
  }

  /**
   * Calculate daily email breakdown
   * @param {Array} logs - Email logs
   * @param {number} days - Number of days
   * @returns {Array} Daily breakdown
   */
  calculateDailyBreakdown(logs, days) {
    const breakdown = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayLogs = logs.filter(log => 
        log.created_at.startsWith(dateStr)
      )

      breakdown.push({
        date: dateStr,
        emails: dayLogs.length,
        recipients: dayLogs.reduce((sum, log) => sum + (log.details.recipientCount || 0), 0),
        successful: dayLogs.reduce((sum, log) => sum + (log.details.successCount || 0), 0),
        failed: dayLogs.reduce((sum, log) => sum + (log.details.failedCount || 0), 0)
      })
    }

    return breakdown.reverse() // Most recent first
  }

  /**
   * Validate email configuration
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Validation result
   */
  async validateEmailConfiguration(barbershopId) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Check SendGrid API key
    if (!process.env.SENDGRID_API_KEY) {
      validation.isValid = false
      validation.errors.push('SendGrid API key not configured')
    }

    // Check from email
    if (!process.env.SENDGRID_FROM_EMAIL) {
      validation.isValid = false
      validation.errors.push('From email address not configured')
    }

    // Check barbershop configuration
    try {
      const barbershopInfo = await this.getBarbershopInfo(barbershopId)
      
      if (!barbershopInfo.email) {
        validation.warnings.push('Barbershop email not set - using default reply-to address')
      }
      
      if (!barbershopInfo.name) {
        validation.warnings.push('Barbershop name not set - using default sender name')
      }

    } catch (error) {
      validation.warnings.push('Could not verify barbershop configuration')
    }

    return validation
  }

  /**
   * Send export email with attachment
   * @param {Object} exportData - Export data and file info
   * @returns {Object} Send result
   */
  async sendExportEmail(exportData) {
    const emailOptions = {
      recipients: exportData.recipients || [],
      reportData: exportData.exportData,
      scheduleName: exportData.scheduleName || 'Payroll Export',
      barbershopId: exportData.shopInfo?.id,
      customMessage: exportData.customMessage || '',
      includeDownloadLink: true
    }

    return await this.sendPayrollReport(emailOptions)
  }

  /**
   * Send scheduled report email
   * @param {Object} scheduleData - Schedule configuration and export data
   * @returns {Object} Send result
   */
  async sendScheduledReport(scheduleData) {
    const emailOptions = {
      recipients: scheduleData.email_recipients || [],
      reportData: scheduleData.exportData,
      scheduleName: scheduleData.name || 'Scheduled Payroll Report',
      barbershopId: scheduleData.shop_id,
      customMessage: `This is your ${scheduleData.schedule_type} payroll report.`,
      includeDownloadLink: true
    }

    return await this.sendPayrollReport(emailOptions)
  }

  /**
   * Validate email configuration
   * @returns {Object} Configuration status
   */
  validateEmailConfig() {
    return {
      isValid: !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL),
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      fromEmailSet: !!process.env.SENDGRID_FROM_EMAIL,
      templatesValid: true // Assuming templates are always available
    }
  }

  /**
   * Generate export email template
   * @param {Object} templateData - Template configuration
   * @returns {Object} HTML and text templates
   */
  generateExportEmailTemplate(templateData) {
    const { exportData, shopInfo, customMessage } = templateData
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payroll Report - ${shopInfo?.name || 'Your Barbershop'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
          .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${shopInfo?.name || 'Your Barbershop'}</h1>
          <h2>Payroll Report</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your payroll report has been generated and is ready for review.</p>
          ${customMessage ? `<p><strong>Message:</strong> ${customMessage}</p>` : ''}
          <p><strong>Report Details:</strong></p>
          <ul>
            <li>Format: ${exportData?.format?.toUpperCase() || 'PDF'}</li>
            <li>File Size: ${this.formatFileSize(exportData?.file_size || 0)}</li>
            <li>Generated: ${new Date().toLocaleDateString()}</li>
          </ul>
          ${exportData?.file_url ? `<p><a href="${exportData.file_url}" class="button">Download Report</a></p>` : ''}
          <p>Thank you for using our payroll system!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${shopInfo?.name || 'Your Barbershop'}. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `

    const text = `
      ${shopInfo?.name || 'Your Barbershop'} - Payroll Report
      
      Hello,
      
      Your payroll report has been generated and is ready for review.
      
      ${customMessage ? `Message: ${customMessage}\n` : ''}
      Report Details:
      - Format: ${exportData?.format?.toUpperCase() || 'PDF'}
      - File Size: ${this.formatFileSize(exportData?.file_size || 0)}
      - Generated: ${new Date().toLocaleDateString()}
      
      ${exportData?.file_url ? `Download Report: ${exportData.file_url}\n` : ''}
      
      Thank you for using our payroll system!
      
      © ${new Date().getFullYear()} ${shopInfo?.name || 'Your Barbershop'}. All rights reserved.
      This is an automated message. Please do not reply to this email.
    `

    return { html, text }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Export singleton instance
export const payrollEmailService = new PayrollEmailService()
export default payrollEmailService