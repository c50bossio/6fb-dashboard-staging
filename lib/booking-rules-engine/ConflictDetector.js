/**
 * Conflict Detector Module
 * 
 * Implements Interval Tree algorithm for O(n log n) conflict detection
 * in booking schedules
 */

import { createClient } from '@/lib/supabase/server-client'

class IntervalNode {
  constructor(start, end, data) {
    this.start = start
    this.end = end
    this.data = data
    this.max = end
    this.height = 1  // For AVL balancing
    this.left = null
    this.right = null
  }
}

class IntervalTree {
  constructor() {
    this.root = null
    this.size = 0
  }

  /**
   * Insert an interval into the tree with AVL balancing
   * O(log n) time complexity guaranteed
   */
  insert(start, end, data) {
    const node = new IntervalNode(start, end, data)
    this.root = this.insertNode(this.root, node)
    this.size++
  }

  insertNode(root, node) {
    // Base case: empty subtree
    if (!root) return node

    // Standard BST insertion based on start time
    if (node.start < root.start) {
      root.left = this.insertNode(root.left, node)
    } else {
      root.right = this.insertNode(root.right, node)
    }

    // Update height and max values for augmented tree
    root.height = 1 + Math.max(
      this.getNodeHeight(root.left),
      this.getNodeHeight(root.right)
    )
    
    root.max = Math.max(
      root.end,
      Math.max(
        this.getNodeMax(root.left),
        this.getNodeMax(root.right)
      )
    )

    // Get balance factor for AVL property
    const balance = this.getBalance(root)

    // Left Heavy cases
    if (balance > 1) {
      if (node.start < root.left.start) {
        // Left-Left case: single right rotation
        return this.rotateRight(root)
      } else {
        // Left-Right case: left rotation then right rotation
        root.left = this.rotateLeft(root.left)
        return this.rotateRight(root)
      }
    }

    // Right Heavy cases  
    if (balance < -1) {
      if (node.start > root.right.start) {
        // Right-Right case: single left rotation
        return this.rotateLeft(root)
      } else {
        // Right-Left case: right rotation then left rotation
        root.right = this.rotateRight(root.right)
        return this.rotateLeft(root)
      }
    }

    return root
  }

  /**
   * Right rotation for AVL balancing
   */
  rotateRight(y) {
    const x = y.left
    const T2 = x.right

    // Perform rotation
    x.right = y
    y.left = T2

    // Update heights
    y.height = 1 + Math.max(this.getNodeHeight(y.left), this.getNodeHeight(y.right))
    x.height = 1 + Math.max(this.getNodeHeight(x.left), this.getNodeHeight(x.right))

    // Update max values (important for interval tree)
    y.max = Math.max(y.end, Math.max(this.getNodeMax(y.left), this.getNodeMax(y.right)))
    x.max = Math.max(x.end, Math.max(this.getNodeMax(x.left), this.getNodeMax(x.right)))

    return x
  }

  /**
   * Left rotation for AVL balancing
   */
  rotateLeft(x) {
    const y = x.right
    const T2 = y.left

    // Perform rotation
    y.left = x
    x.right = T2

    // Update heights
    x.height = 1 + Math.max(this.getNodeHeight(x.left), this.getNodeHeight(x.right))
    y.height = 1 + Math.max(this.getNodeHeight(y.left), this.getNodeHeight(y.right))

    // Update max values (important for interval tree)
    x.max = Math.max(x.end, Math.max(this.getNodeMax(x.left), this.getNodeMax(x.right)))
    y.max = Math.max(y.end, Math.max(this.getNodeMax(y.left), this.getNodeMax(y.right)))

    return y
  }

  /**
   * Get height of a node (null-safe)
   */
  getNodeHeight(node) {
    return node ? node.height : 0
  }

  /**
   * Get max value of a subtree (null-safe)
   */
  getNodeMax(node) {
    return node ? node.max : -Infinity
  }

  /**
   * Get balance factor of a node
   */
  getBalance(node) {
    return node ? this.getNodeHeight(node.left) - this.getNodeHeight(node.right) : 0
  }

  /**
   * Find all intervals that overlap with the given interval
   */
  findOverlapping(start, end) {
    const overlapping = []
    this.searchOverlapping(this.root, start, end, overlapping)
    return overlapping
  }

  searchOverlapping(node, start, end, result) {
    if (!node) return

    // Check if current node overlaps
    if (this.doOverlap(node.start, node.end, start, end)) {
      result.push({
        start: node.start,
        end: node.end,
        data: node.data
      })
    }

    // If left child exists and its max is greater than start,
    // there might be overlapping intervals in left subtree
    if (node.left && node.left.max >= start) {
      this.searchOverlapping(node.left, start, end, result)
    }

    // Right subtree is checked only if current interval's start
    // is less than or equal to the end of query interval
    if (node.right && node.start <= end) {
      this.searchOverlapping(node.right, start, end, result)
    }
  }

