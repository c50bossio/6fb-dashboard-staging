'use client'

/**
 * Automation System Main Export
 * 
 * Provides a unified interface to the 6FB AI Agent System automation features
 */

export { AutomationOrchestrator, automationOrchestrator } from './orchestrator'
export { FeeCollectionService } from './fee-collector'  
export { ReminderEngineService } from './reminder-engine'
export { PredictionService } from './prediction-service'
export { RecoveryManagerService } from './recovery-manager'

// Export utility functions for easy integration
export const AutomationUtils = {
  /**
   * Initialize the automation system
   */
  async initialize() {
    const { automationOrchestrator } = await import('./orchestrator')
    await automationOrchestrator.initialize()
    return automationOrchestrator
  },

  /**
   * Trigger automation events manually
   */
  async triggerEvent(eventName, data) {
    const { automationOrchestrator } = await import('./orchestrator')
    if (automationOrchestrator.isInitialized) {
      automationOrchestrator.emit(eventName, data)
    }
  },

  /**
   * Get automation status for a barbershop
   */
  async getStatus(barberbarbershopId) {
    const { automationOrchestrator } = await import('./orchestrator')
    return automationOrchestrator.getAutomationStatus(barberbarbershopId)
  },

  /**
   * Shutdown the automation system
   */
  async shutdown() {
    const { automationOrchestrator } = await import('./orchestrator')
    await automationOrchestrator.shutdown()
  }
}

export default AutomationUtils