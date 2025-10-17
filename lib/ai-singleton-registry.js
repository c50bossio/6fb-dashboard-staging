/**
 * AI Singleton Registry
 * Centralized registry for AI service singletons to prevent circular dependencies
 */

class AISingletonRegistry {
  constructor() {
    this.instances = new Map()
  }

  register(name, instance) {
    if (!this.instances.has(name)) {
      this.instances.set(name, instance)
    }
    return this.instances.get(name)
  }

  get(name) {
    return this.instances.get(name)
  }

  has(name) {
    return this.instances.has(name)
  }

  clear() {
    this.instances.clear()
  }
}

// Global singleton instance
const registry = new AISingletonRegistry()

export { registry as aiRegistry }