  /**
   * Check if two intervals overlap
   */
  doOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1
  }

  /**
   * Get all intervals in the tree
   */
  getAllIntervals() {
    const intervals = []
    this.inorderTraversal(this.root, intervals)
    return intervals
  }

  inorderTraversal(node, result) {
    if (!node) return

    this.inorderTraversal(node.left, result)
    result.push({
      start: node.start,
      end: node.end,
      data: node.data
    })
    this.inorderTraversal(node.right, result)
  }

  /**
   * Clear the tree
   */
  clear() {
    this.root = null
    this.size = 0
  }

  /**
   * Get tree statistics
   */
  getStats() {
    return {
      nodeCount: this.countNodes(this.root),
      height: this.getTreeHeight(this.root),
      isBalanced: this.isBalanced(this.root),
      size: this.size
    }
  }

  countNodes(node) {
    if (!node) return 0
    return 1 + this.countNodes(node.left) + this.countNodes(node.right)
  }

  getTreeHeight(node) {
    if (!node) return 0
    return node.height  // AVL tree maintains height in each node
  }

  isBalanced(node) {
    if (!node) return true

    // AVL tree is always balanced by construction
    // But let's verify for debugging purposes
    const balance = Math.abs(this.getBalance(node))
    if (balance > 1) return false

    return this.isBalanced(node.left) && this.isBalanced(node.right)
  }
}

