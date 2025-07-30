/**
 * Test Data Factories and Mock Utilities
 * Provides consistent test data generation and mock implementations
 */

import { faker } from '@faker-js/faker';
import crypto from 'crypto';

// Base factory class for common functionality
class BaseFactory {
  static sequence = 0;
  
  static getSequence() {
    return ++this.sequence;
  }
  
  static resetSequence() {
    this.sequence = 0;
  }
  
  static generateId(prefix = 'test') {
    return `${prefix}_${crypto.randomUUID().substring(0, 8)}`;
  }
}

// User-related factories
export class UserFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('user'),
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      role: 'CLIENT',
      created_at: faker.date.past(),
      updated_at: faker.date.recent(),
      email_verified: true,
      phone_verified: false,
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: 'en',
        timezone: 'America/New_York'
      }
    };
    
    return { ...defaults, ...overrides };
  }

  static createClient(overrides = {}) {
    return this.create({
      role: 'CLIENT',
      preferences: {
        ...this.create().preferences,
        hair_type: faker.helpers.arrayElement(['straight', 'wavy', 'curly', 'coily']),
        preferred_style: faker.helpers.arrayElement(['modern', 'classic', 'trendy', 'conservative']),
        ...overrides.preferences
      },
      ...overrides
    });
  }

  static createBarber(overrides = {}) {
    return this.create({
      role: 'BARBER',
      profile: {
        bio: faker.lorem.paragraph(),
        experience_years: faker.number.int({ min: 1, max: 20 }),
        specialties: faker.helpers.arrayElements([
          'fades', 'beard_trim', 'hair_styling', 'color', 'straight_razor'
        ], { min: 1, max: 3 }),
        certifications: faker.helpers.arrayElements([
          'licensed_barber', 'cosmetology', 'beard_specialist'
        ], { min: 0, max: 2 }),
        hourly_rate: faker.number.float({ min: 15, max: 50, multipleOf: 0.25 }),
        commission_rate: faker.number.float({ min: 0.10, max: 0.25, multipleOf: 0.01 })
      },
      ...overrides
    });
  }

  static createShopOwner(overrides = {}) {
    return this.create({
      role: 'SHOP_OWNER',
      profile: {
        business_license: faker.string.alphanumeric(10).toUpperCase(),
        tax_id: faker.string.numeric(9),
        years_in_business: faker.number.int({ min: 1, max: 30 }),
        multiple_locations: faker.datatype.boolean()
      },
      ...overrides
    });
  }

  static createEnterpriseOwner(overrides = {}) {
    return this.create({
      role: 'ENTERPRISE_OWNER',
      profile: {
        company_name: faker.company.name(),
        locations_count: faker.number.int({ min: 2, max: 50 }),
        enterprise_tier: faker.helpers.arrayElement(['bronze', 'silver', 'gold', 'platinum']),
        annual_revenue: faker.number.int({ min: 100000, max: 10000000 })
      },
      ...overrides
    });
  }

  static createBatch(count, role = 'CLIENT', overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      switch (role) {
        case 'CLIENT':
          users.push(this.createClient(overrides));
          break;
        case 'BARBER':
          users.push(this.createBarber(overrides));
          break;
        case 'SHOP_OWNER':
          users.push(this.createShopOwner(overrides));
          break;
        case 'ENTERPRISE_OWNER':
          users.push(this.createEnterpriseOwner(overrides));
          break;
        default:
          users.push(this.create({ role, ...overrides }));
      }
    }
    return users;
  }
}

