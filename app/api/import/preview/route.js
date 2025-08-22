/**
 * Import Preview API Endpoint
 * Parses uploaded file and returns preview with field mapping suggestions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { CSVProcessor } from '@/lib/integrations/csv-processor'
import { DataTransformer } from '@/lib/integrations/data-transformer'
import { SquareAdapter } from '@/lib/integrations/adapters/square-adapter'
import { TrafftAdapter } from '@/lib/integrations/adapters/trafft-adapter'
import { BooksyAdapter } from '@/lib/integrations/adapters/booksy-adapter'
import { SchedulicityAdapter } from '@/lib/integrations/adapters/schedulicity-adapter'
import { AcuityAdapter } from '@/lib/integrations/adapters/acuity-adapter'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Platform adapters
const ADAPTERS = {
  square: SquareAdapter,
  trafft: TrafftAdapter,
  booksy: BooksyAdapter,
  schedulicity: SchedulicityAdapter,
  acuity: AcuityAdapter
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const importId = searchParams.get('importId')

    if (!importId) {
      return NextResponse.json(
        { error: 'Import ID is required' },
        { status: 400 }
      )
    }

    // Fetch import record
    const { data: importRecord, error: fetchError } = await supabase
      .from('data_imports')
      .select('*')
      .eq('id', importId)
      .single()

    if (fetchError || !importRecord) {
      return NextResponse.json(
        { error: 'Import record not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (importRecord.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Import already processed',
          status: importRecord.status 
        },
        { status: 400 }
      )
    }

    // Read the uploaded file
    const fileContent = await readFile(importRecord.file_path, 'utf-8')

    // Parse CSV
    const csvProcessor = new CSVProcessor()
    const parseResult = await csvProcessor.parseCSV(fileContent, {
      delimiter: importRecord.delimiter,
      hasHeaders: true
    })

    if (parseResult.errors && parseResult.errors.length > 0) {
      // Update import record with parsing errors
      await supabase
        .from('data_imports')
        .update({
          status: 'failed',
          validation_errors: parseResult.errors,
          error_summary: 'Failed to parse CSV file'
        })
        .eq('id', importId)

      return NextResponse.json(
        { 
          error: 'CSV parsing failed',
          errors: parseResult.errors 
        },
        { status: 400 }
      )
    }

    // Get platform adapter
    const AdapterClass = ADAPTERS[importRecord.source_platform]
    let adapter = null
    let entityType = importRecord.import_type

    if (AdapterClass) {
      adapter = new AdapterClass()
      
      // Auto-detect entity type if not specified
      if (entityType === 'unknown' || !entityType) {
        const headers = Object.keys(parseResult.data[0] || {})
        entityType = adapter.detectEntityType(headers)
        
        // Update import record with detected type
        await supabase
          .from('data_imports')
          .update({ import_type: entityType })
          .eq('id', importId)
      }
    }

    // Create data transformer
    const transformer = new DataTransformer()

    // Get schema for entity type
    const schema = DataTransformer.UNIVERSAL_SCHEMA[entityType]
    if (!schema) {
      return NextResponse.json(
        { 
          error: 'Unknown entity type',
          message: `Could not determine data type. Please specify if this is customers, appointments, or services data.`
        },
        { status: 400 }
      )
    }

    // Validate schema and suggest field mappings
    const validation = csvProcessor.validateSchema(parseResult.data, schema)

    // Get preview data (first 10 rows)
    const previewData = parseResult.data.slice(0, 10)

    // Transform preview data if adapter is available
    let transformedPreview = null
    if (adapter && adapter[`transform${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`]) {
      const transformMethod = `transform${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`
      const transformResult = adapter[transformMethod](previewData)
      transformedPreview = transformResult.transformed
    }

    // Check for existing field mapping configuration
    const { data: savedMapping } = await supabase
      .from('import_field_mappings')
      .select('*')
      .eq('barbershop_id', importRecord.barbershop_id)
      .eq('source_platform', importRecord.source_platform)
      .eq('entity_type', entityType)
      .eq('is_default', true)
      .single()

    // Update import status to validating
    await supabase
      .from('data_imports')
      .update({
        status: 'validating',
        total_records: parseResult.data.length,
        field_mapping: validation.fieldMapping
      })
      .eq('id', importId)

    // Add audit log
    await supabase
      .from('import_audit_log')
      .insert({
        import_id: importId,
        action: 'File parsed and previewed',
        action_type: 'success',
        details: {
          totalRows: parseResult.data.length,
          entityType: entityType,
          fieldsDetected: Object.keys(parseResult.data[0] || {})
        }
      })

    // Return preview response
    return NextResponse.json({
      success: true,
      importId: importId,
      entityType: entityType,
      platform: importRecord.source_platform,
      file: {
        name: importRecord.original_filename,
        size: importRecord.file_size_bytes,
        format: importRecord.file_format,
        delimiter: parseResult.meta.delimiter
      },
      data: {
        totalRecords: parseResult.data.length,
        headers: Object.keys(parseResult.data[0] || {}),
        preview: previewData,
        transformedPreview: transformedPreview
      },
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings || parseResult.warnings
      },
      fieldMapping: {
        suggested: validation.fieldMapping,
        saved: savedMapping?.field_mappings || null
      },
      schema: {
        required: Object.keys(schema.required),
        optional: Object.keys(schema.optional || {})
      },
      nextStep: validation.isValid 
        ? `/api/import/process?importId=${importId}`
        : `/api/import/mapping?importId=${importId}`
    })

  } catch (error) {
    console.error('Preview error:', error)
    
    return NextResponse.json(
      { 
        error: 'Preview generation failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
}