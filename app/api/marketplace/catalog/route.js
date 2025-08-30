import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/marketplace/catalog - Browse BookedBarber product catalog
export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberbarbershopId = searchParams.get('barberbarbershop_id');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'name';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check if barbershop is enrolled and get subscription tier
    let enrollmentStatus = null;
    let subscriptionTier = 'free';
    
    if (barberbarbershopId) {
      const { data: enrollment } = await supabase
        .from('marketplace_enrollment')
        .select('is_enrolled, enrollment_status, subscription_tier, discount_tier')
        .eq('barberbarbershop_id', barberbarbershopId)
        .single();

      enrollmentStatus = enrollment;
      subscriptionTier = enrollment?.subscription_tier || 'free';
    }

    // Build query for master products
    let query = supabase
      .from('master_products')
      .select(`
        *,
        warehouse_inventory!inner(
          quantity_available,
          reorder_point,
          lead_time_days
        )
      `)
      .eq('is_active', true);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (brand && brand !== 'all') {
      query = query.eq('brand', brand);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    const sortOptions = {
      'name': { column: 'name', ascending: true },
      'price_low': { column: 'wholesale_price', ascending: true },
      'price_high': { column: 'wholesale_price', ascending: false },
      'newest': { column: 'created_at', ascending: false },
      'featured': { column: 'is_featured', ascending: false }
    };

    const sort = sortOptions[sortBy] || sortOptions['name'];
    query = query.order(sort.column, { ascending: sort.ascending });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Error fetching catalog:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate prices based on subscription tier
    const productsWithPricing = products.map(product => {
      // Get tier pricing multiplier from product data
      const tierPricing = product.tier_pricing || {
        free: 1.0,
        premium: 0.95,
        enterprise: 0.85
      };
      
      // Apply subscription tier pricing
      const tierMultiplier = tierPricing[subscriptionTier] || 1.0;
      const yourPrice = product.wholesale_price * tierMultiplier;
      
      // Calculate tier discount percentage for display
      const tierDiscountPercent = Math.round((1 - tierMultiplier) * 100);
      
      // Calculate bulk pricing with tier discount applied
      const bulkPricing = [];
      if (product.bulk_pricing_tiers && Array.isArray(product.bulk_pricing_tiers)) {
        product.bulk_pricing_tiers.forEach(tier => {
          const baseDiscountedPrice = product.wholesale_price * (1 - tier.discount_percent / 100);
          const tierDiscountedPrice = baseDiscountedPrice * tierMultiplier;
          bulkPricing.push({
            min_quantity: tier.min_quantity,
            unit_price: tierDiscountedPrice,
            discount_percent: tier.discount_percent,
            tier_discount_percent: tierDiscountPercent,
            total_discount_percent: Math.round((1 - tierDiscountedPrice / product.wholesale_price) * 100),
            total_savings: (product.wholesale_price - tierDiscountedPrice) * tier.min_quantity
          });
        });
      }

      // Handle warehouse_inventory as array (from inner join) or object
      const warehouseInventory = Array.isArray(product.warehouse_inventory) 
        ? product.warehouse_inventory[0] 
        : product.warehouse_inventory;

      return {
        ...product,
        your_price: yourPrice,
        tier_discount_percent: tierDiscountPercent,
        subscription_tier: subscriptionTier,
        bulk_pricing: bulkPricing,
        in_stock: warehouseInventory?.quantity_available > 0 || false,
        stock_status: getStockStatus(warehouseInventory),
        estimated_profit: product.msrp - yourPrice,
        profit_margin: ((product.msrp - yourPrice) / product.msrp * 100).toFixed(1),
        // Add savings information for UI
        savings_amount: product.wholesale_price - yourPrice,
        upgrade_savings: subscriptionTier === 'free' ? {
          premium: product.wholesale_price * (tierPricing.free - tierPricing.premium),
          enterprise: product.wholesale_price * (tierPricing.free - tierPricing.enterprise)
        } : subscriptionTier === 'premium' ? {
          enterprise: product.wholesale_price * (tierPricing.premium - tierPricing.enterprise)
        } : null
      };
    });

    // Get categories and brands for filters
    const { data: categories } = await supabase
      .from('master_products')
      .select('category')
      .eq('is_active', true);

    const { data: brands } = await supabase
      .from('master_products')
      .select('brand')
      .eq('is_active', true);

    const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))];
    const uniqueBrands = [...new Set(brands?.map(b => b.brand).filter(Boolean))];

    return NextResponse.json({
      products: productsWithPricing,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit)
      },
      filters: {
        categories: uniqueCategories,
        brands: uniqueBrands
      },
      enrollment: enrollmentStatus,
      subscription_tier: subscriptionTier,
      tier_benefits: {
        free: { discount: '0%', description: 'Standard wholesale pricing' },
        premium: { discount: '5%', description: '5% discount on all products' },
        enterprise: { discount: '15%', description: '15% discount + exclusive products' }
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to determine stock status
function getStockStatus(inventory) {
  if (!inventory) {
    return {
      status: 'unknown',
      message: 'Stock info unavailable',
      color: 'gray',
      available: 0
    };
  }
  
  const available = inventory.quantity_available;
  const reorderPoint = inventory.reorder_point || 10;
  
  if (available === 0) {
    return {
      status: 'out_of_stock',
      message: 'Out of stock',
      color: 'red',
      available: 0
    };
  } else if (available <= reorderPoint) {
    return {
      status: 'low_stock',
      message: `Only ${available} left`,
      color: 'orange',
      available
    };
  } else if (available > reorderPoint * 5) {
    return {
      status: 'in_stock',
      message: 'In stock',
      color: 'green',
      available
    };
  } else {
    return {
      status: 'in_stock',
      message: `${available} available`,
      color: 'green',
      available
    };
  }
}

// POST /api/marketplace/catalog/import - Import products from catalog to local inventory
export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      barberbarbershop_id,
      master_product_id,
      initial_quantity,
      retail_price,
      show_in_pos,
      auto_reorder
    } = body;

    // Validate required fields
    if (!barberbarbershop_id || !master_product_id) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get master product details with tier pricing
    const { data: masterProduct, error: productError } = await supabase
      .from('master_products')
      .select('*')
      .eq('id', master_product_id)
      .single();

    if (productError || !masterProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if already imported
    const { data: existing } = await supabase
      .from('barbershop_inventory')
      .select('id')
      .eq('barberbarbershop_id', barberbarbershop_id)
      .eq('marketplace_product_id', master_product_id)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Product already in your inventory' 
      }, { status: 409 });
    }

    // Get subscription tier for pricing
    const { data: enrollment } = await supabase
      .from('marketplace_enrollment')
      .select('subscription_tier')
      .eq('barberbarbershop_id', barberbarbershop_id)
      .single();

    const subscriptionTier = enrollment?.subscription_tier || 'free';
    
    // Get tier pricing from product
    const tierPricing = masterProduct.tier_pricing || {
      free: 1.0,
      premium: 0.95,
      enterprise: 0.85
    };
    
    const tierMultiplier = tierPricing[subscriptionTier] || 1.0;
    const costPrice = masterProduct.wholesale_price * tierMultiplier;
    const suggestedRetail = retail_price || masterProduct.msrp;

    // Create local inventory record
    const { data: newInventory, error: insertError } = await supabase
      .from('barbershop_inventory')
      .insert({
        barberbarbershop_id,
        product_source: 'marketplace',
        marketplace_product_id: master_product_id,
        name: masterProduct.name,
        brand: masterProduct.brand,
        sku: masterProduct.sku,
        barcode: masterProduct.barcode,
        category: masterProduct.category,
        subcategory: masterProduct.subcategory,
        description: masterProduct.description,
        quantity_on_hand: initial_quantity || 0,
        cost_price: costPrice,
        retail_price: suggestedRetail,
        reorder_point: 5,
        reorder_quantity: masterProduct.min_order_quantity || 10,
        preferred_supplier: 'marketplace',
        show_in_pos: show_in_pos !== false,
        auto_reorder_enabled: auto_reorder || false,
        image_url: masterProduct.image_url,
        thumbnail_url: masterProduct.thumbnail_url,
        last_marketplace_sync: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error importing product:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: newInventory,
      message: 'Product imported to your inventory'
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}