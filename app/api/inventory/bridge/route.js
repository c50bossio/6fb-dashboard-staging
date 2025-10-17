import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/inventory/bridge - Bridge master_products to barbershop_inventory
export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barbershop_id, master_product_ids } = body;

    if (!barbershop_id || !master_product_ids || !Array.isArray(master_product_ids)) {
      return NextResponse.json({ 
        error: 'Missing required fields: barbershop_id, master_product_ids (array)' 
      }, { status: 400 });
    }

    // Get the master products
    const { data: masterProducts, error: masterError } = await supabase
      .from('master_products')
      .select('*')
      .in('id', master_product_ids);

    if (masterError) {
      console.error('Error fetching master products:', masterError);
      return NextResponse.json({ error: masterError.message }, { status: 500 });
    }

    if (!masterProducts || masterProducts.length === 0) {
      return NextResponse.json({ error: 'No master products found' }, { status: 404 });
    }

    // Check for existing products to avoid duplicates
    const { data: existingProducts, error: existingError } = await supabase
      .from('barbershop_inventory')
      .select('sku, master_product_id')
      .eq('barbershop_id', barbershop_id)
      .in('sku', masterProducts.map(p => p.sku));

    if (existingError) {
      console.error('Error checking existing products:', existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingSkus = new Set(existingProducts?.map(p => p.sku) || []);
    const existingMasterIds = new Set(existingProducts?.map(p => p.master_product_id) || []);

    // Filter out products that already exist
    const newProducts = masterProducts.filter(product => 
      !existingSkus.has(product.sku) && !existingMasterIds.has(product.id)
    );

    if (newProducts.length === 0) {
      return NextResponse.json({ 
        message: 'All selected products already exist in inventory',
        skipped: masterProducts.length
      });
    }

    // Create barbershop_inventory records from master_products
    const inventoryRecords = newProducts.map(masterProduct => ({
      barbershop_id,
      master_product_id: masterProduct.id,
      product_source: 'cin7',
      name: masterProduct.name,
      sku: masterProduct.sku,
      barcode: masterProduct.barcode,
      category: masterProduct.category,
      brand: masterProduct.brand,
      description: masterProduct.description,
      quantity_on_hand: 0, // Start with 0, will be updated by movements
      cost_price: masterProduct.wholesale_price,
      retail_price: masterProduct.msrp,
      reorder_point: masterProduct.min_stock_level || 5,
      reorder_quantity: masterProduct.preferred_stock_level || 10,
      track_inventory: true,
      show_in_pos: false, // Default to false, user can enable later
      commission_rate: 10, // Default commission rate
      image_url: masterProduct.image_url,
      preferred_supplier: 'cin7',
      last_cost_update: new Date().toISOString(),
      sync_enabled: true,
      cin7_product_id: masterProduct.cin7_product_id,
      is_active: masterProduct.is_active !== false
    }));

    // Insert the new inventory records
    const { data: insertedProducts, error: insertError } = await supabase
      .from('barbershop_inventory')
      .insert(inventoryRecords)
      .select();

    if (insertError) {
      console.error('Error inserting inventory records:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create inventory movement records for tracking
    const movementRecords = insertedProducts.map(product => ({
      barbershop_id,
      barbershop_inventory_id: product.id,
      movement_type: 'bridged_from_cin7',
      quantity_change: 0,
      stock_before: 0,
      stock_after: 0,
      reason: 'Added from CIN7 master catalog',
      performed_by: user.id,
      unit_cost: product.cost_price,
      total_cost_change: 0
    }));

    await supabase
      .from('inventory_movements')
      .insert(movementRecords);

    return NextResponse.json({
      success: true,
      added: insertedProducts.length,
      skipped: masterProducts.length - newProducts.length,
      products: insertedProducts
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/inventory/bridge - Get available master_products for bridging
export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const excludeExisting = searchParams.get('exclude_existing') === 'true';

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Build query for master_products
    let query = supabase
      .from('master_products')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%, sku.ilike.%${search}%, brand.ilike.%${search}%`);
    }

    const { data: masterProducts, error } = await query;

    if (error) {
      console.error('Error fetching master products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let availableProducts = masterProducts || [];

    // Exclude products that already exist in barbershop_inventory
    if (excludeExisting) {
      const { data: existingProducts } = await supabase
        .from('barbershop_inventory')
        .select('sku, master_product_id')
        .eq('barbershop_id', barbershopId);

      const existingSkus = new Set(existingProducts?.map(p => p.sku) || []);
      const existingMasterIds = new Set(existingProducts?.map(p => p.master_product_id) || []);

      availableProducts = masterProducts.filter(product => 
        !existingSkus.has(product.sku) && !existingMasterIds.has(product.id)
      );
    }

    // Get categories for filtering
    const categories = [...new Set(masterProducts.map(p => p.category).filter(Boolean))];

    return NextResponse.json({
      products: availableProducts,
      categories,
      total: availableProducts.length
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}