export class ConflictDetector {
  constructor() {
    this.trees = new Map() // barberId -> IntervalTree
    this.lastUpdate = new Map() // barberId -> timestamp
    this.updateInterval = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Find conflicts for a proposed booking
   */
  async findConflicts({ barbershop_id, barber_id, start_time, duration }) {
    // Ensure tree is up to date
    await this.ensureTreeUpdated(barbershop_id, barber_id)

    const tree = this.trees.get(barber_id)
    if (!tree) return []

    const startMs = new Date(start_time).getTime()
    const endMs = startMs + duration * 60 * 1000

    // Find overlapping intervals
    const overlapping = tree.findOverlapping(startMs, endMs)

    // Map to appointment details
    return overlapping.map(interval => ({
      id: interval.data.id,
      service_name: interval.data.service_name,
      customer_name: interval.data.customer_name,
      start_time: new Date(interval.start).toISOString(),
      end_time: new Date(interval.end).toISOString(),
      status: interval.data.status,
      conflict_type: this.determineConflictType(startMs, endMs, interval.start, interval.end)
    }))
  }

  /**
   * Determine the type of conflict
   */
  determineConflictType(proposedStart, proposedEnd, existingStart, existingEnd) {
    if (proposedStart === existingStart && proposedEnd === existingEnd) {
      return 'exact_overlap'
    }
    if (proposedStart >= existingStart && proposedEnd <= existingEnd) {
      return 'contained_within'
    }
    if (proposedStart <= existingStart && proposedEnd >= existingEnd) {
      return 'contains'
    }
    if (proposedStart < existingStart && proposedEnd > existingStart && proposedEnd <= existingEnd) {
      return 'starts_before'
    }
    if (proposedStart >= existingStart && proposedStart < existingEnd && proposedEnd > existingEnd) {
      return 'ends_after'
    }
    return 'partial_overlap'
  }

  /**
   * Ensure the interval tree is up to date for a barber
   */
  async ensureTreeUpdated(barbershop_id, barber_id) {
    const lastUpdate = this.lastUpdate.get(barber_id) || 0
    const now = Date.now()

    // Check if update is needed
    if (now - lastUpdate < this.updateInterval) {
      return // Tree is still fresh
    }

    await this.buildTree(barbershop_id, barber_id)
  }

  /**
   * Build/rebuild the interval tree for a barber
   */
  async buildTree(barbershop_id, barber_id) {
    const supabase = await createClient()

    // Fetch all future appointments for this barber
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        service_id,
        customer_id,
        start_time,
        end_time,
        status,
        services!inner(name),
        customers!inner(name)
      `)
      .eq('barbershop_id', barbershop_id)
      .eq('barber_id', barber_id)
      .gte('start_time', startOfToday.toISOString())
      .in('status', ['confirmed', 'in_progress'])
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Failed to fetch appointments:', error)
      return
    }

    // Create new tree
    const tree = new IntervalTree()

    // Insert all appointments into the tree
    for (const appointment of appointments || []) {
      const startMs = new Date(appointment.start_time).getTime()
      const endMs = new Date(appointment.end_time).getTime()

      tree.insert(startMs, endMs, {
        id: appointment.id,
        service_name: appointment.services?.name || 'Unknown Service',
        customer_name: appointment.customers?.name || 'Unknown Customer',
        status: appointment.status
      })
    }

    // Store the tree and update timestamp
    this.trees.set(barber_id, tree)
    this.lastUpdate.set(barber_id, Date.now())
  }

  /**
   * Find available slots for a barber
   */
  async findAvailableSlots({ 
    barbershop_id, 
    barber_id, 
    date, 
    duration, 
    business_hours,
    slot_interval = 30,
    buffer_time = 0 
  }) {
    await this.ensureTreeUpdated(barbershop_id, barber_id)

    const tree = this.trees.get(barber_id)
    if (!tree) {
      // No appointments, all slots within business hours are available
      return this.generateAllSlots(date, duration, business_hours, slot_interval)
    }

    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    // Get all appointments for the day
    const dayAppointments = tree.findOverlapping(dayStart.getTime(), dayEnd.getTime())
    
    // Sort by start time
    dayAppointments.sort((a, b) => a.start - b.start)

    // Generate available slots
    const availableSlots = []
    const slotDuration = duration + buffer_time
    
    // Parse business hours
    const dayOfWeek = dayStart.toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
    const hours = business_hours[dayOfWeek]
    
    if (!hours || hours.closed) {
      return [] // Shop is closed
    }

    const [openHour, openMin] = hours.open.split(':').map(Number)
    const [closeHour, closeMin] = hours.close.split(':').map(Number)
    
    let currentTime = new Date(date)
    currentTime.setHours(openHour, openMin, 0, 0)
    
    const closeTime = new Date(date)
    closeTime.setHours(closeHour, closeMin, 0, 0)

    // Generate slots between appointments
    for (const appointment of dayAppointments) {
      const appointmentStart = new Date(appointment.start)
      
      // Generate slots before this appointment
      while (currentTime.getTime() + slotDuration * 60 * 1000 <= appointmentStart.getTime()) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(currentTime.getTime() + duration * 60 * 1000),
          available: true
        })
        currentTime = new Date(currentTime.getTime() + slot_interval * 60 * 1000)
      }
      
      // Move current time past this appointment (including buffer)
      currentTime = new Date(appointment.end + buffer_time * 60 * 1000)
    }

    // Generate remaining slots until close
    while (currentTime.getTime() + slotDuration * 60 * 1000 <= closeTime.getTime()) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(currentTime.getTime() + duration * 60 * 1000),
        available: true
      })
      currentTime = new Date(currentTime.getTime() + slot_interval * 60 * 1000)
    }

    return availableSlots
  }

  /**
   * Generate all possible slots for a day
   */
  generateAllSlots(date, duration, business_hours, slot_interval) {
    const slots = []
    const dayOfWeek = new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
    const hours = business_hours[dayOfWeek]
    
    if (!hours || hours.closed) {
      return []
    }

    const [openHour, openMin] = hours.open.split(':').map(Number)
    const [closeHour, closeMin] = hours.close.split(':').map(Number)
    
    let currentTime = new Date(date)
    currentTime.setHours(openHour, openMin, 0, 0)
    
    const closeTime = new Date(date)
    closeTime.setHours(closeHour, closeMin, 0, 0)

    while (currentTime.getTime() + duration * 60 * 1000 <= closeTime.getTime()) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(currentTime.getTime() + duration * 60 * 1000),
        available: true
      })
      currentTime = new Date(currentTime.getTime() + slot_interval * 60 * 1000)
    }

    return slots
  }

  /**
   * Check multiple conflicts at once (batch operation)
   */
  async findBatchConflicts(bookings) {
    const results = []
    
    for (const booking of bookings) {
      const conflicts = await this.findConflicts(booking)
      results.push({
        booking,
        conflicts,
        hasConflicts: conflicts.length > 0
      })
    }
    
    return results
  }

  /**
   * Clear cache for a specific barber
   */
  clearCache(barber_id) {
    this.trees.delete(barber_id)
    this.lastUpdate.delete(barber_id)
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.trees.clear()
    this.lastUpdate.clear()
  }

  /**
   * Get statistics about the conflict detection system
   */
  getStats() {
    const stats = {
      totalTrees: this.trees.size,
      trees: {}
    }

    for (const [barberId, tree] of this.trees.entries()) {
      const treeStats = tree.getStats()
      const lastUpdate = this.lastUpdate.get(barberId)
      
      stats.trees[barberId] = {
        ...treeStats,
        lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
        cacheAge: lastUpdate ? Date.now() - lastUpdate : null
      }
    }

    return stats
  }

  /**
   * Subscribe to real-time appointment changes
   */
  subscribeToChanges(barbershop_id, callback) {
    const supabase = createClient()
    
    const subscription = supabase
      .channel(`appointments-${barbershop_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershop_id}`
        },
        (payload) => {
          // Clear affected barber's cache
          if (payload.new?.barber_id) {
            this.clearCache(payload.new.barber_id)
          }
          if (payload.old?.barber_id && payload.old.barber_id !== payload.new?.barber_id) {
            this.clearCache(payload.old.barber_id)
          }
          
          // Notify callback
          if (callback) {
            callback(payload)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }
}

export default ConflictDetector