import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/marketplace/orders - Get barbershop's orders from BookedBarber
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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('marketplace_orders')
      .select(`
        *,
        marketplace_order_items(
          *,
          master_product:master_products(
            name,
            sku,
            brand,
            image_url
          )
        )
      `, { count: 'exact' })
      .eq('barbershop_id', barbershopId)
      .order('order_date', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate order analytics
    const analytics = {
      total_orders: count,
      pending_orders: 0,
      processing_orders: 0,
      shipped_orders: 0,
      total_spent: 0
    };

    if (orders) {
      orders.forEach(order => {
        if (order.status === 'submitted') analytics.pending_orders++;
        if (['approved', 'processing'].includes(order.status)) analytics.processing_orders++;
        if (['shipped', 'delivered'].includes(order.status)) analytics.shipped_orders++;
        analytics.total_spent += parseFloat(order.total_amount);
      });
    }

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit)
      },
      analytics
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/marketplace/orders - Create new order
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      barbershop_id,
      items,
      shipping_address,
      shipping_method,
      payment_method,
      customer_notes
    } = body;

    // Validate required fields
    if (!barbershop_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid order data' 
      }, { status: 400 });
    }

    // Check enrollment status
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('marketplace_enrollment')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .single();

    if (enrollmentError || !enrollment?.is_enrolled) {
      return NextResponse.json({ 
        error: 'Not enrolled in marketplace' 
      }, { status: 403 });
    }

    if (enrollment.enrollment_status !== 'active') {
      return NextResponse.json({ 
        error: `Account status: ${enrollment.enrollment_status}` 
      }, { status: 403 });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      // Get product details and pricing
      const { data: product } = await supabase
        .from('master_products')
        .select('*, warehouse_inventory(*)')
        .eq('id', item.master_product_id)
        .single();

      if (!product) {
        return NextResponse.json({ 
          error: `Product ${item.master_product_id} not found` 
        }, { status: 404 });
      }

      // Check stock availability
      if (product.warehouse_inventory?.quantity_available < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.warehouse_inventory?.quantity_available}` 
        }, { status: 400 });
      }

      // Calculate price with bulk discounts
      let unitPrice = product.wholesale_price;
      let discountPercent = 0;

      // Apply bulk pricing
      if (product.bulk_pricing_tiers) {
        const applicableTier = product.bulk_pricing_tiers
          .filter(tier => item.quantity >= tier.min_quantity)
          .sort((a, b) => b.min_quantity - a.min_quantity)[0];
        
        if (applicableTier) {
          discountPercent = applicableTier.discount_percent;
          unitPrice = product.wholesale_price * (1 - discountPercent / 100);
        }
      }

      // Apply enrollment tier discount
      let tierDiscount = enrollment.flat_discount_percent || 0;
      if (enrollment.discount_tier === 'silver') tierDiscount = Math.max(tierDiscount, 5);
      if (enrollment.discount_tier === 'gold') tierDiscount = Math.max(tierDiscount, 10);
      if (enrollment.discount_tier === 'platinum') tierDiscount = Math.max(tierDiscount, 15);
      
      unitPrice = unitPrice * (1 - tierDiscount / 100);

      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;

      orderItems.push({
        master_product_id: item.master_product_id,
        quantity_ordered: item.quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent + tierDiscount,
        line_subtotal: lineSubtotal,
        line_total: lineSubtotal // Will add tax later
      });
    }

    // Calculate shipping and taxes
    const shippingCost = calculateShipping(subtotal, shipping_method);
    const taxRate = 8.25; // Default tax rate, should be configurable
    const taxAmount = (subtotal + shippingCost) * (taxRate / 100);
    const totalAmount = subtotal + shippingCost + taxAmount;

    // Check credit limit if using credit terms
    if (payment_method === 'credit_terms') {
      const availableCredit = enrollment.credit_limit - enrollment.current_balance;
      if (totalAmount > availableCredit) {
        return NextResponse.json({ 
          error: `Insufficient credit. Available: $${availableCredit.toFixed(2)}` 
        }, { status: 400 });
      }
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('marketplace_orders')
      .insert({
        order_number: orderNumber,
        barbershop_id,
        status: payment_method === 'credit_card' ? 'submitted' : 'draft',
        subtotal,
        shipping_cost: shippingCost,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method,
        payment_status: payment_method === 'credit_card' ? 'pending' : 'pending',
        payment_terms: enrollment.payment_terms,
        payment_due_date: calculatePaymentDueDate(enrollment.payment_terms),
        shipping_method,
        shipping_address: shipping_address || enrollment.default_shipping_address,
        customer_notes,
        created_by: session.user.id
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Create order items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('marketplace_order_items')
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Should rollback order creation here
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    // Update enrollment statistics
    await supabase
      .from('marketplace_enrollment')
      .update({
        last_order_date: new Date().toISOString(),
        total_orders_placed: enrollment.total_orders_placed + 1,
        total_amount_spent: enrollment.total_amount_spent + totalAmount
      })
      .eq('barbershop_id', barbershop_id);

    // Send order confirmation email (implement separately)
    // await sendOrderConfirmation(order, orderItems);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: orderItems
      }
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function calculateShipping(subtotal, method) {
  // Implement shipping calculation logic
  if (subtotal >= 500) return 0; // Free shipping over $500
  if (method === 'express') return 25;
  if (method === 'standard') return 10;
  return 15; // Default
}

function generateOrderNumber() {
  const prefix = 'BB';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function calculatePaymentDueDate(terms) {
  const date = new Date();
  switch (terms) {
    case 'net15':
      date.setDate(date.getDate() + 15);
      break;
    case 'net30':
      date.setDate(date.getDate() + 30);
      break;
    case 'net60':
      date.setDate(date.getDate() + 60);
      break;
    default:
      date.setDate(date.getDate() + 1); // Due immediately
  }
  return date.toISOString();
}