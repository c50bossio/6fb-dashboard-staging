# 6FB AI Agent System - Automation Engine

This automation engine transforms your 6FB barbershop's no-show policy UI toggles into functional, intelligent automation that actually executes.

## 🚀 What This Does

Instead of just saving settings to the database, your automation features now:

- **Actually collect fees** when clients no-show
- **Send smart reminders** based on risk scores
- **Predict no-shows** using AI and take preventive action
- **Manage client recovery** with automated workflows
- **Alert managers** when intervention is needed

## 📁 Architecture

```
lib/automation/
├── orchestrator.js       # Main coordination engine
├── fee-collector.js      # Automated fee collection with retry logic
├── reminder-engine.js    # Smart multi-channel reminders
├── prediction-service.js # AI-powered no-show risk assessment
├── recovery-manager.js   # Client recovery workflow automation
├── integration.js        # Hooks for existing booking system
├── index.js             # Main exports and utilities
└── README.md            # This file
```

## 🔧 Integration

### Automatic Integration
The system automatically initializes when needed and connects to your existing booking flow via hooks.

### Manual Integration
Add these hooks to your existing appointment management code:

```javascript
import AutomationIntegration from '@/lib/automation/integration'

// When an appointment is marked as no-show
await AutomationIntegration.onAppointmentNoShow(appointmentData)

// When a new appointment is created  
await AutomationIntegration.onAppointmentCreated(appointmentData)

// When a payment fails
await AutomationIntegration.onPaymentFailed(paymentData)

// When a client is blocked
await AutomationIntegration.onClientBlocked(clientData, reason)
```

## 📡 API Endpoints

### Trigger Automation Events
```javascript
POST /api/automation/trigger
{
  "eventType": "appointment:no_show",
  "data": {
    "appointmentId": "apt_123",
    "barbershopId": "shop_456", 
    "clientId": "client_789"
  }
}
```

### Get Automation Status & Analytics
```javascript
GET /api/automation/status
// Returns detailed automation status and performance metrics
```

## 🤖 Automation Features

### 1. Fee Collection Automation (`fee-collector.js`)
- Automatically charges stored payment methods for no-show fees
- Retry logic with exponential backoff
- Fallback to manual collection when automated fails
- Comprehensive audit trails

**Settings from UI:**
- `automaticFeeCollection.enabled` - Master toggle
- `automaticFeeCollection.retryAttempts` - Number of retry attempts (1-5)
- `automaticFeeCollection.retryDelay` - Hours between retries (1-72)
- `automaticFeeCollection.fallbackToManual` - Create manual collection tasks
- `automaticFeeCollection.requireConfirmation` - Require manager approval

### 2. Smart Reminder Engine (`reminder-engine.js`)
- Risk-based escalating reminders (email → SMS → phone)
- Personalized message generation based on client segment
- Response tracking and analytics
- Multi-channel delivery optimization

**Settings from UI:**
- `smartReminderEscalation.enabled` - Master toggle
- `smartReminderEscalation.riskThreshold` - Risk score threshold (0-1)
- `smartReminderEscalation.escalationSteps` - Reminder schedule configuration
- `smartReminderEscalation.personalizedMessages` - Enable personalization

### 3. Predictive Detection (`prediction-service.js`)
- AI-powered no-show risk assessment using multiple data points
- Integration with OpenAI/Anthropic/Google AI
- Automatic preventive actions based on risk scores
- Continuous learning and model improvement

**Settings from UI:**
- `predictiveDetection.enabled` - Master toggle
- `predictiveDetection.confidenceThreshold` - AI confidence threshold (0.5-0.95)
- `predictiveDetection.dataPoints` - Features to analyze
- `predictiveDetection.actionThreshold` - Risk score for preventive actions
- `predictiveDetection.preventiveActions` - Actions to take (extra reminders, deposits, etc.)

### 4. Recovery Flow Manager (`recovery-manager.js`)
- Automated client recovery workflows with state machine
- Multi-step communication sequences
- Manager escalation logic
- Success tracking and analytics

**Settings from UI:**
- `recoveryFlowAutomation.enabled` - Master toggle
- `recoveryFlowAutomation.autoStart` - Auto-start recovery flows
- `recoveryFlowAutomation.sequenceDelay` - Hours delay between steps
- `recoveryFlowAutomation.communicationChannels` - Preferred channels
- `recoveryFlowAutomation.managerEscalation` - Manager escalation settings

### 5. Manager Notifications
- Intelligent alert system for managers
- Configurable triggers and thresholds
- Multi-channel notifications (email, dashboard, SMS)
- Alert frequency management

**Settings from UI:**
- `managerNotifications.enabled` - Master toggle
- `managerNotifications.triggers` - Which events trigger notifications
- `managerNotifications.channels` - Notification channels
- `managerNotifications.customThresholds` - Custom risk/strike thresholds

## 💾 Database Tables

The system uses these new tables (will be created automatically):

```sql
-- Fee collection tracking
fee_collection_attempts
fee_collection_retries
fee_confirmation_requests

-- Reminder management
scheduled_reminders
reminder_response_tracking
reminder_templates

-- Predictive analytics
no_show_predictions
prediction_models

-- Recovery workflows
client_recovery_flows
recovery_templates

-- System health
system_health_checks
```

## 🔄 Background Processing

The orchestrator runs scheduled tasks:

- **Reminder processing** - Every 15 minutes
- **Fee collection retries** - Every hour  
- **Prediction model updates** - Every 6 hours
- **Recovery flow monitoring** - Every 30 minutes
- **Settings refresh** - Every 5 minutes

## 🎯 Getting Started

1. **Enable Features**: Use the existing AutomationSettings UI component
2. **Automatic Initialization**: System initializes automatically when events occur
3. **Monitor Progress**: Use `/api/automation/status` endpoint or dashboard
4. **Test Manually**: Use `/api/automation/trigger` for testing

## 🧪 Testing

```javascript
// Test a no-show event
await AutomationIntegration.triggerTestAutomation('appointment:no_show', {
  appointmentId: 'test_123',
  barbershopId: 'your_shop_id',
  clientId: 'test_client_456'
})

// Check integration status
const status = await AutomationIntegration.getAutomationIntegrationStatus()
console.log('Automation Status:', status)
```

## 📊 Monitoring

- **Real-time Status**: Check `/api/automation/status` for live metrics
- **Activity Logs**: View recent automation actions and outcomes  
- **Performance Metrics**: Track success rates, cost savings, and ROI
- **Error Tracking**: Comprehensive error handling and logging

## 🔒 Security & Reliability

- **Graceful Degradation**: Automation failures don't break core booking flow
- **Audit Trails**: Complete logging of all automation actions
- **Rate Limiting**: Built-in protection against system overload  
- **Error Recovery**: Automatic retry logic and fallback mechanisms
- **Permission Checks**: Integration respects existing role-based permissions

## 🚨 Important Notes

1. **Non-Breaking**: All automation runs alongside existing systems
2. **Settings-Driven**: Only enabled features will execute
3. **Database-First**: Settings are read from your existing business_settings table
4. **Production-Ready**: Includes error handling, logging, and monitoring

## 💡 Example Flow

1. Client no-shows → `onAppointmentNoShow()` called
2. System checks if `automaticFeeCollection.enabled` is true
3. If enabled, attempts to charge stored payment method
4. If charge fails, schedules retries with exponential backoff
5. After max retries, falls back to manual collection task
6. Notifies manager if `notifyOnFailure` is true
7. All actions are logged for analytics and audit trails

Your automation settings UI now controls a fully functional automation system that actually executes the configured behaviors!