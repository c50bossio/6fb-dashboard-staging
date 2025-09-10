/**
 * Campaign Templates Library
 * Pre-built campaign templates for common barbershop marketing scenarios
 * Based on industry best practices from Booksy, Square, and Textedly
 */

export const campaignTemplates = {
  // APPOINTMENT REMINDERS
  appointment_reminder_24h: {
    id: 'appointment_reminder_24h',
    name: '24-Hour Appointment Reminder',
    category: 'reminders',
    type: 'sms',
    trigger: 'scheduled',
    timing: '-24 hours',
    subject: null,
    content: `Hi {{customer_name}}! This is a reminder of your appointment tomorrow at {{appointment_time}} with {{barber_name}} at {{shop_name}}. Reply C to cancel or R to reschedule.`,
    variables: ['customer_name', 'appointment_time', 'barber_name', 'shop_name'],
    icon: '⏰',
    description: 'Reduces no-shows by 70%',
    bestPractice: 'Send 24 hours before appointment for best results'
  },

  appointment_reminder_2h: {
    id: 'appointment_reminder_2h',
    name: '2-Hour Appointment Reminder',
    category: 'reminders',
    type: 'sms',
    trigger: 'scheduled',
    timing: '-2 hours',
    subject: null,
    content: `{{customer_name}}, see you soon! Your appointment with {{barber_name}} is in 2 hours at {{appointment_time}}. We're at {{shop_address}}. See you soon!`,
    variables: ['customer_name', 'barber_name', 'appointment_time', 'shop_address'],
    icon: '⏰',
    description: 'Last-minute reminder',
    bestPractice: 'Great for reducing same-day cancellations'
  },

  // REVIEW REQUESTS
  review_request_google: {
    id: 'review_request_google',
    name: 'Google Review Request',
    category: 'reviews',
    type: 'sms',
    trigger: 'post_appointment',
    timing: '+24 hours',
    subject: null,
    content: `Hi {{customer_name}}! Thanks for visiting {{shop_name}} yesterday. We'd love your feedback! Leave us a review: {{google_review_link}}`,
    variables: ['customer_name', 'shop_name', 'google_review_link'],
    icon: '⭐',
    description: 'Increases Google reviews by 300%',
    bestPractice: 'Send 24 hours after service when experience is fresh'
  },

  review_request_email: {
    id: 'review_request_email',
    name: 'Email Review Request',
    category: 'reviews', 
    type: 'email',
    trigger: 'post_appointment',
    timing: '+48 hours',
    subject: '{{customer_name}}, how was your experience at {{shop_name}}?',
    content: `
      <h2>Thank you for choosing {{shop_name}}!</h2>
      <p>Hi {{customer_name}},</p>
      <p>We hope you loved your recent haircut with {{barber_name}}. Your opinion matters to us and helps other customers find great barbers.</p>
      <p><strong>Would you mind taking 30 seconds to share your experience?</strong></p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{google_review_link}}" style="background: #4285f4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Leave a Google Review
        </a>
      </div>
      <p>Thank you for your support!</p>
      <p>Best,<br>The {{shop_name}} Team</p>
    `,
    variables: ['customer_name', 'shop_name', 'barber_name', 'google_review_link'],
    icon: '📧',
    description: 'Professional email review request',
    bestPractice: 'Follow up SMS with email for higher response rate'
  },

  // WIN-BACK CAMPAIGNS
  winback_no_show: {
    id: 'winback_no_show',
    name: 'No-Show Win-Back',
    category: 'winback',
    type: 'sms',
    trigger: 'missed_appointment',
    timing: '+1 day',
    subject: null,
    content: `Hi {{customer_name}}, we missed you yesterday! Everything okay? Book your next appointment and get 10% off: {{booking_link}}`,
    variables: ['customer_name', 'booking_link'],
    icon: '🎯',
    description: 'Recover lost customers',
    bestPractice: 'Send within 24 hours of no-show'
  },

  winback_inactive_30: {
    id: 'winback_inactive_30',
    name: '30-Day Inactive Customer',
    category: 'winback',
    type: 'sms',
    trigger: 'inactive',
    timing: '30 days',
    subject: null,
    content: `{{customer_name}}, it's been a month since your last cut! Time for a fresh look? Book now and save $5: {{booking_link}}`,
    variables: ['customer_name', 'booking_link'],
    icon: '💈',
    description: 'Re-engage inactive customers',
    bestPractice: 'Target customers inactive for 30+ days'
  },

  winback_inactive_60: {
    id: 'winback_inactive_60',
    name: '60-Day Win-Back Offer',
    category: 'winback',
    type: 'email',
    trigger: 'inactive',
    timing: '60 days',
    subject: 'We miss you at {{shop_name}}! Here\'s 20% off your next visit',
    content: `
      <h2>{{customer_name}}, it's been too long!</h2>
      <p>We noticed it's been over 2 months since your last visit to {{shop_name}}.</p>
      <p>We'd love to see you again! Here's an exclusive offer just for you:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #333;">20% OFF Your Next Service</h3>
        <p>Valid for the next 14 days</p>
        <p>Use code: <strong>COMEBACK20</strong></p>
      </div>
      <div style="text-align: center;">
        <a href="{{booking_link}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Book Now
        </a>
      </div>
    `,
    variables: ['customer_name', 'shop_name', 'booking_link'],
    icon: '🎁',
    description: 'Strong offer for long-inactive customers',
    bestPractice: 'Use bigger discounts for longer-inactive customers'
  },

  // BIRTHDAY CAMPAIGNS
  birthday_greeting: {
    id: 'birthday_greeting',
    name: 'Birthday Greeting',
    category: 'special_occasions',
    type: 'sms',
    trigger: 'birthday',
    timing: '9:00 AM',
    subject: null,
    content: `🎉 Happy Birthday {{customer_name}}! Celebrate with a fresh cut - enjoy 15% off this week at {{shop_name}}. Book: {{booking_link}}`,
    variables: ['customer_name', 'shop_name', 'booking_link'],
    icon: '🎂',
    description: 'Automated birthday wishes',
    bestPractice: 'Send at 9 AM on their birthday'
  },

  // HOLIDAY PROMOTIONS
  holiday_promotion: {
    id: 'holiday_promotion',
    name: 'Holiday Promotion',
    category: 'promotions',
    type: 'sms',
    trigger: 'manual',
    timing: 'manual',
    subject: null,
    content: `{{shop_name}} Holiday Special! Book your appointment before {{holiday_name}} and save {{discount_amount}}. Limited spots: {{booking_link}}`,
    variables: ['shop_name', 'holiday_name', 'discount_amount', 'booking_link'],
    icon: '🎄',
    description: 'Holiday special offers',
    bestPractice: 'Send 1-2 weeks before major holidays'
  },

  // NEW SERVICE ANNOUNCEMENT
  new_service_announcement: {
    id: 'new_service_announcement',
    name: 'New Service Launch',
    category: 'announcements',
    type: 'email',
    trigger: 'manual',
    timing: 'manual',
    subject: 'Introducing {{service_name}} at {{shop_name}}!',
    content: `
      <h2>Something New at {{shop_name}}!</h2>
      <p>Hi {{customer_name}},</p>
      <p>We're excited to announce our new service: <strong>{{service_name}}</strong></p>
      <p>{{service_description}}</p>
      <h3>Special Launch Offer:</h3>
      <p>Book in the next 7 days and get {{launch_discount}} off!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{booking_link}}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Book {{service_name}} Now
        </a>
      </div>
    `,
    variables: ['customer_name', 'shop_name', 'service_name', 'service_description', 'launch_discount', 'booking_link'],
    icon: '✨',
    description: 'Announce new services',
    bestPractice: 'Send to your most loyal customers first'
  },

  // LOYALTY PROGRAM
  loyalty_points_update: {
    id: 'loyalty_points_update',
    name: 'Loyalty Points Update',
    category: 'loyalty',
    type: 'sms',
    trigger: 'post_appointment',
    timing: 'immediate',
    subject: null,
    content: `{{customer_name}}, you earned {{points_earned}} points! You now have {{total_points}} points. {{points_to_reward}} more for a free service!`,
    variables: ['customer_name', 'points_earned', 'total_points', 'points_to_reward'],
    icon: '🏆',
    description: 'Loyalty program updates',
    bestPractice: 'Send immediately after earning points'
  },

  // STAFF INTRODUCTION
  new_barber_introduction: {
    id: 'new_barber_introduction',
    name: 'New Barber Introduction',
    category: 'announcements',
    type: 'email',
    trigger: 'manual',
    timing: 'manual',
    subject: 'Meet {{barber_name}} - Our Newest Barber at {{shop_name}}',
    content: `
      <h2>Welcome {{barber_name}} to Our Team!</h2>
      <p>We're excited to introduce our newest barber, {{barber_name}}!</p>
      <h3>About {{barber_name}}:</h3>
      <p>{{barber_bio}}</p>
      <p><strong>Specialties:</strong> {{barber_specialties}}</p>
      <h3>New Client Special:</h3>
      <p>Book with {{barber_name}} this month and get 20% off your first service!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{booking_link}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Book with {{barber_name}}
        </a>
      </div>
    `,
    variables: ['barber_name', 'shop_name', 'barber_bio', 'barber_specialties', 'booking_link'],
    icon: '✂️',
    description: 'Introduce new team members',
    bestPractice: 'Help new barbers build their client base quickly'
  }
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category) {
  return Object.values(campaignTemplates).filter(template => template.category === category)
}