// Shop-related factories
export class ShopFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('shop'),
      name: faker.company.name() + ' Barbershop',
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      owner_id: this.generateId('user'),
      description: faker.lorem.paragraphs(2),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zip: faker.location.zipCode(),
        country: 'US'
      },
      phone: faker.phone.number(),
      email: faker.internet.email().toLowerCase(),
      website: faker.internet.url(),
      business_hours: this.generateBusinessHours(),
      amenities: faker.helpers.arrayElements([
        'wifi', 'parking', 'wheelchair_accessible', 'air_conditioning',
        'music', 'tv', 'refreshments', 'kids_area', 'waiting_area'
      ], { min: 2, max: 6 }),
      payment_methods: ['cash', 'credit_card', 'debit_card', 'digital_wallet'],
      rating: faker.number.float({ min: 3.0, max: 5.0, multipleOf: 0.1 }),
      review_count: faker.number.int({ min: 0, max: 500 }),
      created_at: faker.date.past(),
      updated_at: faker.date.recent(),
      status: 'active',
      subscription_tier: faker.helpers.arrayElement(['basic', 'professional', 'enterprise'])
    };
    
    return { ...defaults, ...overrides };
  }

  static generateBusinessHours() {
    const standardHours = { open: '09:00', close: '18:00' };
    const extendedHours = { open: '08:00', close: '20:00' };
    const weekendHours = { open: '09:00', close: '17:00' };

    return {
      monday: faker.helpers.arrayElement([standardHours, extendedHours]),
      tuesday: standardHours,
      wednesday: standardHours,
      thursday: faker.helpers.arrayElement([standardHours, extendedHours]),
      friday: extendedHours,
      saturday: weekendHours,
      sunday: faker.datatype.boolean() ? weekendHours : { closed: true }
    };
  }

  static createWithServices(serviceCount = 5, overrides = {}) {
    const shop = this.create(overrides);
    shop.services = ServiceFactory.createBatch(serviceCount, { shop_id: shop.id });
    return shop;
  }

  static createWithStaff(staffCount = 3, overrides = {}) {
    const shop = this.create(overrides);
    shop.staff = UserFactory.createBatch(staffCount, 'BARBER');
    return shop;
  }
}

// Service-related factories
export class ServiceFactory extends BaseFactory {
  static create(overrides = {}) {
    const serviceTypes = [
      { name: 'Haircut', base_price: 35, duration: 30 },
      { name: 'Beard Trim', base_price: 25, duration: 20 },
      { name: 'Hair Wash', base_price: 15, duration: 15 },
      { name: 'Styling', base_price: 30, duration: 25 },
      { name: 'Full Service', base_price: 55, duration: 50 },
      { name: 'Kids Cut', base_price: 25, duration: 25 },
      { name: 'Senior Cut', base_price: 30, duration: 30 },
      { name: 'Buzz Cut', base_price: 20, duration: 15 }
    ];

    const serviceType = faker.helpers.arrayElement(serviceTypes);
    
    const defaults = {
      id: this.generateId('service'),
      shop_id: this.generateId('shop'),
      name: serviceType.name,
      description: faker.lorem.sentence(),
      price: faker.number.float({ 
        min: serviceType.base_price * 0.8, 
        max: serviceType.base_price * 1.2, 
        multipleOf: 0.25 
      }),
      duration: serviceType.duration + faker.number.int({ min: -5, max: 10 }),
      category: faker.helpers.arrayElement(['hair', 'beard', 'styling', 'specialty']),
      is_active: true,
      requires_booking: true,
      max_advance_booking_days: faker.number.int({ min: 7, max: 90 }),
      cancellation_policy: faker.helpers.arrayElement([
        '24_hours', '12_hours', '6_hours', '2_hours'
      ]),
      created_at: faker.date.past(),
      updated_at: faker.date.recent()
    };
    
    return { ...defaults, ...overrides };
  }

  static createBatch(count, overrides = {}) {
    const services = [];
    for (let i = 0; i < count; i++) {
      services.push(this.create(overrides));
    }
    return services;
  }

  static createPopularServices(shopId) {
    return [
      this.create({
        shop_id: shopId,
        name: 'Classic Haircut',
        price: 35.00,
        duration: 30,
        popularity_score: 0.95
      }),
      this.create({
        shop_id: shopId,
        name: 'Beard Trim & Style',
        price: 25.00,
        duration: 20,
        popularity_score: 0.80
      }),
      this.create({
        shop_id: shopId,
        name: 'Full Service Package',
        price: 55.00,
        duration: 50,
        popularity_score: 0.70
      })
    ];
  }
}

