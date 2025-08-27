from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

class ProductSaleCreate(BaseModel):
    barbershop_id: str
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    discount_amount: Optional[Decimal] = Field(default=0, ge=0)
    barber_id: Optional[str] = None
    customer_id: Optional[str] = None
    payment_method: str = Field(..., description="cash, card, online, house_account")
    payment_intent_id: Optional[str] = None
    notes: Optional[str] = None
    pos_terminal_id: Optional[str] = None
    receipt_number: Optional[str] = None

class ProductSaleResponse(BaseModel):
    id: str
    barbershop_id: str
    product_id: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    cost_price: Optional[Decimal]
    barber_id: Optional[str]
    customer_id: Optional[str]
    sale_date: datetime
    payment_method: str
    payment_intent_id: Optional[str]
    notes: Optional[str]
    pos_terminal_id: Optional[str]
    receipt_number: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class POSProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: Decimal
    cost_price: Optional[Decimal]
    current_stock: int
    on_hand: int
    sku: Optional[str]
    barcode: Optional[str]
    category: Optional[str]
    image_url: Optional[str]
    thumbnail_url: Optional[str]
    tax_rate: Optional[Decimal]
    commission_rate: Optional[Decimal]
    show_in_pos: bool
    pos_display_order: int
    reorder_point: int
    last_sold_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ProductRecommendationResponse(BaseModel):
    product_id: str
    product_name: str
    product_price: Decimal
    recommendation_type: str
    confidence_score: Decimal
    
    class Config:
        from_attributes = True

class ProductAnalytics(BaseModel):
    product_id: str
    product_name: str
    units_sold: int
    total_revenue: Decimal
    total_profit: Decimal
    avg_sale_price: Decimal
    sales_velocity: Decimal

class DailySalesAnalytics(BaseModel):
    date: str
    revenue: Decimal
    units_sold: int
    transactions: int

class StockAdjustment(BaseModel):
    product_id: str
    adjustment: int = Field(..., description="Positive for adding stock, negative for removing")
    reason: str = Field(..., min_length=3, max_length=200)

class StockAdjustmentResponse(BaseModel):
    product_id: str
    old_stock: int
    new_stock: int
    adjustment: int
    reason: str

class ReceiptData(BaseModel):
    sale_id: str
    receipt_number: Optional[str]
    sale_date: str
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    payment_method: str
    barber_name: Optional[str]
    customer_name: Optional[str]
    barbershop: dict