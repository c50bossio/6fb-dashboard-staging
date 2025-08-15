
import { v4 as uuidv4 } from 'uuid'

export const TEST_USER_UUID = '11111111-1111-1111-1111-111111111111'

export const TEST_USER = {
  id: TEST_USER_UUID,
  email: 'test@bookedbarber.com',
  email_verified: true,
  phone: '+1 555-0100',
  phone_verified: true,
  confirmed_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {
    provider: 'email',
    providers: ['email']
  },
  user_metadata: {
    full_name: 'Test Shop Owner',
    avatar_url: null
  },
  aud: 'authenticated',
  role: 'authenticated'
}

export const TEST_PROFILE = {
  id: TEST_USER_UUID,
  email: 'test@bookedbarber.com',
  full_name: 'Test Shop Owner',
  role: 'shop_owner',
  shop_id: '22222222-2222-2222-2222-222222222222',
  shop_name: 'Test Barbershop',
  barbershop_name: 'Test Barbershop',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: new Date().toISOString(),
  subscription_status: 'active',
  subscription_tier: 'premium',
  stripe_customer_id: 'cus_test_' + TEST_USER_UUID,
  onboarding_completed: true,
  settings: {
    notifications: true,
    email_marketing: true,
    sms_marketing: true
  }
}

export const TEST_SESSION = {
  access_token: 'test-access-token-' + Date.now(),
  refresh_token: 'test-refresh-token-' + Date.now(),
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: TEST_USER
}

export const TEST_SHOP = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Test Barbershop',
  owner_id: TEST_USER_UUID,
  address: '123 Test Street, Test City, TC 12345',
  phone: '+1 555-0100',
  email: 'shop@bookedbarber.com',
  website: 'https://testshop.bookedbarber.com',
  description: 'A test barbershop for development',
  operating_hours: {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '20:00' },
    friday: { open: '09:00', close: '20:00' },
    saturday: { open: '10:00', close: '17:00' },
    sunday: { open: 'closed', close: 'closed' }
  },
  services: [
    { name: 'Haircut', price: 30, duration: 30 },
    { name: 'Beard Trim', price: 20, duration: 20 },
    { name: 'Hot Shave', price: 35, duration: 30 },
    { name: 'Hair & Beard', price: 45, duration: 45 }
  ],
  staff_count: 5,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: new Date().toISOString()
}

export function isDevBypassEnabled() {
  return process.env.NODE_ENV === 'development' && 
         process.env.NEXT_PUBLIC_DEV_MODE === 'true'
}

export function getTestUser() {
  if (!isDevBypassEnabled()) {
    return null
  }
  return TEST_USER
}

export function getTestSession() {
  if (!isDevBypassEnabled()) {
    return null
  }
  return TEST_SESSION
}

export function getTestProfile() {
  if (!isDevBypassEnabled()) {
    return null
  }
  return TEST_PROFILE
}

export function getTestShop() {
  if (!isDevBypassEnabled()) {
    return null
  }
  return TEST_SHOP
}

export function getTestBillingData() {
  if (!isDevBypassEnabled()) {
    return null
  }
  
  return {
    account: {
      id: 'billing-' + TEST_USER_UUID,
      owner_id: TEST_USER_UUID,
      owner_type: 'shop',
      account_name: 'Test Shop Marketing Account',
      description: 'Marketing account for Test Barbershop',
      billing_email: 'billing@testshop.com',
      monthly_spend_limit: 2000,
      is_active: true,
      is_verified: true,
      total_campaigns_sent: 42,
      total_emails_sent: 3250,
      total_sms_sent: 1200,
      total_spent: 485.75,
      provider: 'sendgrid',
      created_at: '2024-01-01T00:00:00.000Z'
    },
    paymentMethods: [
      {
        id: 'pm-' + TEST_USER_UUID + '-1',
        account_id: 'billing-' + TEST_USER_UUID,
        stripe_payment_method_id: 'pm_test_visa4242',
        stripe_customer_id: 'cus_test_' + TEST_USER_UUID,
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2026,
        is_default: true,
        is_active: true
      },
      {
        id: 'pm-' + TEST_USER_UUID + '-2',
        account_id: 'billing-' + TEST_USER_UUID,
        stripe_payment_method_id: 'pm_test_mastercard5555',
        stripe_customer_id: 'cus_test_' + TEST_USER_UUID,
        card_brand: 'mastercard',
        card_last4: '5555',
        card_exp_month: 6,
        card_exp_year: 2027,
        is_default: false,
        is_active: true
      }
    ],
    history: generateTestBillingHistory()
  }
}

function generateTestBillingHistory() {
  const campaigns = [
    'Spring Sale Email Campaign',
    'Weekend Special SMS Blast',
    'New Customer Welcome Series',
    'Monthly Newsletter',
    'Birthday Discount Campaign',
    'Holiday Promotion Email',
    'Service Reminder SMS',
    'Loyalty Program Update'
  ]
  
  const history = []
  const now = new Date()
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i * 3) // Every 3 days
    
    const isEmail = Math.random() > 0.3
    const recipientCount = Math.floor(Math.random() * 300) + 50
    const costPerRecipient = isEmail ? 0.02 : 0.08
    const servicesCost = recipientCount * costPerRecipient
    const platformFee = servicesCost * 0.15
    const totalCost = servicesCost + platformFee
    
    history.push({
      id: `billing-${TEST_USER_UUID}-${i}`,
      campaign_id: `campaign-${TEST_USER_UUID}-${i}`,
      campaign_name: campaigns[i % campaigns.length],
      campaign_type: isEmail ? 'email' : 'sms',
      account_name: 'Test Shop Marketing Account',
      amount_charged: Math.round(totalCost * 100) / 100,
      platform_fee: Math.round(platformFee * 100) / 100,
      service_cost: Math.round(servicesCost * 100) / 100,
      recipients_count: recipientCount,
      sent_count: recipientCount,
      delivered_count: Math.floor(recipientCount * 0.95),
      opened_count: isEmail ? Math.floor(recipientCount * 0.25) : null,
      clicked_count: isEmail ? Math.floor(recipientCount * 0.05) : null,
      payment_status: 'succeeded',
      stripe_payment_intent_id: `pi_test_${i}`,
      invoice_id: `inv_test_${i}`,
      receipt_url: `https://dashboard.stripe.com/test/receipts/${i}`,
      created_at: date.toISOString()
    })
  }
  
  return history
}

if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
  console.log('🔐 Development auth bypass loaded - Test User UUID:', TEST_USER_UUID)
}