// Appointment-related factories
export class AppointmentFactory extends BaseFactory {
  static create(overrides = {}) {
    const scheduledTime = faker.date.future();
    const duration = faker.number.int({ min: 15, max: 60 });
    
    const defaults = {
      id: this.generateId('appt'),
      client_id: this.generateId('user'),
      barber_id: this.generateId('user'),
      shop_id: this.generateId('shop'),
      service_id: this.generateId('service'),
      scheduled_time: scheduledTime,
      estimated_duration: duration,
      actual_duration: null,
      status: faker.helpers.arrayElement([
        'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
      ]),
      total_price: faker.number.float({ min: 15, max: 100, multipleOf: 0.25 }),
      tip_amount: faker.number.float({ min: 0, max: 20, multipleOf: 0.25 }),
      payment_status: faker.helpers.arrayElement([
        'pending', 'paid', 'refunded', 'failed'
      ]),
      payment_method: faker.helpers.arrayElement([
        'cash', 'credit_card', 'debit_card', 'digital_wallet'
      ]),
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      client_notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
      barber_notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
      created_at: faker.date.past(),
      updated_at: faker.date.recent(),
      reminder_sent: faker.datatype.boolean(),
      review_requested: faker.datatype.boolean()
    };
    
    return { ...defaults, ...overrides };
  }

  static createScheduled(overrides = {}) {
    return this.create({
      status: 'scheduled',
      scheduled_time: faker.date.future(),
      payment_status: 'pending',
      ...overrides
    });
  }

  static createCompleted(overrides = {}) {
    const scheduledTime = faker.date.past();
    const duration = faker.number.int({ min: 15, max: 60 });
    
    return this.create({
      status: 'completed',
      scheduled_time: scheduledTime,
      actual_duration: duration + faker.number.int({ min: -5, max: 15 }),
      payment_status: 'paid',
      tip_amount: faker.number.float({ min: 0, max: 20, multipleOf: 0.25 }),
      barber_notes: faker.lorem.sentence(),
      completed_at: new Date(scheduledTime.getTime() + (duration * 60 * 1000)),
      ...overrides
    });
  }

  static createCancelled(overrides = {}) {
    return this.create({
      status: 'cancelled',
      cancelled_at: faker.date.recent(),
      cancellation_reason: faker.helpers.arrayElement([
        'client_request', 'barber_unavailable', 'emergency', 'weather', 'other'
      ]),
      refund_amount: faker.number.float({ min: 0, max: 100, multipleOf: 0.25 }),
      ...overrides
    });
  }

  static createBatch(count, overrides = {}) {
    const appointments = [];
    for (let i = 0; i < count; i++) {
      appointments.push(this.create(overrides));
    }
    return appointments;
  }

  static createWeeklySeries(clientId, barberId, shopId, serviceId, startDate = new Date()) {
    const appointments = [];
    for (let week = 0; week < 4; week++) {
      const appointmentDate = new Date(startDate);
      appointmentDate.setDate(startDate.getDate() + (week * 7));
      
      appointments.push(this.create({
        client_id: clientId,
        barber_id: barberId,
        shop_id: shopId,
        service_id: serviceId,
        scheduled_time: appointmentDate,
        status: week < 2 ? 'completed' : 'scheduled'
      }));
    }
    return appointments;
  }
}

