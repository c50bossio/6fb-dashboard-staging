/**
 * Customer-focused messaging utilities
 * Following "How to Win Friends and Influence People" principles:
 * - Focus on the customer's interests and benefits
 * - Use positive, welcoming language
 * - Make customers feel valued and appreciated
 * - Avoid internal/technical terminology
 */

export class CustomerMessaging {
  
  /**
   * Transform internal service names to customer-friendly descriptions
   */
  static beautifyServiceName(serviceName) {
    // Handle test/internal service names
    const testServiceMap = {
      'SMS Verification Test': 'Premium Haircut',
      'High-Risk Premium Service': 'Executive Styling Package',
      'Risk-Monitored Service': 'Signature Cut & Style',
      'Missed Standard Cut': 'Classic Haircut',
      'AI Monitored Service': 'Precision Cut',
      'Smart Reminder Test Service': 'Premium Cut & Beard Trim',
      'Load Test Service': 'Traditional Barbering Service',
      'Error Test Service': 'Classic Style Service',
      'Production Ready Service': 'Master Barber Experience'
    }
    
    // Check for direct mapping first
    if (testServiceMap[serviceName]) {
      return testServiceMap[serviceName]
    }
    
    // Handle common patterns
    let beautified = serviceName
    
    // Remove test-related terms
    beautified = beautified.replace(/(?:SMS|Email|Test|Verification|Error|Load|Production|Debug|Mock|Demo|Sample)/gi, '')
    
    // Remove automation-related terms
    beautified = beautified.replace(/(?:Risk|Automation|Workflow|Escalation|Recovery|AI|Smart|Prediction|Alert)/gi, '')
    
    // Remove internal descriptors
    beautified = beautified.replace(/(?:High-Risk|Low-Risk|Monitored|Tracked|Automated)/gi, '')
    
    // Clean up extra spaces and hyphens
    beautified = beautified.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim()
    
    // If empty or too short after cleaning, provide a default
    if (!beautified || beautified.length < 3) {
      beautified = 'Premium Haircut'
    }
    
    // Capitalize properly
    beautified = this.toTitleCase(beautified)
    
    return beautified
  }
  
  /**
   * Generate customer-focused SMS messages
   */
  static generateCustomerFriendlySMS(type, data) {
    const serviceName = this.beautifyServiceName(data.serviceName)
    const customerName = data.customerName || 'Valued Customer'
    const shopName = data.shopName?.replace(/Test|Demo|Production/gi, '').trim() || 'Your Barbershop'
    
    switch (type) {
      case 'appointment_confirmation':
        return `Hi ${customerName}! 🎉 You're all set! Your ${serviceName} appointment is confirmed for ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName} at ${shopName}. Looking forward to seeing you! Confirmation: ${data.confirmationNumber}`
        
      case 'booking_reminder':
        return `Hi ${customerName}! ⏰ Just a friendly reminder - your ${serviceName} appointment is tomorrow (${data.appointmentDate} at ${data.appointmentTime}) with ${data.barberName}. Can't wait to see you at ${shopName}!`
        
      case 'payment_confirmation':
        return `Thank you ${customerName}! ✅ Your ${data.paymentAmount} payment for ${serviceName} on ${data.appointmentDate} has been confirmed. We appreciate your business! Receipt: ${data.transactionId}`
        
      case 'birthday_special':
        return `Happy Birthday ${customerName}! 🎂🎉 Celebrate with us and enjoy ${data.discountPercentage || 20}% off your next ${serviceName}. Book your special day appointment today! Valid for 30 days.`
        
      case 'anniversary_special':
        const years = data.yearsAsCustomer || 1
        return `Anniversary celebration time ${customerName}! 🎊 It's been ${years} amazing year${years > 1 ? 's' : ''} together. Enjoy ${data.discountPercentage || 25}% off your next visit as our thank you!`
        
      case 'smart_reminder_escalation':
        return `Hi ${customerName}! 🌟 Your ${serviceName} appointment is coming up (${data.appointmentDate} at ${data.appointmentTime}). We've reserved your favorite time slot with ${data.barberName}. See you soon!`
        
      case 'deposit_requirement':
        return `Hi ${customerName}! To secure your ${serviceName} appointment on ${data.appointmentDate}, we just need a small ${data.depositAmount} deposit. This ensures your preferred time with ${data.barberName} is held just for you!`
        
      case 'recovery_flow':
        return `Hi ${customerName}, we missed you at your recent appointment! Life happens - we understand. We'd love to welcome you back whenever you're ready. Your chair is always waiting at ${shopName}!`
        
      case 'no_show_response':
        return `Hi ${customerName}, we held your appointment slot today but missed seeing you. No worries - things come up! There's a small ${data.noShowFee} service fee, and we're here whenever you'd like to reschedule.`
        
      case 'risk_prediction_alert':
        return `Hi ${customerName}! 🌟 We noticed tomorrow might be a busy day. Just confirming your ${serviceName} appointment at ${data.appointmentTime} - we're excited to see you and have everything ready!`
        
      default:
        return `Hi ${customerName}! Your ${serviceName} appointment is confirmed for ${data.appointmentDate} at ${data.appointmentTime}. We're looking forward to seeing you at ${shopName}!`
    }
  }
  
