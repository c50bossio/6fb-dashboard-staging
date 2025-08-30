/**
 * CIN7 Booking System Integration
 * 
 * This service integrates CIN7 inventory management with the barbershop booking system,
 * ensuring that services are only available when sufficient inventory exists.
 */

import { createClient } from '@/lib/supabase/server'

class Cin7BookingIntegration {
  constructor() {
    this.lowStockThreshold = 0.1 // 10% of max stock
    this.reserveStockThreshold = 2 // Reserve 2 items for walk-ins
  }

  /**
   * Check inventory availability for a service booking
   */
  async checkServiceAvailability(serviceId, appointmentDate, barberbarbershopId) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Get service details and required products
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          duration,
          service_products (
            id,
            product_id,
            quantity_required,
            is_optional,
            inventory (
              id,
              name,
              current_stock,
              min_stock_level,
              max_stock_level,
              on_hand,
              allocated,
              incoming,
              cin7_sync_enabled
            )
          )
        `)
        .eq('id', serviceId)
        .eq('barberbarbershop_id', barberbarbershopId)
        .single()

      if (serviceError || !service) {
        throw new Error(`Service not found: ${serviceError?.message}`)
      }

      // Check each required product
      const availabilityCheck = {
        isAvailable: true,
        requiredProducts: [],
        insufficientStock: [],
        warnings: [],
        alternativeSuggestions: []
      }

      for (const serviceProduct of service.service_products) {
        const product = serviceProduct.inventory
        const requiredQty = serviceProduct.quantity_required
        const isOptional = serviceProduct.is_optional

        if (!product) {
          if (!isOptional) {
            availabilityCheck.isAvailable = false
            availabilityCheck.insufficientStock.push({
              productId: serviceProduct.product_id,
              reason: 'Product not found'
            })
          }
          continue
        }

        // Calculate available stock (considering upcoming appointments)
        const availableStock = await this.calculateAvailableStock(
          product.id, 
          appointmentDate, 
          barberbarbershopId
        )

        const productCheck = {
          productId: product.id,
          productName: product.name,
          requiredQuantity: requiredQty,
          currentStock: product.current_stock,
          availableStock: availableStock,
          isOptional: isOptional,
          cin7Synced: product.cin7_sync_enabled
        }

        availabilityCheck.requiredProducts.push(productCheck)

        // Check if sufficient stock is available
        if (availableStock < requiredQty) {
          if (isOptional) {
            availabilityCheck.warnings.push({
              productId: product.id,
              productName: product.name,
              message: `Optional product ${product.name} has insufficient stock (${availableStock}/${requiredQty})`
            })
          } else {
            availabilityCheck.isAvailable = false
            availabilityCheck.insufficientStock.push({
              productId: product.id,
              productName: product.name,
              required: requiredQty,
              available: availableStock,
              shortage: requiredQty - availableStock
            })
          }
        }

        // Low stock warning
        if (availableStock <= product.min_stock_level && availableStock >= requiredQty) {
          availabilityCheck.warnings.push({
            productId: product.id,
            productName: product.name,
            message: `Low stock warning: ${product.name} (${availableStock} remaining)`
          })
        }
      }

      // If service is not available, suggest alternatives
      if (!availabilityCheck.isAvailable) {
        availabilityCheck.alternativeSuggestions = await this.suggestAlternativeServices(
          serviceId, 
          barberbarbershopId,
          availabilityCheck.insufficientStock
        )
      }

      return availabilityCheck

    } catch (error) {
      console.error('❌ Availability check failed:', error)
      return {
        isAvailable: false,
        error: error.message,
        requiredProducts: [],
        insufficientStock: [],
        warnings: [],
        alternativeSuggestions: []
      }
    }
  }

  /**
   * Calculate available stock considering future appointments
   */
  async calculateAvailableStock(productId, appointmentDate, barberbarbershopId) {
    const supabase = createClient()
    
    try {
      // Get current stock
      const { data: product } = await supabase
        .from('inventory')
        .select('current_stock, allocated, incoming')
        .eq('id', productId)
        .single()

      if (!product) {
        return 0
      }

      // Get upcoming appointments that will use this product (next 7 days)
      const appointmentStart = new Date(appointmentDate)
      const appointmentEnd = new Date(appointmentStart)
      appointmentEnd.setDate(appointmentEnd.getDate() + 7)

      const { data: upcomingAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          services (
            service_products (
              product_id,
              quantity_required
            )
          )
        `)
        .eq('barberbarbershop_id', barberbarbershopId)
        .gte('appointment_date', appointmentStart.toISOString())
        .lte('appointment_date', appointmentEnd.toISOString())
        .eq('status', 'confirmed')

      // Calculate stock to be consumed by upcoming appointments
      let futureConsumption = 0
      if (upcomingAppointments) {
        for (const appointment of upcomingAppointments) {
          if (appointment.services?.service_products) {
            for (const serviceProduct of appointment.services.service_products) {
              if (serviceProduct.product_id === productId) {
                futureConsumption += serviceProduct.quantity_required
              }
            }
          }
        }
      }

      // Calculate available stock
      const availableStock = Math.max(0, 
        product.current_stock - 
        product.allocated - 
        futureConsumption - 
        this.reserveStockThreshold
      )

      return availableStock

    } catch (error) {
      console.error('❌ Error calculating available stock:', error)
      return 0
    }
  }

  /**
   * Suggest alternative services when primary service isn't available
   */
  async suggestAlternativeServices(serviceId, barberbarbershopId, insufficientProducts) {
    const supabase = createClient()
    
    try {
      // Get current service details
      const { data: currentService } = await supabase
        .from('services')
        .select('name, category, price')
        .eq('id', serviceId)
        .single()

      if (!currentService) {
        return []
      }

      // Find alternative services in same category that don't require unavailable products
      const unavailableProductIds = insufficientProducts.map(p => p.productId)
      
      const { data: alternativeServices } = await supabase
        .from('services')
        .select(`
          id,
          name,
          category,
          price,
          duration,
          service_products (
            product_id,
            quantity_required,
            is_optional
          )
        `)
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('category', currentService.category)
        .neq('id', serviceId)
        .eq('is_active', true)

      if (!alternativeServices) {
        return []
      }

      // Filter services that can be performed with available inventory
      const availableAlternatives = []

      for (const service of alternativeServices) {
        let canPerformService = true

        for (const serviceProduct of service.service_products) {
          if (unavailableProductIds.includes(serviceProduct.product_id) && !serviceProduct.is_optional) {
            canPerformService = false
            break
          }

          // Check if this product has sufficient stock
          const availableStock = await this.calculateAvailableStock(
            serviceProduct.product_id,
            new Date(),
            barberbarbershopId
          )

          if (availableStock < serviceProduct.quantity_required && !serviceProduct.is_optional) {
            canPerformService = false
            break
          }
        }

        if (canPerformService) {
          availableAlternatives.push({
            id: service.id,
            name: service.name,
            price: service.price,
            duration: service.duration,
            priceDifference: service.price - currentService.price,
            reason: 'Available with current inventory'
          })
        }
      }

      return availableAlternatives.slice(0, 3) // Return top 3 alternatives

    } catch (error) {
      console.error('❌ Error suggesting alternatives:', error)
      return []
    }
  }

  /**
   * Reserve inventory for a confirmed appointment
   */
  async reserveInventoryForAppointment(appointmentId) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Get appointment details with services and products
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          barberbarbershop_id,
          services (
            id,
            name,
            service_products (
              id,
              product_id,
              quantity_required,
              is_optional,
              inventory (
                id,
                name,
                current_stock,
                allocated
              )
            )
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (error || !appointment) {
        throw new Error(`Appointment not found: ${error?.message}`)
      }

      if (appointment.status !== 'confirmed') {
        // // Debug log removed for production
return { success: true, message: 'No reservation needed for unconfirmed appointment' }
      }

      const reservations = []

      // Reserve inventory for each required product
      for (const service of appointment.services) {
        for (const serviceProduct of service.service_products) {
          const product = serviceProduct.inventory
          const requiredQty = serviceProduct.quantity_required

          if (serviceProduct.is_optional || !product) {
            continue
          }

          // Check if sufficient stock is available
          if (product.current_stock < requiredQty) {
            throw new Error(`Insufficient stock for ${product.name}: ${product.current_stock}/${requiredQty}`)
          }

          // Update allocated quantity
          const { data: updatedProduct, error: updateError } = await supabase
            .from('inventory')
            .update({
              allocated: supabase.raw(`allocated + ${requiredQty}`),
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)
            .select()

          if (updateError) {
            throw new Error(`Failed to allocate inventory: ${updateError.message}`)
          }

          // Log the reservation
          await supabase
            .from('inventory_reservations')
            .insert({
              appointment_id: appointmentId,
              product_id: product.id,
              quantity_reserved: requiredQty,
              reservation_date: new Date().toISOString(),
              status: 'active',
              barberbarbershop_id: appointment.barberbarbershop_id
            })

          reservations.push({
            productId: product.id,
            productName: product.name,
            quantityReserved: requiredQty,
            newAllocated: updatedProduct[0]?.allocated
          })

          // // Debug log removed for production
}
      }

      return {
        success: true,
        reservations,
        message: `Reserved inventory for ${reservations.length} products`
      }

    } catch (error) {
      console.error('❌ Inventory reservation failed:', error)
      return {
        success: false,
        error: error.message,
        reservations: []
      }
    }
  }

  /**
   * Release reserved inventory when appointment is cancelled or completed
   */
  async releaseInventoryReservation(appointmentId, consumeInventory = false) {
    // // Debug log removed for production
`)
    
    const supabase = createClient()
    
    try {
      // Get current reservations
      const { data: reservations, error } = await supabase
        .from('inventory_reservations')
        .select(`
          id,
          product_id,
          quantity_reserved,
          inventory (
            id,
            name,
            current_stock,
            allocated
          )
        `)
        .eq('appointment_id', appointmentId)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to get reservations: ${error.message}`)
      }

      if (!reservations || reservations.length === 0) {
        return { success: true, message: 'No active reservations found' }
      }

      const releases = []

      for (const reservation of reservations) {
        const product = reservation.inventory
        const reservedQty = reservation.quantity_reserved

        if (consumeInventory) {
          // Appointment completed - consume inventory
          const { error: consumeError } = await supabase
            .from('inventory')
            .update({
              current_stock: supabase.raw(`current_stock - ${reservedQty}`),
              allocated: supabase.raw(`allocated - ${reservedQty}`),
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (consumeError) {
            throw new Error(`Failed to consume inventory: ${consumeError.message}`)
          }

          // // Debug log removed for production
} else {
          // Appointment cancelled - release reservation
          const { error: releaseError } = await supabase
            .from('inventory')
            .update({
              allocated: supabase.raw(`allocated - ${reservedQty}`),
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (releaseError) {
            throw new Error(`Failed to release reservation: ${releaseError.message}`)
          }

          // // Debug log removed for production
}

        // Update reservation status
        await supabase
          .from('inventory_reservations')
          .update({
            status: consumeInventory ? 'consumed' : 'released',
            updated_at: new Date().toISOString()
          })
          .eq('id', reservation.id)

        releases.push({
          productId: product.id,
          productName: product.name,
          quantityReleased: reservedQty,
          action: consumeInventory ? 'consumed' : 'released'
        })
      }

      return {
        success: true,
        releases,
        message: `${consumeInventory ? 'Consumed' : 'Released'} inventory for ${releases.length} products`
      }

    } catch (error) {
      console.error('❌ Inventory release failed:', error)
      return {
        success: false,
        error: error.message,
        releases: []
      }
    }
  }

  /**
   * Automatically adjust service availability based on inventory levels
   */
  async updateServiceAvailability(barberbarbershopId) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Get all services with their product requirements
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          is_available,
          service_products (
            product_id,
            quantity_required,
            is_optional,
            inventory (
              id,
              name,
              current_stock,
              allocated,
              min_stock_level
            )
          )
        `)
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('is_active', true)

      if (error || !services) {
        throw new Error(`Failed to get services: ${error?.message}`)
      }

      const updates = []

      for (const service of services) {
        let serviceAvailable = true
        const stockIssues = []

        // Check each required product
        for (const serviceProduct of service.service_products) {
          const product = serviceProduct.inventory
          const requiredQty = serviceProduct.quantity_required

          if (!product || serviceProduct.is_optional) {
            continue
          }

          const availableStock = product.current_stock - product.allocated
          
          if (availableStock < requiredQty) {
            serviceAvailable = false
            stockIssues.push({
              productName: product.name,
              required: requiredQty,
              available: availableStock
            })
          }
        }

        // Update service availability if it has changed
        if (serviceAvailable !== service.is_available) {
          const { error: updateError } = await supabase
            .from('services')
            .update({
              is_available: serviceAvailable,
              availability_notes: stockIssues.length > 0 
                ? `Insufficient inventory: ${stockIssues.map(s => s.productName).join(', ')}`
                : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', service.id)

          if (updateError) {
            console.error(`❌ Failed to update service ${service.name}:`, updateError)
          } else {
            updates.push({
              serviceId: service.id,
              serviceName: service.name,
              newAvailability: serviceAvailable,
              reason: stockIssues.length > 0 ? 'Insufficient inventory' : 'Inventory restored'
            })

            // // Debug log removed for production
}
        }
      }

      return {
        success: true,
        updates,
        message: `Updated ${updates.length} services`
      }

    } catch (error) {
      console.error('❌ Service availability update failed:', error)
      return {
        success: false,
        error: error.message,
        updates: []
      }
    }
  }

  /**
   * Generate low stock alerts for products affecting service availability
   */
  async generateServiceImpactAlerts(barberbarbershopId) {
    const supabase = createClient()
    
    try {
      // Get products that are running low and affect service availability
      const { data: criticalProducts } = await supabase
        .from('inventory')
        .select(`
          id,
          name,
          current_stock,
          min_stock_level,
          allocated,
          service_products (
            service_id,
            quantity_required,
            services (
              id,
              name,
              is_popular,
              category
            )
          )
        `)
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('cin7_sync_enabled', true)
        .lte('current_stock', supabase.raw('min_stock_level + 5')) // Low stock threshold

      if (!criticalProducts) {
        return { success: true, alerts: [] }
      }

      const alerts = []

      for (const product of criticalProducts) {
        const availableStock = product.current_stock - product.allocated
        const affectedServices = product.service_products?.map(sp => sp.services?.name).filter(Boolean) || []

        if (affectedServices.length > 0 && availableStock <= product.min_stock_level) {
          alerts.push({
            type: 'service_impact_low_stock',
            productId: product.id,
            productName: product.name,
            currentStock: product.current_stock,
            availableStock,
            minStockLevel: product.min_stock_level,
            affectedServices,
            severity: availableStock === 0 ? 'critical' : 'warning',
            message: `${product.name} is running low and affects ${affectedServices.length} service(s)`
          })
        }
      }

      // Insert alerts into database
      if (alerts.length > 0) {
        const alertInserts = alerts.map(alert => ({
          barberbarbershop_id: barberbarbershopId,
          alert_type: alert.type,
          product_id: alert.productId,
          product_name: alert.productName,
          current_stock: alert.currentStock,
          min_stock_level: alert.minStockLevel,
          alert_data: {
            affected_services: alert.affectedServices,
            severity: alert.severity,
            available_stock: alert.availableStock
          },
          created_at: new Date().toISOString()
        }))

        await supabase
          .from('inventory_alerts')
          .insert(alertInserts)
      }

      return {
        success: true,
        alerts,
        message: `Generated ${alerts.length} service impact alerts`
      }

    } catch (error) {
      console.error('❌ Service impact alerts failed:', error)
      return {
        success: false,
        error: error.message,
        alerts: []
      }
    }
  }
}

export default Cin7BookingIntegration