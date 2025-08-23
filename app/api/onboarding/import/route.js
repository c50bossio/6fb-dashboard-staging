import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { parsePlatformData } from '@/lib/integrations/platform-parsers'
import { DataTransformer } from '@/lib/integrations/data-transformer'
import { DuplicateDetector } from '@/lib/integrations/duplicate-detector'
import { validateImportData } from '@/lib/integrations/data-validator'

// Create Supabase client with service role for batch operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

export async function POST(request) {
  try {
    // Get user session
    const cookieStore = cookies()
    const authToken = cookieStore.get('auth-token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const platform = formData.get('platform')
    const barbershopId = formData.get('barbershopId')
    const importOptions = JSON.parse(formData.get('options') || '{}')

    if (!file || !platform || !barbershopId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert file to text
    const fileContent = await file.text()
    
    // Parse platform-specific data
    const parsedData = await parsePlatformData(platform, fileContent, {
      fileType: file.type,
      fileName: file.name
    })

    if (parsedData.error) {
      return NextResponse.json(
        { error: `Parse error: ${parsedData.error}` },
        { status: 400 }
      )
    }

    // Transform to universal schema
    const transformer = new DataTransformer()
    const transformedData = await transformer.transformData(
      parsedData.data,
      'customers', // Default to customers for now
      null // No field mapping for this legacy route
    )

    // Validate data
    const validationResult = await validateImportData(transformedData)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.errors,
          summary: validationResult.summary
        },
        { status: 400 }
      )
    }

    // Detect duplicates
    const duplicateDetector = new DuplicateDetector(supabase)
    const duplicateAnalysis = await duplicateDetector.checkDuplicates(
      transformedData.data || transformedData,
      'customers',
      barbershopId
    )

    // Prepare import batch
    const importBatch = {
      id: crypto.randomUUID(),
      barbershop_id: barbershopId,
      platform,
      status: 'processing',
      total_records: {
        customers: transformedData.customers?.length || 0,
        appointments: transformedData.appointments?.length || 0,
        services: transformedData.services?.length || 0,
        products: transformedData.products?.length || 0,
        staff: transformedData.staff?.length || 0
      },
      duplicates_found: duplicateAnalysis.duplicateCount,
      options: importOptions,
      created_at: new Date().toISOString()
    }

    // Store import batch record
    const { data: importRecord, error: importError } = await supabase
      .from('import_batches')
      .insert(importBatch)
      .select()
      .single()

    if (importError) {
      console.error('Import batch creation error:', importError)
      return NextResponse.json(
        { error: 'Failed to create import batch' },
        { status: 500 }
      )
    }

    // Process import based on options
    const processResult = await processImport({
      batchId: importRecord.id,
      barbershopId,
      data: transformedData,
      duplicates: duplicateAnalysis,
      options: importOptions,
      supabase
    })

    // Update import batch status
    await supabase
      .from('import_batches')
      .update({
        status: processResult.success ? 'completed' : 'failed',
        imported_records: processResult.imported,
        skipped_records: processResult.skipped,
        error_records: processResult.errors,
        completed_at: new Date().toISOString()
      })
      .eq('id', importRecord.id)

    return NextResponse.json({
      success: processResult.success,
      batchId: importRecord.id,
      summary: {
        platform,
        totalProcessed: processResult.totalProcessed,
        imported: processResult.imported,
        skipped: processResult.skipped,
        errors: processResult.errors,
        duplicates: duplicateAnalysis.summary
      },
      details: processResult.details
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Import failed', details: error.message },
      { status: 500 }
    )
  }
}

// Process the actual import
async function processImport({ 
  batchId, 
  barbershopId, 
  data, 
  duplicates, 
  options, 
  supabase 
}) {
  const results = {
    success: true,
    totalProcessed: 0,
    imported: {},
    skipped: {},
    errors: {},
    details: []
  }

  try {
    // Import customers
    if (data.customers && data.customers.length > 0) {
      const customerResult = await importCustomers(
        data.customers,
        barbershopId,
        batchId,
        duplicates.customers || {},
        options,
        supabase
      )
      results.imported.customers = customerResult.imported
      results.skipped.customers = customerResult.skipped
      results.errors.customers = customerResult.errors
      results.totalProcessed += data.customers.length
    }

    // Import services
    if (data.services && data.services.length > 0) {
      const serviceResult = await importServices(
        data.services,
        barbershopId,
        batchId,
        duplicates.services || {},
        options,
        supabase
      )
      results.imported.services = serviceResult.imported
      results.skipped.services = serviceResult.skipped
      results.errors.services = serviceResult.errors
      results.totalProcessed += data.services.length
    }

    // Import appointments (must be after customers and services)
    if (data.appointments && data.appointments.length > 0) {
      const appointmentResult = await importAppointments(
        data.appointments,
        barbershopId,
        batchId,
        options,
        supabase
      )
      results.imported.appointments = appointmentResult.imported
      results.skipped.appointments = appointmentResult.skipped
      results.errors.appointments = appointmentResult.errors
      results.totalProcessed += data.appointments.length
    }

    // Import products
    if (data.products && data.products.length > 0) {
      const productResult = await importProducts(
        data.products,
        barbershopId,
        batchId,
        options,
        supabase
      )
      results.imported.products = productResult.imported
      results.skipped.products = productResult.skipped
      results.errors.products = productResult.errors
      results.totalProcessed += data.products.length
    }

    // Import staff
    if (data.staff && data.staff.length > 0) {
      const staffResult = await importStaff(
        data.staff,
        barbershopId,
        batchId,
        options,
        supabase
      )
      results.imported.staff = staffResult.imported
      results.skipped.staff = staffResult.skipped
      results.errors.staff = staffResult.errors
      results.totalProcessed += data.staff.length
    }

  } catch (error) {
    console.error('Process import error:', error)
    results.success = false
    results.details.push({
      type: 'error',
      message: error.message
    })
  }

  return results
}

