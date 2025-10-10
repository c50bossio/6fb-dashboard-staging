/**
 * Template Presets Utility
 * 
 * Generates professional communication templates based on booking rules
 * and business information with different tone variations.
 */

export class TemplatePresets {
  /**
   * Generate all templates for the given rules and business info
   */
  static generateAllTemplates(rules, businessInfo, tone = 'professional') {
    return {
      website_policy: this.generateWebsitePolicy(rules, businessInfo, tone),
      email_confirmation: this.generateEmailConfirmation(rules, businessInfo, tone),
      email_reminder: this.generateEmailReminder(rules, businessInfo, tone),
      sms_confirmation: this.generateSMSConfirmation(rules, businessInfo, tone),
      sms_reminder: this.generateSMSReminder(rules, businessInfo, tone),
      cancellation_notice: this.generateCancellationNotice(rules, businessInfo, tone)
    }
  }

  /**
   * Generate website booking policy
   */
  static generateWebsitePolicy(rules, businessInfo, tone) {
    const toneStyles = this.getToneStyles(tone)
    const formatTime = this.formatTime
    const formatFee = this.formatFee

    return `${toneStyles.greeting}

${toneStyles.bookingTitle}

${rules.minAdvanceBooking > 0 ? `• Appointments must be scheduled at least ${Math.floor(rules.minAdvanceBooking / 60)} hours in advance` : '• Same-day appointments are welcome'}
${rules.maxAdvanceBooking > 0 ? `• Bookings accepted up to ${rules.maxAdvanceBooking} days in advance` : ''}
${rules.requireDeposit ? `• A ${rules.depositType === 'percentage' ? rules.depositAmount + '%' : '$' + rules.depositAmount} deposit is required to secure your appointment` : ''}
${rules.requireFullPayment ? `• Full payment is required at the time of booking` : ''}
${rules.maxActiveBookings > 0 ? `• Maximum of ${rules.maxActiveBookings} active appointments per client` : ''}

${toneStyles.cancellationTitle}

${rules.cancellationWindow > 0 ? `• Cancellations must be made at least ${formatTime(rules.cancellationWindow)} before your appointment` : ''}
${rules.cancellationFee > 0 ? `• Late cancellations are subject to a ${formatFee(rules.cancellationFee, rules.cancellationFeeType)} fee` : '• No cancellation fees apply'}
${rules.allowRescheduling ? `• Rescheduling is allowed up to ${formatTime(rules.rescheduleWindow)} before your appointment` : '• Rescheduling policies apply'}
${rules.noShowFee > 0 ? this.generateEnhancedNoShowPolicyText(rules, 'website') : ''}

${toneStyles.requirementsTitle}

${rules.collectClientInfo.includes('name') ? '• Full name required' : ''}
${rules.collectClientInfo.includes('phone') ? '• Phone number required for appointment confirmations' : ''}
${rules.collectClientInfo.includes('email') ? '• Email address required for booking confirmations' : ''}
${rules.requireTermsAcceptance ? '• Agreement to terms and conditions required' : ''}

${toneStyles.communicationTitle}

${rules.sendConfirmationEmail ? '• Email confirmation sent immediately after booking' : ''}
${rules.sendReminderEmail ? `• Email reminder sent ${formatTime(rules.reminderTiming)} before your appointment` : ''}
${rules.sendConfirmationSMS ? '• SMS confirmation sent for all bookings' : ''}
${rules.sendReminderSMS ? `• SMS reminder sent ${formatTime(rules.reminderTiming)} before your appointment` : ''}

${toneStyles.contactInfo}
📞 ${businessInfo.phone}
✉️ ${businessInfo.email}
🌐 ${businessInfo.website}

${toneStyles.closing}`
  }