// Business analytics factories
export class AnalyticsFactory extends BaseFactory {
  static createRevenueData(shopId, dateRange = 30) {
    const data = [];
    const endDate = new Date();
    
    for (let i = dateRange; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: faker.number.float({ min: 200, max: 1500, multipleOf: 25 }),
        appointments: faker.number.int({ min: 5, max: 30 }),
        transactions: faker.number.int({ min: 5, max: 35 }),
        average_ticket: faker.number.float({ min: 25, max: 80, multipleOf: 0.25 }),
        tips: faker.number.float({ min: 20, max: 200, multipleOf: 5 }),
        shop_id: shopId
      });
    }
    
    return data;
  }

  static createCustomerMetrics(shopId) {
    return {
      shop_id: shopId,
      period: 'monthly',
      total_customers: faker.number.int({ min: 50, max: 500 }),
      new_customers: faker.number.int({ min: 10, max: 100 }),
      returning_customers: faker.number.int({ min: 40, max: 400 }),
      retention_rate: faker.number.float({ min: 0.6, max: 0.95, multipleOf: 0.01 }),
      average_visits_per_customer: faker.number.float({ min: 2.1, max: 8.5, multipleOf: 0.1 }),
      customer_lifetime_value: faker.number.float({ min: 150, max: 800, multipleOf: 5 }),
      churn_rate: faker.number.float({ min: 0.05, max: 0.4, multipleOf: 0.01 }),
      satisfaction_score: faker.number.float({ min: 4.0, max: 5.0, multipleOf: 0.1 })
    };
  }

  static createBarberPerformance(barberId, shopId) {
    return {
      barber_id: barberId,
      shop_id: shopId,
      period: 'monthly',
      total_appointments: faker.number.int({ min: 30, max: 200 }),
      completed_appointments: faker.number.int({ min: 25, max: 190 }),
      completion_rate: faker.number.float({ min: 0.85, max: 0.98, multipleOf: 0.01 }),
      total_revenue: faker.number.float({ min: 1000, max: 8000, multipleOf: 25 }),
      average_service_time: faker.number.int({ min: 25, max: 45 }),
      customer_rating: faker.number.float({ min: 4.0, max: 5.0, multipleOf: 0.1 }),
      tips_earned: faker.number.float({ min: 100, max: 1000, multipleOf: 5 }),
      repeat_client_rate: faker.number.float({ min: 0.4, max: 0.8, multipleOf: 0.01 }),
      punctuality_score: faker.number.float({ min: 0.8, max: 1.0, multipleOf: 0.01 })
    };
  }
}

