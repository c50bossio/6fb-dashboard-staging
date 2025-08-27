from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models import ProductSale, Product, ProductBundle, ProductRecommendation
from app.auth import get_current_user
from app.schemas.pos import (
    ProductSaleCreate, 
    ProductSaleResponse, 
    POSProductResponse,
    ProductAnalytics,
    DailySalesAnalytics,
    StockAdjustment,
    StockAdjustmentResponse,
    ReceiptData
)

router = APIRouter()

@router.get("/products", response_model=List[POSProductResponse])
async def get_pos_products(
    barbershop_id: str,
    category: Optional[str] = None,
    in_stock_only: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get products available for POS with inventory info"""
    query = db.query(Product).filter(
        Product.barbershop_id == barbershop_id,
        Product.show_in_pos == True
    )
    
    if category:
        query = query.filter(Product.category == category)
    
    if in_stock_only:
        query = query.filter(Product.current_stock > 0)
    
    products = query.order_by(Product.pos_display_order, Product.name).all()
    return products

@router.post("/sales", response_model=ProductSaleResponse)
async def create_product_sale(
    sale_data: ProductSaleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Process a product sale through POS"""
    
    # Verify product exists and has stock
    product = db.query(Product).filter(Product.id == sale_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.current_stock < sale_data.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient stock. Available: {product.current_stock}"
        )
    
    # Calculate totals
    subtotal = sale_data.unit_price * sale_data.quantity
    tax_amount = subtotal * (product.tax_rate or 0) / 100
    total_amount = subtotal + tax_amount - (sale_data.discount_amount or 0)
    
    # Create sale record
    sale = ProductSale(
        id=str(uuid.uuid4()),
        barbershop_id=sale_data.barbershop_id,
        product_id=sale_data.product_id,
        quantity=sale_data.quantity,
        unit_price=sale_data.unit_price,
        discount_amount=sale_data.discount_amount or 0,
        tax_amount=tax_amount,
        total_amount=total_amount,
        cost_price=product.cost_price,
        barber_id=sale_data.barber_id,
        customer_id=sale_data.customer_id,
        payment_method=sale_data.payment_method,
        payment_intent_id=sale_data.payment_intent_id,
        notes=sale_data.notes,
        pos_terminal_id=sale_data.pos_terminal_id,
        receipt_number=sale_data.receipt_number,
        sale_date=datetime.utcnow()
    )
    
    db.add(sale)
    
    # Stock will be updated automatically by database trigger
    db.commit()
    db.refresh(sale)
    
    return sale

@router.get("/sales", response_model=List[ProductSaleResponse])
async def get_product_sales(
    barbershop_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    barber_id: Optional[str] = None,
    product_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get product sales history with filters"""
    
    query = db.query(ProductSale).filter(ProductSale.barbershop_id == barbershop_id)
    
    if start_date:
        query = query.filter(ProductSale.sale_date >= start_date)
    if end_date:
        query = query.filter(ProductSale.sale_date <= end_date)
    if barber_id:
        query = query.filter(ProductSale.barber_id == barber_id)
    if product_id:
        query = query.filter(ProductSale.product_id == product_id)
    
    sales = query.order_by(ProductSale.sale_date.desc()).limit(limit).all()
    return sales

@router.get("/analytics/top-products")
async def get_top_selling_products(
    barbershop_id: str,
    days: int = 30,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get analytics for top-selling products"""
    
    # Use the stored function we created in migration
    result = db.execute(
        "SELECT * FROM get_product_analytics(%s, %s) LIMIT %s",
        (barbershop_id, days, limit)
    ).fetchall()
    
    return [
        {
            "product_id": row[0],
            "product_name": row[1],
            "units_sold": row[2],
            "total_revenue": float(row[3]) if row[3] else 0,
            "total_profit": float(row[4]) if row[4] else 0,
            "avg_sale_price": float(row[5]) if row[5] else 0,
            "sales_velocity": float(row[6]) if row[6] else 0
        }
        for row in result
    ]

@router.get("/analytics/daily-sales")
async def get_daily_sales_analytics(
    barbershop_id: str,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get daily sales totals for charts"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = db.execute("""
        SELECT 
            DATE(sale_date) as sale_date,
            SUM(total_amount) as daily_revenue,
            SUM(quantity) as units_sold,
            COUNT(DISTINCT id) as transactions
        FROM product_sales 
        WHERE barbershop_id = %s AND sale_date >= %s
        GROUP BY DATE(sale_date)
        ORDER BY sale_date DESC
    """, (barbershop_id, start_date)).fetchall()
    
    return [
        {
            "date": row[0].isoformat(),
            "revenue": float(row[1]) if row[1] else 0,
            "units_sold": row[2] or 0,
            "transactions": row[3] or 0
        }
        for row in result
    ]

@router.get("/recommendations/{product_id}")
async def get_product_recommendations(
    product_id: str,
    barbershop_id: str,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get product recommendations for upselling/cross-selling"""
    
    recommendations = db.query(ProductRecommendation).join(Product).filter(
        ProductRecommendation.barbershop_id == barbershop_id,
        ProductRecommendation.trigger_product_id == product_id,
        Product.current_stock > 0,
        Product.show_in_pos == True
    ).order_by(ProductRecommendation.confidence_score.desc()).limit(limit).all()
    
    return [
        {
            "product_id": rec.recommended_product_id,
            "product_name": rec.recommended_product.name,
            "product_price": rec.recommended_product.price,
            "recommendation_type": rec.recommendation_type,
            "confidence_score": float(rec.confidence_score)
        }
        for rec in recommendations
    ]

@router.post("/stock/adjust", response_model=StockAdjustmentResponse)
async def adjust_product_stock(
    stock_data: StockAdjustment,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Manual stock adjustment (for restocking, damage, etc.)"""
    
    product = db.query(Product).filter(Product.id == stock_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update stock
    old_stock = product.current_stock
    new_stock = max(0, product.current_stock + stock_data.adjustment)
    product.current_stock = new_stock
    product.on_hand = new_stock
    
    # TODO: Add stock adjustment log table for audit trail
    
    db.commit()
    
    return StockAdjustmentResponse(
        product_id=stock_data.product_id,
        old_stock=old_stock,
        new_stock=new_stock,
        adjustment=stock_data.adjustment,
        reason=stock_data.reason
    )

@router.get("/receipt/{sale_id}", response_model=ReceiptData)
async def generate_receipt_data(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate receipt data for a sale"""
    
    sale = db.query(ProductSale).filter(ProductSale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return {
        "sale_id": sale.id,
        "receipt_number": sale.receipt_number,
        "sale_date": sale.sale_date.isoformat(),
        "product_name": sale.product.name,
        "quantity": sale.quantity,
        "unit_price": float(sale.unit_price),
        "subtotal": float(sale.unit_price * sale.quantity),
        "discount_amount": float(sale.discount_amount),
        "tax_amount": float(sale.tax_amount),
        "total_amount": float(sale.total_amount),
        "payment_method": sale.payment_method,
        "barber_name": sale.barber.name if sale.barber else None,
        "customer_name": sale.customer.name if sale.customer else None,
        "barbershop": {
            "name": sale.barbershop.name,
            "address": sale.barbershop.address,
            "phone": sale.barbershop.phone
        }
    }