  /**
   * Generate customer-focused email subjects
   */
  static generateCustomerFriendlySubject(type, data) {
    const serviceName = this.beautifyServiceName(data.serviceName)
    const customerName = data.customerName || 'Valued Customer'
    
    switch (type) {
      case 'appointment_confirmation':
        return `🎉 You're all set! ${serviceName} appointment confirmed`
        
      case 'booking_reminder':
        return `⏰ Tomorrow's ${serviceName} appointment reminder`
        
      case 'payment_confirmation':
        return `✅ Payment confirmed - Thank you ${customerName}!`
        
      case 'birthday_special':
        return `🎂 Happy Birthday ${customerName}! Special offer inside`
        
      case 'anniversary_special':
        return `🎊 ${customerName}, let's celebrate your anniversary!`
        
      case 'smart_reminder_escalation':
        return `🌟 Your appointment is coming up - we're ready for you!`
        
      case 'deposit_requirement':
        return `Secure your ${serviceName} appointment - almost there!`
        
      case 'recovery_flow':
        return `We miss you ${customerName} - come back anytime!`
        
      case 'no_show_response':
        return `${customerName}, let's get you rescheduled!`
        
      case 'risk_prediction_alert':
        return `🌟 Confirming your ${serviceName} appointment tomorrow`
        
      default:
        return `${serviceName} appointment confirmed for ${customerName}`
    }
  }
  
  /**
   * Generate customer-focused email content
   */
  static generateCustomerFriendlyEmailContent(type, data) {
    const serviceName = this.beautifyServiceName(data.serviceName)
    const customerName = data.customerName || 'Valued Customer'
    const shopName = data.shopName?.replace(/Test|Demo|Production/gi, '').trim() || 'Your Barbershop'
    
    switch (type) {
      case 'appointment_confirmation':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `🎉 Fantastic news! Your ${serviceName} appointment is all confirmed and we can't wait to see you.`,
          details: `You're scheduled for ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName} at ${shopName}.`,
          closing: `We've got everything prepared for your visit. Thank you for choosing us!`
        }
        
      case 'booking_reminder':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `⏰ Just a friendly reminder that your ${serviceName} appointment is tomorrow.`,
          details: `We're excited to see you ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName}.`,
          closing: `Everything is ready for your visit. See you tomorrow!`
        }
        
      case 'smart_reminder_escalation':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `🌟 Your ${serviceName} appointment is coming up and we want to make sure you don't miss out.`,
          details: `We've reserved your preferred time slot on ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName}.`,
          closing: `We're looking forward to providing you with an exceptional experience!`
        }
        
      case 'deposit_requirement':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `To secure your ${serviceName} appointment, we just need a small deposit to hold your spot.`,
          details: `Your appointment on ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName} requires a ${data.depositAmount} deposit.`,
          closing: `This ensures your preferred time is reserved just for you. We appreciate your understanding!`
        }
        
      case 'recovery_flow':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `We noticed you weren't able to make your recent appointment, and that's totally okay - life happens!`,
          details: `We'd love to welcome you back to ${shopName} whenever you're ready for your next ${serviceName}.`,
          closing: `Your satisfaction is important to us, and we're here whenever you'd like to reschedule.`
        }
        
      case 'no_show_response':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `We held your appointment slot today but missed seeing you for your ${serviceName}.`,
          details: `There's a small ${data.noShowFee} service fee, and we'd be happy to help you reschedule at your convenience.`,
          closing: `We understand things come up, and we're here to help make your next visit perfect!`
        }
        
      case 'risk_prediction_alert':
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `🌟 We're confirming your ${serviceName} appointment and want to make sure everything goes smoothly.`,
          details: `Your appointment is scheduled for ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName}.`,
          closing: `We have everything ready for your visit and are excited to provide you with exceptional service!`
        }
        
      default:
        return {
          greeting: `Hi ${customerName}!`,
          mainMessage: `Your ${serviceName} appointment is confirmed.`,
          details: `See you ${data.appointmentDate} at ${data.appointmentTime} at ${shopName}.`,
          closing: `We're looking forward to your visit!`
        }
    }
  }
  
  /**
   * Convert string to title case
   */
  static toTitleCase(str) {
    return str.toLowerCase().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }
  
  /**
   * Get customer-friendly shop name
   */
  static beautifyShopName(shopName) {
    if (!shopName) return 'Your Barbershop'
    
    // Remove test/demo terms but preserve the core name
    let cleaned = shopName.replace(/(?:\s*Test\s*|\s*Demo\s*|\s*Production\s*|\s*E2E\s*|\s*Mock\s*|\s*Debug\s*|\s*Sample\s*)/gi, ' ')
    
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    // If empty after cleaning, provide default
    if (!cleaned || cleaned.length < 3) {
      cleaned = 'Premier Barbershop'
    }
    
    return cleaned
  }
  
  /**
   * Get customer-friendly barber name
   */
  static beautifyBarberName(barberName) {
    if (!barberName) return 'Your Barber'
    
    // Remove test terms but preserve the core name
    let cleaned = barberName.replace(/(?:\s*Test\s*|\s*Demo\s*|\s*Mock\s*|\s*Debug\s*|\s*Sample\s*|\s*Production\s*)/gi, ' ')
    
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    // If empty after cleaning, provide default
    if (!cleaned || cleaned.length < 2) {
      cleaned = 'Master Barber'
    }
    
    return cleaned
  }
}