// AI Agent and conversation factories
export class ConversationFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('conv'),
      user_id: this.generateId('user'),
      session_id: this.generateId('session'),
      started_at: faker.date.recent(),
      last_message_at: faker.date.recent(),
      message_count: faker.number.int({ min: 1, max: 20 }),
      context_summary: faker.lorem.paragraph(),
      satisfaction_rating: faker.helpers.maybe(
        () => faker.number.int({ min: 1, max: 5 }), 
        { probability: 0.3 }
      ),
      resolved: faker.datatype.boolean(),
      tags: faker.helpers.arrayElements([
        'revenue', 'customers', 'appointments', 'staff', 'pricing', 'marketing'
      ], { min: 0, max: 3 })
    };
    
    return { ...defaults, ...overrides };
  }

  static createMessage(conversationId, overrides = {}) {
    const isUserMessage = faker.datatype.boolean();
    
    const defaults = {
      id: this.generateId('msg'),
      conversation_id: conversationId,
      role: isUserMessage ? 'user' : 'assistant',
      content: isUserMessage 
        ? this.generateUserMessage()
        : this.generateAssistantMessage(),
      timestamp: faker.date.recent(),
      context_used: isUserMessage ? null : faker.helpers.arrayElements([
        'revenue_data', 'customer_metrics', 'appointment_history', 'market_trends'
      ], { min: 1, max: 3 }),
      confidence_score: isUserMessage ? null : faker.number.float({ 
        min: 0.7, max: 0.98, multipleOf: 0.01 
      }),
      response_time_ms: isUserMessage ? null : faker.number.int({ min: 500, max: 5000 }),
      tokens_used: isUserMessage ? null : faker.number.int({ min: 100, max: 1000 })
    };
    
    return { ...defaults, ...overrides };
  }

  static generateUserMessage() {
    const messages = [
      "How can I increase my revenue this month?",
      "What are my busiest hours?",
      "Show me customer feedback from last week",
      "How do I improve customer retention?",
      "What services are most popular?",
      "Should I hire another barber?",
      "How much should I charge for a haircut?",
      "What's my average appointment duration?",
      "How can I reduce no-shows?",
      "What marketing strategies work best?"
    ];
    
    return faker.helpers.arrayElement(messages);
  }

  static generateAssistantMessage() {
    const responses = [
      "Based on your current data, I recommend focusing on customer retention to increase revenue. Your repeat customer rate is 68%, which has room for improvement.",
      "Your busiest hours are typically 2-6 PM on weekdays and 10 AM-4 PM on Saturdays. Consider adjusting staff schedules accordingly.",
      "Customer feedback has been overwhelmingly positive with an average rating of 4.7/5. Clients particularly appreciate your attention to detail.",
      "To improve retention, consider implementing a loyalty program. Customers who visit regularly spend 40% more over time.",
      "Your most popular services are classic haircuts (45% of bookings) and beard trims (32%). Consider creating package deals.",
      "Based on your current booking volume and wait times, hiring an additional barber could increase revenue by 25-30%.",
      "Your current pricing is competitive for the area. Consider a 5-10% increase for premium services based on demand.",
      "Your average appointment duration is 32 minutes, which is efficient. Maintaining this pace while ensuring quality is key.",
      "Implementing appointment reminders and a cancellation policy can reduce no-shows by up to 40%.",
      "Digital marketing through social media and Google My Business listings shows the highest ROI for barbershops."
    ];
    
    return faker.helpers.arrayElement(responses);
  }

  static createConversationWithMessages(messageCount = 5, overrides = {}) {
    const conversation = this.create(overrides);
    conversation.messages = [];
    
    for (let i = 0; i < messageCount; i++) {
      conversation.messages.push(
        this.createMessage(conversation.id, {
          role: i % 2 === 0 ? 'user' : 'assistant'
        })
      );
    }
    
    return conversation;
  }
}

// Review and feedback factories
export class ReviewFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('review'),
      appointment_id: this.generateId('appt'),
      client_id: this.generateId('user'),
      barber_id: this.generateId('user'),
      shop_id: this.generateId('shop'),
      rating: faker.number.int({ min: 1, max: 5 }),
      title: faker.helpers.maybe(() => faker.lorem.words(3), { probability: 0.7 }),
      content: faker.lorem.paragraph(),
      service_quality: faker.number.int({ min: 1, max: 5 }),
      cleanliness: faker.number.int({ min: 1, max: 5 }),
      value_for_money: faker.number.int({ min: 1, max: 5 }),
      would_recommend: faker.datatype.boolean({ probability: 0.8 }),
      created_at: faker.date.past(),
      is_verified: faker.datatype.boolean({ probability: 0.9 }),
      helpful_votes: faker.number.int({ min: 0, max: 20 }),
      response_from_shop: faker.helpers.maybe(
        () => faker.lorem.paragraph(), 
        { probability: 0.4 }
      )
    };
    
    return { ...defaults, ...overrides };
  }

  static createPositive(overrides = {}) {
    const positiveComments = [
      "Excellent service and great attention to detail!",
      "Best haircut I've had in years. Highly recommend!",
      "Professional, clean, and skilled barber. Will be back!",
      "Great atmosphere and quality work. Worth every penny.",
      "Friendly staff and perfect results every time."
    ];

    return this.create({
      rating: faker.number.int({ min: 4, max: 5 }),
      content: faker.helpers.arrayElement(positiveComments),
      service_quality: faker.number.int({ min: 4, max: 5 }),
      cleanliness: faker.number.int({ min: 4, max: 5 }),
      value_for_money: faker.number.int({ min: 4, max: 5 }),
      would_recommend: true,
      ...overrides
    });
  }

  static createNegative(overrides = {}) {
    const negativeComments = [
      "Service was below expectations and overpriced.",
      "Long wait time and rushed service.",
      "Haircut didn't match what I requested.",
      "Unprofessional atmosphere and poor results.",
      "Had to wait 30 minutes past my appointment time."
    ];

    return this.create({
      rating: faker.number.int({ min: 1, max: 2 }),
      content: faker.helpers.arrayElement(negativeComments),
      service_quality: faker.number.int({ min: 1, max: 3 }),
      cleanliness: faker.number.int({ min: 1, max: 3 }),
      value_for_money: faker.number.int({ min: 1, max: 3 }),
      would_recommend: false,
      ...overrides
    });
  }

  static createBatch(count, overrides = {}) {
    const reviews = [];
    for (let i = 0; i < count; i++) {
      // Create mostly positive reviews (80/20 split)
      const isPositive = Math.random() < 0.8;
      reviews.push(
        isPositive 
          ? this.createPositive(overrides)
          : this.createNegative(overrides)
      );
    }
    return reviews;
  }
}