  /**
   * Generate email confirmation template
   */
  static generateEmailConfirmation(rules, businessInfo, tone) {
    const toneStyles = this.getToneStyles(tone)
    
    return `Subject: ${toneStyles.confirmationSubject} - {{appointment_date}} at {{appointment_time}}

${toneStyles.emailGreeting} {{customer_name}},

${toneStyles.confirmationMessage}

📅 **Appointment Details:**
• Service: {{service_name}}
• Date: {{appointment_date}}
• Time: {{appointment_time}}
• Duration: {{service_duration}} minutes
• Barber: {{barber_name}}
• Price: \${{service_price}}

📍 **Location:**
${businessInfo.name}
${businessInfo.address}

${rules.requireDeposit ? `💰 **Payment Information:**
${rules.depositType === 'percentage' ? 'Deposit of ' + rules.depositAmount + '% ($' + '{{deposit_amount}}' + ') has been processed.' : 'Deposit of $' + rules.depositAmount + ' has been processed.'}
${rules.requireFullPayment ? 'Full payment of $' + '{{total_amount}}' + ' has been processed.' : 'Remaining balance of $' + '{{remaining_balance}}' + ' is due at appointment.'}

` : ''}${rules.cancellationWindow > 0 ? `📋 **Important Policies:**
• Please arrive 5-10 minutes early
• Cancellations must be made ${this.formatTime(rules.cancellationWindow)} in advance
${rules.cancellationFee > 0 ? `• Late cancellation fee: ${this.formatFee(rules.cancellationFee, rules.cancellationFeeType)}` : ''}
${rules.noShowFee > 0 ? this.generateEnhancedNoShowPolicyText(rules, 'email') : ''}

` : ''}${rules.sendReminderEmail ? `📧 You'll receive a reminder email ${this.formatTime(rules.reminderTiming)} before your appointment.

` : ''}${toneStyles.needChanges}

📞 ${businessInfo.phone}
✉️ ${businessInfo.email}

${toneStyles.emailClosing}
${businessInfo.name}`
  }

  /**
   * Generate email reminder template
   */
  static generateEmailReminder(rules, businessInfo, tone) {
    const toneStyles = this.getToneStyles(tone)
    
    return `Subject: ${toneStyles.reminderSubject} - Tomorrow at {{appointment_time}}

${toneStyles.emailGreeting} {{customer_name}},

${toneStyles.reminderMessage}

📅 **Appointment Reminder:**
• Service: {{service_name}}
• Date: {{appointment_date}}
• Time: {{appointment_time}}
• Barber: {{barber_name}}
• Location: ${businessInfo.name}

${rules.requireDeposit && !rules.requireFullPayment ? `💰 **Payment Due:**
Remaining balance: ${{remaining_balance}}
(Deposit of ${{deposit_amount}} already processed)

` : ''}📋 **Please Remember:**
• Arrive 5-10 minutes early
• Bring a valid ID
${rules.cancellationWindow > 0 ? `• Last chance to cancel without fee is ${this.formatTime(rules.cancellationWindow)} before appointment` : ''}

${toneStyles.needChanges}

📞 ${businessInfo.phone}

${toneStyles.emailClosing}
${businessInfo.name}`
  }

  /**
   * Generate SMS confirmation template
   */
  static generateSMSConfirmation(rules, businessInfo, tone) {
    const toneStyles = this.getToneStyles(tone)
    
    if (tone === 'professional') {
      return `${businessInfo.name}: Appointment confirmed for {{appointment_date}} at {{appointment_time}} with {{barber_name}}. Service: {{service_name}} (\${{service_price}}). ${rules.cancellationWindow > 0 ? `Cancel ${this.formatTime(rules.cancellationWindow)} prior to avoid fees.` : ''} Questions? ${businessInfo.phone}`
    } else if (tone === 'friendly') {
      return `Hey {{customer_name}}! 🎉 Your appointment is booked at ${businessInfo.name} for {{appointment_date}} at {{appointment_time}} with {{barber_name}}. {{service_name}} - \${{service_price}}. ${rules.cancellationWindow > 0 ? `Please cancel ${this.formatTime(rules.cancellationWindow)} ahead if needed.` : ''} See you soon! ${businessInfo.phone}`
    } else {
      return `${businessInfo.name}: Appointment confirmed {{appointment_date}} {{appointment_time}} - {{barber_name}} - {{service_name}} \${{service_price}}. ${rules.cancellationWindow > 0 ? `Must cancel ${this.formatTime(rules.cancellationWindow)} prior.` : ''} ${rules.cancellationFee > 0 ? `Late cancel fee applies.` : ''} ${businessInfo.phone}`
    }
  }

