/**
 * Type definitions for the 6FB AI Agent System
 * @module types
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} [full_name] - Full name
 * @property {string} [role] - User role
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Update timestamp
 */

/**
 * @typedef {Object} BookingLink
 * @property {string} id - Link ID
 * @property {string} barber_id - Barber ID
 * @property {string} name - Link name
 * @property {string} url - Booking URL
 * @property {Array<Object>} services - Services offered
 * @property {Array<string>} timeSlots - Available time slots
 * @property {number} duration - Duration in minutes
 * @property {number} [customPrice] - Custom price
 * @property {number} [discount] - Discount percentage
 * @property {string} [description] - Description
 * @property {boolean} active - Is active
 * @property {number} clicks - Click count
 * @property {number} conversions - Conversion count
 * @property {number} revenue - Total revenue
 */

/**
 * @typedef {Object} Service
 * @property {string} id - Service ID
 * @property {string} name - Service name
 * @property {number} duration - Duration in minutes
 * @property {number} price - Price
 * @property {string} [description] - Description
 * @property {string} [icon] - Service icon
 */

/**
 * @typedef {Object} Appointment
 * @property {string} id - Appointment ID
 * @property {string} customer_id - Customer ID
 * @property {string} barber_id - Barber ID
 * @property {string} service_id - Service ID
 * @property {Date} date - Appointment date
 * @property {string} time - Appointment time
 * @property {string} status - Status (pending, confirmed, cancelled)
 * @property {number} [amount] - Amount
 * @property {Object} [payment] - Payment details
 */

/**
 * @typedef {Object} Barbershop
 * @property {string} id - Shop ID
 * @property {string} name - Shop name
 * @property {string} owner_id - Owner ID
 * @property {string} [address] - Address
 * @property {string} [phone] - Phone number
 * @property {string} [email] - Email
 * @property {Object} [settings] - Shop settings
 * @property {Date} created_at - Creation timestamp
 */

/**
 * @typedef {Object} AIAgent
 * @property {string} id - Agent ID
 * @property {string} name - Agent name
 * @property {string} type - Agent type
 * @property {string} description - Description
 * @property {Object} capabilities - Agent capabilities
 * @property {boolean} is_active - Is active
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification ID
 * @property {string} user_id - User ID
 * @property {string} type - Notification type
 * @property {string} title - Title
 * @property {string} message - Message
 * @property {boolean} read - Read status
 * @property {Date} created_at - Creation timestamp
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Transaction ID
 * @property {string} user_id - User ID
 * @property {string} [appointment_id] - Appointment ID
 * @property {string} type - Transaction type
 * @property {number} amount - Amount
 * @property {string} status - Status
 * @property {Object} [metadata] - Additional metadata
 * @property {Date} created_at - Creation timestamp
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success - Success status
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message
 * @property {string} [message] - Success message
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success - Success status
 * @property {Array<*>} data - Response data
 * @property {number} total - Total count
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 * @property {boolean} hasMore - Has more pages
 */

export default {}