// Vector embedding and AI knowledge factories
export class VectorEmbeddingFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('embed'),
      content_type: faker.helpers.arrayElement([
        'business_knowledge', 'customer_feedback', 'industry_best_practice', 'faq'
      ]),
      source: faker.helpers.arrayElement([
        'revenue_optimization', 'customer_service', 'marketing', 'operations'
      ]),
      title: faker.lorem.words(5),
      content: faker.lorem.paragraphs(2),
      embedding: this.generateEmbedding(),
      metadata: {
        category: faker.helpers.arrayElement(['strategy', 'tactics', 'tools', 'metrics']),
        confidence: faker.number.float({ min: 0.7, max: 1.0, multipleOf: 0.01 }),
        last_updated: faker.date.recent(),
        usage_count: faker.number.int({ min: 0, max: 100 })
      },
      created_at: faker.date.past(),
      updated_at: faker.date.recent()
    };
    
    return { ...defaults, ...overrides };
  }

  static generateEmbedding(dimensions = 384) {
    return Array.from({ length: dimensions }, () => 
      faker.number.float({ min: -1, max: 1, multipleOf: 0.001 })
    );
  }

  static createKnowledgeBase(categoryCount = 10, itemsPerCategory = 20) {
    const categories = [
      'revenue_optimization', 'customer_retention', 'staff_management',
      'pricing_strategy', 'marketing', 'operations', 'customer_service',
      'inventory', 'scheduling', 'financial_management'
    ];

    const knowledgeBase = [];
    
    for (let i = 0; i < categoryCount && i < categories.length; i++) {
      const category = categories[i];
      
      for (let j = 0; j < itemsPerCategory; j++) {
        knowledgeBase.push(this.create({
          source: category,
          title: `${category.replace('_', ' ')} tip ${j + 1}`,
          content: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }))
        }));
      }
    }
    
    return knowledgeBase;
  }
}

// Payment and transaction factories
export class PaymentFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('pay'),
      appointment_id: this.generateId('appt'),
      client_id: this.generateId('user'),
      shop_id: this.generateId('shop'),
      amount: faker.number.float({ min: 15, max: 150, multipleOf: 0.25 }),
      tip_amount: faker.number.float({ min: 0, max: 30, multipleOf: 0.25 }),
      tax_amount: faker.number.float({ min: 1, max: 15, multipleOf: 0.01 }),
      total_amount: function() { 
        return this.amount + this.tip_amount + this.tax_amount; 
      },
      currency: 'USD',
      payment_method: faker.helpers.arrayElement([
        'credit_card', 'debit_card', 'cash', 'digital_wallet', 'gift_card'
      ]),
      payment_provider: faker.helpers.arrayElement([
        'stripe', 'square', 'paypal', 'cash'
      ]),
      transaction_id: faker.string.alphanumeric(16),
      status: faker.helpers.arrayElement([
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
      ]),
      processed_at: faker.date.recent(),
      created_at: faker.date.past(),
      failure_reason: faker.helpers.maybe(
        () => faker.helpers.arrayElement([
          'insufficient_funds', 'card_declined', 'expired_card', 'invalid_card'
        ]), 
        { probability: 0.1 }
      )
    };
    
    const payment = { ...defaults, ...overrides };
    payment.total_amount = payment.amount + payment.tip_amount + payment.tax_amount;
    
    return payment;
  }

  static createSuccessful(overrides = {}) {
    return this.create({
      status: 'completed',
      processed_at: faker.date.recent(),
      failure_reason: null,
      ...overrides
    });
  }

  static createFailed(overrides = {}) {
    return this.create({
      status: 'failed',
      failure_reason: faker.helpers.arrayElement([
        'insufficient_funds', 'card_declined', 'expired_card'
      ]),
      ...overrides
    });
  }

  static createRefund(originalPaymentId, overrides = {}) {
    return this.create({
      original_payment_id: originalPaymentId,
      amount: faker.number.float({ min: 5, max: 150, multipleOf: 0.25 }) * -1, // Negative for refund
      status: 'completed',
      payment_method: 'refund',
      ...overrides
    });
  }
}