/**
 * Get all template categories
 */
export function getTemplateCategories() {
  const categories = new Set(Object.values(campaignTemplates).map(t => t.category))
  return Array.from(categories)
}

/**
 * Get recommended templates based on business metrics
 */
export function getRecommendedTemplates(metrics) {
  const recommendations = []
  
  // High no-show rate: recommend reminder campaigns
  if (metrics.noShowRate > 0.15) {
    recommendations.push(campaignTemplates.appointment_reminder_24h)
    recommendations.push(campaignTemplates.appointment_reminder_2h)
  }
  
  // Low review count: recommend review campaigns
  if (metrics.reviewCount < 50) {
    recommendations.push(campaignTemplates.review_request_google)
  }
  
  // High inactive customer rate: recommend win-back campaigns
  if (metrics.inactiveCustomerRate > 0.3) {
    recommendations.push(campaignTemplates.winback_inactive_30)
  }
  
  return recommendations
}

/**
 * Calculate estimated ROI for a campaign template
 */
export function calculateTemplateROI(template, businessMetrics) {
  const roi = {
    template: template.id,
    estimatedReach: 0,
    estimatedEngagement: 0,
    estimatedRevenue: 0,
    costPerMessage: template.type === 'sms' ? 0.025 : 0.001,
    totalCost: 0,
    netROI: 0
  }
  
  switch(template.category) {
    case 'reminders':
      // Reminders reduce no-shows by 70%
      roi.estimatedReach = businessMetrics.monthlyAppointments
      roi.estimatedEngagement = 0.95 // 95% read rate for SMS
      roi.estimatedRevenue = businessMetrics.avgServicePrice * businessMetrics.noShowRate * 0.7
      break
      
    case 'reviews':
      // Review requests have 15% response rate
      roi.estimatedReach = businessMetrics.monthlyCustomers
      roi.estimatedEngagement = 0.15
      roi.estimatedRevenue = businessMetrics.avgCustomerLifetimeValue * 0.05 // 5% increase in LTV from reviews
      break
      
    case 'winback':
      // Win-back campaigns have 20% success rate
      roi.estimatedReach = businessMetrics.inactiveCustomers
      roi.estimatedEngagement = 0.20
      roi.estimatedRevenue = businessMetrics.avgServicePrice * roi.estimatedEngagement * roi.estimatedReach
      break
  }
  
  roi.totalCost = roi.estimatedReach * roi.costPerMessage
  roi.netROI = roi.estimatedRevenue - roi.totalCost
  roi.roiPercentage = (roi.netROI / roi.totalCost) * 100
  
  return roi
}

export default campaignTemplates