// Import customers with duplicate handling
async function importCustomers(customers, barbershopId, batchId, duplicates, options, supabase) {
  const result = { imported: 0, skipped: 0, errors: 0 }
  const batchSize = 100 // Process in batches to avoid timeouts

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize)
    const toInsert = []

    for (const customer of batch) {
      // Check if duplicate
      if (duplicates[customer.tempId]) {
        if (options.duplicateStrategy === 'skip') {
          result.skipped++
          continue
        } else if (options.duplicateStrategy === 'update') {
          // Update existing customer
          const { error } = await supabase
            .from('customers')
            .update({
              ...customer,
              updated_at: new Date().toISOString(),
              import_batch_id: batchId
            })
            .eq('id', duplicates[customer.tempId].existingId)

          if (error) {
            result.errors++
          } else {
            result.imported++
          }
          continue
        }
      }

      // Prepare for insert
      toInsert.push({
        ...customer,
        barbershop_id: barbershopId,
        import_batch_id: batchId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    // Batch insert
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('customers')
        .insert(toInsert)

      if (error) {
        console.error('Customer batch insert error:', error)
        result.errors += toInsert.length
      } else {
        result.imported += toInsert.length
      }
    }
  }

  return result
}

// Import services
async function importServices(services, barbershopId, batchId, duplicates, options, supabase) {
  const result = { imported: 0, skipped: 0, errors: 0 }
  
  for (const service of services) {
    // Check for existing service
    const { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('name', service.name)
      .single()

    if (existing) {
      if (options.duplicateStrategy === 'skip') {
        result.skipped++
      } else if (options.duplicateStrategy === 'update') {
        const { error } = await supabase
          .from('services')
          .update({
            ...service,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          result.errors++
        } else {
          result.imported++
        }
      }
    } else {
      // Insert new service
      const { error } = await supabase
        .from('services')
        .insert({
          ...service,
          barbershop_id: barbershopId,
          import_batch_id: batchId,
          created_at: new Date().toISOString()
        })

      if (error) {
        result.errors++
      } else {
        result.imported++
      }
    }
  }

  return result
}

// Import appointments
async function importAppointments(appointments, barbershopId, batchId, options, supabase) {
  const result = { imported: 0, skipped: 0, errors: 0 }
  const batchSize = 50

  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize)
    const toInsert = []

    for (const appointment of batch) {
      // Map customer and service IDs
      const mappedAppointment = await mapAppointmentReferences(
        appointment,
        barbershopId,
        supabase
      )

      if (!mappedAppointment) {
        result.errors++
        continue
      }

      toInsert.push({
        ...mappedAppointment,
        barbershop_id: barbershopId,
        import_batch_id: batchId,
        created_at: new Date().toISOString()
      })
    }

    // Batch insert
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('appointments')
        .insert(toInsert)

      if (error) {
        console.error('Appointment batch insert error:', error)
        result.errors += toInsert.length
      } else {
        result.imported += toInsert.length
      }
    }
  }

  return result
}

// Import products
async function importProducts(products, barbershopId, batchId, options, supabase) {
  const result = { imported: 0, skipped: 0, errors: 0 }
  
  const { error } = await supabase
    .from('products')
    .insert(
      products.map(product => ({
        ...product,
        barbershop_id: barbershopId,
        import_batch_id: batchId,
        created_at: new Date().toISOString()
      }))
    )

  if (error) {
    result.errors = products.length
  } else {
    result.imported = products.length
  }

  return result
}

// Import staff
async function importStaff(staff, barbershopId, batchId, options, supabase) {
  const result = { imported: 0, skipped: 0, errors: 0 }
  
  for (const member of staff) {
    // Check if staff member exists
    const { data: existing } = await supabase
      .from('barbershop_staff')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('email', member.email)
      .single()

    if (existing) {
      result.skipped++
    } else {
      const { error } = await supabase
        .from('barbershop_staff')
        .insert({
          ...member,
          barbershop_id: barbershopId,
          import_batch_id: batchId,
          created_at: new Date().toISOString()
        })

      if (error) {
        result.errors++
      } else {
        result.imported++
      }
    }
  }

  return result
}

// Map appointment references to actual IDs
async function mapAppointmentReferences(appointment, barbershopId, supabase) {
  try {
    // Map customer
    if (appointment.customer_email) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('email', appointment.customer_email)
        .single()

      if (customer) {
        appointment.customer_id = customer.id
      }
    }

    // Map service
    if (appointment.service_name) {
      const { data: service } = await supabase
        .from('services')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('name', appointment.service_name)
        .single()

      if (service) {
        appointment.service_id = service.id
      }
    }

    // Map staff
    if (appointment.staff_email) {
      const { data: staff } = await supabase
        .from('barbershop_staff')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('email', appointment.staff_email)
        .single()

      if (staff) {
        appointment.staff_id = staff.id
      }
    }

    return appointment
  } catch (error) {
    console.error('Reference mapping error:', error)
    return null
  }
}

// GET endpoint for checking import status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')
    
    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}