// Notification factories
export class NotificationFactory extends BaseFactory {
  static create(overrides = {}) {
    const defaults = {
      id: this.generateId('notif'),
      user_id: this.generateId('user'),
      type: faker.helpers.arrayElement([
        'appointment_reminder', 'appointment_confirmed', 'appointment_cancelled',
        'payment_received', 'review_request', 'promotion', 'system_update'
      ]),
      title: faker.lorem.words(4),
      message: faker.lorem.sentence(),
      channel: faker.helpers.arrayElement(['email', 'sms', 'push', 'in_app']),
      status: faker.helpers.arrayElement(['pending', 'sent', 'delivered', 'failed', 'read']),
      scheduled_at: faker.date.future(),
      sent_at: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.7 }),
      read_at: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.4 }),
      metadata: {
        appointment_id: faker.helpers.maybe(() => this.generateId('appt'), { probability: 0.6 }),
        priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
        category: faker.helpers.arrayElement(['transactional', 'promotional', 'informational'])
      },
      created_at: faker.date.past()
    };
    
    return { ...defaults, ...overrides };
  }

  static createAppointmentReminder(appointmentId, userId, overrides = {}) {
    return this.create({
      type: 'appointment_reminder',
      user_id: userId,
      title: 'Appointment Reminder',
      message: 'You have an upcoming appointment tomorrow at 2:00 PM',
      channel: 'sms',
      metadata: {
        appointment_id: appointmentId,
        priority: 'high',
        category: 'transactional'
      },
      ...overrides
    });
  }

  static createBatch(count, overrides = {}) {
    const notifications = [];
    for (let i = 0; i < count; i++) {
      notifications.push(this.create(overrides));
    }
    return notifications;
  }
}

// Database mock utilities
export class DatabaseMock {
  constructor() {
    this.data = {
      users: [],
      shops: [],
      services: [],
      appointments: [],
      reviews: [],
      payments: [],
      conversations: [],
      notifications: []
    };
  }