  /**
   * Generate SMS reminder template
   */
  static generateSMSReminder(rules, businessInfo, tone) {
    const toneStyles = this.getToneStyles(tone)
    
    if (tone === 'professional') {
      return `${businessInfo.name}: Reminder - Appointment tomorrow {{appointment_time}} with {{barber_name}} for {{service_name}}. Please arrive 5-10 min early. ${rules.requireDeposit && !rules.requireFullPayment ? `Balance due: ${{remaining_balance}}.` : ''} ${businessInfo.phone}`
    } else if (tone === 'friendly') {
      return `Hi {{customer_name}}! 👋 Just a friendly reminder about your appointment tomorrow at {{appointment_time}} with {{barber_name}} at ${businessInfo.name}. ${rules.requireDeposit && !rules.requireFullPayment ? `Don't forget - ${{remaining_balance}} balance due.` : ''} Can't wait to see you! ✂️`
    } else {
      return `${businessInfo.name}: Tomorrow {{appointment_time}} - {{barber_name}} - {{service_name}}. Arrive on time. ${rules.requireDeposit && !rules.requireFullPayment ? `${{remaining_balance}} due.` : ''} ${businessInfo.phone}`
    }
  }

  /**
   * Generate cancellation notice template
   */
  static generateCancellationNotice(rules, businessInfo, tone) {
    const toneStyles = this.getToneStyles(tone)
    
    return `${toneStyles.cancellationNoticeTitle}

${toneStyles.cancellationGreeting}

${rules.cancellationWindow > 0 ? `**Cancellation Window:** ${this.formatTime(rules.cancellationWindow)} before appointment` : '**Cancellation:** Anytime before appointment'}

${rules.cancellationFee > 0 ? `**Late Cancellation Fee:** ${this.formatFee(rules.cancellationFee, rules.cancellationFeeType)}
This fee applies to cancellations made less than ${this.formatTime(rules.cancellationWindow)} before your scheduled appointment.

` : `**No Cancellation Fees:** We do not charge fees for cancellations made in advance.

`}${rules.noShowFee > 0 ? this.generateEnhancedNoShowPolicyText(rules, 'cancellation') : ''}${rules.noShowStrikeLimit > 0 ? `**No-Show Policy:** After ${rules.noShowStrikeLimit} no-shows within ${rules.noShowStrikePeriod || 90} days, booking restrictions may apply.

` : ''}${rules.allowRescheduling ? `**Rescheduling:** Available up to ${this.formatTime(rules.rescheduleWindow)} before your appointment at no charge.

` : ''}**How to Cancel or Reschedule:**
• Call us at ${businessInfo.phone}
• Email us at ${businessInfo.email}
${businessInfo.website ? `• Use our online booking system at ${businessInfo.website}` : ''}

${toneStyles.cancellationClosing}

${businessInfo.name}
${businessInfo.phone}
${businessInfo.email}`
  }

  /**
   * Get tone-specific styles and language
   */
  static getToneStyles(tone) {
    const styles = {
      professional: {
        greeting: "Welcome to our professional booking system. Please review our policies below to ensure a smooth experience.",
        bookingTitle: "**BOOKING REQUIREMENTS**",
        cancellationTitle: "**CANCELLATION POLICY**",
        requirementsTitle: "**CLIENT REQUIREMENTS**", 
        communicationTitle: "**COMMUNICATIONS**",
        contactInfo: "**CONTACT INFORMATION**",
        closing: "Thank you for choosing our services. We look forward to serving you.",
        confirmationSubject: "Appointment Confirmed",
        reminderSubject: "Appointment Reminder",
        emailGreeting: "Dear",
        confirmationMessage: "Your appointment has been successfully confirmed. Please review the details below:",
        reminderMessage: "This is a reminder of your upcoming appointment:",
        needChanges: "Need to make changes? Please contact us as soon as possible:",
        emailClosing: "Sincerely,",
        cancellationNoticeTitle: "CANCELLATION & NO-SHOW POLICY",
        cancellationGreeting: "Please review our cancellation and no-show policies:",
        cancellationClosing: "We appreciate your understanding and cooperation."
      },
      friendly: {
        greeting: "Hey there! 👋 Welcome to our booking system. We're excited to have you! Here's what you need to know:",
        bookingTitle: "**Booking Made Easy** 📅",
        cancellationTitle: "**Cancellation Info** 📝",
        requirementsTitle: "**What We Need From You** ℹ️",
        communicationTitle: "**How We'll Stay in Touch** 📱",
        contactInfo: "**Get in Touch Anytime** 📞",
        closing: "Can't wait to see you! We're here to make you look and feel amazing! ✨",
        confirmationSubject: "You're All Set! Appointment Confirmed ✂️",
        reminderSubject: "See You Soon! Appointment Tomorrow",
        emailGreeting: "Hey",
        confirmationMessage: "Awesome! Your appointment is all set. Here are all the details:",
        reminderMessage: "Just a friendly heads up about your appointment tomorrow!",
        needChanges: "Need to change anything? No worries! Just reach out:",
        emailClosing: "Looking forward to seeing you soon!",
        cancellationNoticeTitle: "Cancellation Policy (The Friendly Version) 😊",
        cancellationGreeting: "Life happens, we get it! Here's our super simple cancellation policy:",
        cancellationClosing: "Thanks for being understanding! We can't wait to help you look amazing."
      },
      strict: {
        greeting: "IMPORTANT: Read all policies carefully before booking. All policies are strictly enforced.",
        bookingTitle: "**BOOKING REQUIREMENTS (MANDATORY)**",
        cancellationTitle: "**CANCELLATION POLICY (STRICTLY ENFORCED)**",
        requirementsTitle: "**MANDATORY REQUIREMENTS**",
        communicationTitle: "**NOTIFICATION SYSTEM**",
        contactInfo: "**CONTACT FOR POLICY QUESTIONS**",
        closing: "Failure to comply with policies may result in booking restrictions or account suspension.",
        confirmationSubject: "CONFIRMED - Appointment Booked",
        reminderSubject: "REQUIRED - Appointment Tomorrow",
        emailGreeting: "Client",
        confirmationMessage: "Your appointment is confirmed. Review all details and policies below:",
        reminderMessage: "MANDATORY REMINDER: You have an appointment tomorrow.",
        needChanges: "Changes must be made according to policy. Contact immediately:",
        emailClosing: "Management,",
        cancellationNoticeTitle: "MANDATORY CANCELLATION POLICY - NO EXCEPTIONS",
        cancellationGreeting: "All cancellation policies are strictly enforced without exception:",
        cancellationClosing: "Policy violations will result in account restrictions. No exceptions granted."
      }
    }

    return styles[tone] || styles.professional
  }

  /**
   * Format time duration for display
   */
  static formatTime(hours) {
    if (hours === 0) return 'anytime'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days} day${days > 1 ? 's' : ''}`
    return `${days} day${days > 1 ? 's' : ''} and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
  }

  /**
   * Format fee for display
   */
  static formatFee(amount, type) {
    if (amount === 0) return 'No fee'
    if (type === 'percentage') return `${amount}% of service price`
    return `$${amount}`
  }

  /**
   * Generate enhanced no-show policy text for different contexts
   */
  static generateEnhancedNoShowPolicyText(rules, context = 'website') {
    const baseFee = this.formatFee(rules.noShowFee, rules.noShowFeeType)
    
    // Basic no-show policy if enhanced features not enabled
    if (!rules.enableGracePeriod && !rules.enableLoyaltyDiscount && !rules.enableServiceAdjustments) {
      if (context === 'website') {
        return `• No-show fee: ${baseFee}
${rules.noShowStrikeLimit > 0 ? `• After ${rules.noShowStrikeLimit} no-shows, future booking restrictions may apply` : ''}`
      } else if (context === 'email') {
        return `• No-show fee: ${baseFee}`
      } else {
        return `**No-Show Fee:** ${baseFee}
This fee is charged when clients miss their appointment without notice.

`
      }
    }

    // Enhanced no-show policy text
    if (context === 'website') {
      let policyText = `• **Enhanced No-Show Policy:** Fair and flexible fees based on your relationship with us
  - Base fee: ${baseFee} (adjusted by client history)`
      
      if (rules.enableGracePeriod !== false) {
        policyText += `\n  - First-time clients: Courtesy warning instead of fee`
      }
      
      if (rules.enableLoyaltyDiscount !== false) {
        policyText += `\n  - Loyal clients: 25% discount on any fees`
      }
      
      if (rules.enableServiceAdjustments !== false) {
        policyText += `\n  - Smart adjustments based on service duration and value`
      }
      
      if (rules.noShowStrikeLimit > 0) {
        policyText += `\n  - After ${rules.noShowStrikeLimit} no-shows: Recovery options available instead of permanent blocks`
      }
      
      return policyText

    } else if (context === 'email') {
      let policyText = `• Enhanced No-Show Policy: ${baseFee} base fee (adjusted by your history with us)`
      
      if (rules.enableGracePeriod !== false) {
        policyText += ` | First-time clients receive warnings only`
      }
      
      if (rules.enableLoyaltyDiscount !== false) {
        policyText += ` | Loyal clients get 25% discount`
      }
      
      return policyText

    } else { // cancellation context
      let policyText = `**Enhanced No-Show Policy:** 
Our fair and flexible system considers your relationship with us when determining fees.

**Base Fee:** ${baseFee}
This fee is adjusted based on:
`
      
      if (rules.enableGracePeriod !== false) {
        policyText += `• **First-Time Clients:** Receive a courtesy warning instead of a fee
`
      }
      
      if (rules.enableLoyaltyDiscount !== false) {
        policyText += `• **Loyal Clients:** Enjoy a 25% discount on any fees (6+ months, 10+ appointments)
`
      }
      
      if (rules.enableServiceAdjustments !== false) {
        policyText += `• **Service Value:** Longer and premium services may have adjusted fees
`
      }
      
      policyText += `
**Progressive Approach:**
• 1st No-Show: Reduced fee (50% of base)
• 2nd No-Show: Standard fee (75% of base)  
• 3rd+ No-Show: Enhanced fee (125% of base)

`
      
      if (rules.noShowStrikeLimit > 0) {
        policyText += `**Recovery Options:** After ${rules.noShowStrikeLimit} no-shows, we offer multiple paths to restore booking privileges instead of permanent restrictions.

`
      }
      
      return policyText
    }
  }

  /**
   * Generate custom template with user-provided content
   */
  static generateCustomTemplate(template, variables) {
    let result = template
    
    // Replace standard variables
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, variables[key])
    })

    return result
  }

  /**
   * Validate template variables
   */
  static validateTemplate(template) {
    const requiredVars = template.match(/{{(\w+)}}/g)
    return {
      isValid: true,
      requiredVariables: requiredVars || [],
      missingVariables: []
    }
  }

  /**
   * Get available template variables
   */
  static getAvailableVariables() {
    return {
      appointment: [
        'appointment_date',
        'appointment_time', 
        'service_name',
        'service_duration',
        'service_price',
        'barber_name',
        'total_amount',
        'deposit_amount',
        'remaining_balance'
      ],
      customer: [
        'customer_name',
        'customer_phone',
        'customer_email'
      ],
      business: [
        'business_name',
        'business_phone',
        'business_email',
        'business_address',
        'business_website'
      ]
    }
  }
}

export default TemplatePresets