  seed() {
    // Create users
    this.data.users = [
      ...UserFactory.createBatch(50, 'CLIENT'),
      ...UserFactory.createBatch(20, 'BARBER'),
      ...UserFactory.createBatch(10, 'SHOP_OWNER'),
      ...UserFactory.createBatch(2, 'ENTERPRISE_OWNER')
    ];

    // Create shops
    this.data.shops = [];
    const shopOwners = this.data.users.filter(u => u.role === 'SHOP_OWNER');
    shopOwners.forEach(owner => {
      this.data.shops.push(ShopFactory.create({ owner_id: owner.id }));
    });

    // Create services for each shop
    this.data.services = [];
    this.data.shops.forEach(shop => {
      this.data.services.push(...ServiceFactory.createBatch(8, { shop_id: shop.id }));
    });

    // Create appointments
    this.data.appointments = [];
    const clients = this.data.users.filter(u => u.role === 'CLIENT');
    const barbers = this.data.users.filter(u => u.role === 'BARBER');
    
    for (let i = 0; i < 200; i++) {
      const client = faker.helpers.arrayElement(clients);
      const barber = faker.helpers.arrayElement(barbers);
      const shop = faker.helpers.arrayElement(this.data.shops);
      const service = faker.helpers.arrayElement(
        this.data.services.filter(s => s.shop_id === shop.id)
      );
      
      this.data.appointments.push(AppointmentFactory.create({
        client_id: client.id,
        barber_id: barber.id,
        shop_id: shop.id,
        service_id: service.id
      }));
    }

    // Create reviews for completed appointments
    const completedAppointments = this.data.appointments.filter(a => a.status === 'completed');
    this.data.reviews = completedAppointments.slice(0, 50).map(appointment => {
      return ReviewFactory.create({
        appointment_id: appointment.id,
        client_id: appointment.client_id,
        barber_id: appointment.barber_id,
        shop_id: appointment.shop_id
      });
    });

    // Create payments
    this.data.payments = this.data.appointments.map(appointment => {
      return PaymentFactory.create({
        appointment_id: appointment.id,
        client_id: appointment.client_id,
        shop_id: appointment.shop_id
      });
    });

    return this.data;
  }

  findById(table, id) {
    return this.data[table]?.find(item => item.id === id);
  }

  findBy(table, criteria) {
    return this.data[table]?.filter(item => {
      return Object.keys(criteria).every(key => item[key] === criteria[key]);
    });
  }

  create(table, data) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    
    const item = { ...data, id: data.id || BaseFactory.generateId() };
    this.data[table].push(item);
    return item;
  }

  update(table, id, updates) {
    const index = this.data[table]?.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[table][index] = { ...this.data[table][index], ...updates };
      return this.data[table][index];
    }
    return null;
  }

  delete(table, id) {
    const index = this.data[table]?.findIndex(item => item.id === id);
    if (index !== -1) {
      return this.data[table].splice(index, 1)[0];
    }
    return null;
  }

  clear(table = null) {
    if (table) {
      this.data[table] = [];
    } else {
      Object.keys(this.data).forEach(key => {
        this.data[key] = [];
      });
    }
  }

  count(table) {
    return this.data[table]?.length || 0;
  }
}

// Export all factories and utilities
export {
  BaseFactory,
  DatabaseMock
};

// Convenience function to reset all sequences
export function resetAllSequences() {
  BaseFactory.resetSequence();
  UserFactory.resetSequence();
  ShopFactory.resetSequence();
  ServiceFactory.resetSequence();
  AppointmentFactory.resetSequence();
  ConversationFactory.resetSequence();
  ReviewFactory.resetSequence();
  VectorEmbeddingFactory.resetSequence();
  PaymentFactory.resetSequence();
  NotificationFactory.resetSequence();
}

// Quick setup function for common test scenarios
export function createTestScenario(scenario = 'basic') {
  const db = new DatabaseMock();
  
  switch (scenario) {
    case 'basic':
      return {
        user: UserFactory.createClient(),
        shop: ShopFactory.create(),
        service: ServiceFactory.create(),
        appointment: AppointmentFactory.createScheduled()
      };
      
    case 'full_shop':
      const owner = UserFactory.createShopOwner();
      const shop = ShopFactory.create({ owner_id: owner.id });
      const services = ServiceFactory.createBatch(5, { shop_id: shop.id });
      const barbers = UserFactory.createBatch(3, 'BARBER');
      const clients = UserFactory.createBatch(10, 'CLIENT');
      
      return {
        owner,
        shop,
        services,
        barbers,
        clients,
        db: db.seed()
      };
      
    case 'analytics':
      db.seed();
      const analyticsShop = db.data.shops[0];
      return {
        shop: analyticsShop,
        revenueData: AnalyticsFactory.createRevenueData(analyticsShop.id),
        customerMetrics: AnalyticsFactory.createCustomerMetrics(analyticsShop.id),
        db
      };
      
    default:
      return db.seed();
  }
}