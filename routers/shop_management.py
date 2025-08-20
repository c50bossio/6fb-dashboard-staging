"""
Shop Management Router - Comprehensive shop management endpoints
Handles all shop-related operations including staff, schedules, inventory, and analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date, time
from decimal import Decimal
import os
from supabase import create_client, Client
from enum import Enum

# Import authentication
from routers.auth import get_current_user

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration")

supabase: Client = create_client(supabase_url, supabase_key)

# Create router
router = APIRouter(prefix="/api/v1/shop", tags=["Shop Management"])

# Security
security = HTTPBearer()

# ==========================================
# ENUMS
# ==========================================

class FinancialModel(str, Enum):
    COMMISSION = "commission"
    BOOTH_RENT = "booth_rent"
    HYBRID = "hybrid"

class StaffRole(str, Enum):
    BARBER = "BARBER"
    MANAGER = "MANAGER"
    RECEPTIONIST = "RECEPTIONIST"
    APPRENTICE = "APPRENTICE"

class AppointmentStatus(str, Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class TransactionType(str, Enum):
    SERVICE = "service"
    PRODUCT = "product"
    TIP = "tip"
    REFUND = "refund"
    BOOTH_RENT = "booth_rent"

# ==========================================
# MODELS
# ==========================================

class ShopInfo(BaseModel):
    id: str
    name: str
    slug: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    description: Optional[str]
    opening_hours: Optional[Dict[str, Any]]
    is_active: bool = True

class StaffMember(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    role: StaffRole
    is_active: bool = True
    commission_rate: Optional[float] = None
    booth_rent_amount: Optional[float] = None
    financial_model: Optional[FinancialModel] = None
    can_manage_schedule: bool = False
    can_view_reports: bool = False
    can_manage_clients: bool = False
    can_sell_products: bool = False

class StaffSchedule(BaseModel):
    barber_id: str
    date: date
    start_time: time
    end_time: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    is_available: bool = True
    notes: Optional[str] = None

class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str
    price: float = Field(..., ge=0)
    duration_minutes: int = Field(..., ge=5)
    online_booking_enabled: bool = True
    is_featured: bool = False
    is_active: bool = True

class CustomerCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    preferred_barber_id: Optional[str] = None
    notes: Optional[str] = None
    marketing_consent: bool = False

class AppointmentCreate(BaseModel):
    customer_id: str
    barber_id: str
    service_id: str
    appointment_date: date
    start_time: datetime
    duration_minutes: int
    notes: Optional[str] = None

class TransactionCreate(BaseModel):
    appointment_id: Optional[str] = None
    customer_id: Optional[str] = None
    barber_id: Optional[str] = None
    transaction_type: TransactionType
    amount: float
    payment_method: str
    description: Optional[str] = None

class InventoryUpdate(BaseModel):
    product_id: str
    quantity_change: int
    movement_type: str  # 'purchase', 'sale', 'adjustment', 'waste'
    cost_per_unit: Optional[float] = None
    notes: Optional[str] = None

class ShopMetrics(BaseModel):
    total_revenue: float
    today_revenue: float
    week_revenue: float
    month_revenue: float
    total_appointments: int
    today_appointments: int
    completed_appointments: int
    cancellation_rate: float
    average_service_value: float
    total_customers: int
    new_customers_month: int
    returning_customers: int
    average_rating: float
    total_products: int
    low_stock_products: int

class CommissionReport(BaseModel):
    barber_id: str
    barber_name: str
    period_start: date
    period_end: date
    total_services: float
    total_products: float
    total_tips: float
    commission_rate: float
    commission_amount: float
    booth_rent: float
    net_payout: float

# ==========================================
# ENDPOINTS - SHOP INFORMATION
# ==========================================

@router.get("/info", response_model=ShopInfo)
async def get_shop_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get shop information for the authenticated owner"""
    try:
        # Get shop by owner
        response = supabase.table('barbershops').select('*').eq('owner_id', current_user['id']).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        return ShopInfo(**response.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/info", response_model=ShopInfo)
async def update_shop_info(
    shop_data: ShopInfo,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Update shop information"""
    try:
        # Verify ownership
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=403, detail="Not authorized to update this shop")
        
        # Update shop info
        update_data = shop_data.dict(exclude={'id'}, exclude_unset=True)
        response = supabase.table('barbershops').update(update_data).eq('id', shop_response.data['id']).execute()
        
        return ShopInfo(**response.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINTS - STAFF MANAGEMENT
# ==========================================

@router.get("/staff", response_model=List[StaffMember])
async def get_staff_members(
    active_only: bool = True,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get all staff members for the shop"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Get staff members with profile info
        query = supabase.table('barbershop_staff').select(
            '*, profiles(id, email, full_name)'
        ).eq('barbershop_id', shop_response.data['id'])
        
        if active_only:
            query = query.eq('is_active', True)
        
        response = query.execute()
        
        staff_members = []
        for staff in response.data:
            staff_members.append(StaffMember(
                id=staff['id'],
                user_id=staff['user_id'],
                name=staff['profiles']['full_name'] or 'Unknown',
                email=staff['profiles']['email'],
                role=staff['role'],
                is_active=staff['is_active'],
                commission_rate=staff.get('commission_rate'),
                booth_rent_amount=staff.get('booth_rent_amount'),
                financial_model=staff.get('financial_model'),
                can_manage_schedule=staff.get('can_manage_schedule', False),
                can_view_reports=staff.get('can_view_reports', False),
                can_manage_clients=staff.get('can_manage_clients', False),
                can_sell_products=staff.get('can_sell_products', False)
            ))
        
        return staff_members
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/staff", response_model=StaffMember)
async def add_staff_member(
    staff_data: StaffMember,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Add a new staff member to the shop"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Add staff member
        insert_data = {
            'barbershop_id': shop_response.data['id'],
            'user_id': staff_data.user_id,
            'role': staff_data.role,
            'is_active': staff_data.is_active,
            'commission_rate': staff_data.commission_rate,
            'booth_rent_amount': staff_data.booth_rent_amount,
            'financial_model': staff_data.financial_model,
            'can_manage_schedule': staff_data.can_manage_schedule,
            'can_view_reports': staff_data.can_view_reports,
            'can_manage_clients': staff_data.can_manage_clients,
            'can_sell_products': staff_data.can_sell_products
        }
        
        response = supabase.table('barbershop_staff').insert(insert_data).execute()
        
        return staff_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/staff/{staff_id}", response_model=StaffMember)
async def update_staff_member(
    staff_id: str,
    staff_data: StaffMember,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Update a staff member's information"""
    try:
        # Verify ownership
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update staff member
        update_data = staff_data.dict(exclude={'id', 'user_id'}, exclude_unset=True)
        response = supabase.table('barbershop_staff').update(update_data).eq('id', staff_id).eq('barbershop_id', shop_response.data['id']).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        return staff_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/staff/{staff_id}")
async def remove_staff_member(
    staff_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Remove a staff member from the shop (soft delete)"""
    try:
        # Verify ownership
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Soft delete staff member
        response = supabase.table('barbershop_staff').update({'is_active': False}).eq('id', staff_id).eq('barbershop_id', shop_response.data['id']).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        return {"message": "Staff member removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINTS - SCHEDULE MANAGEMENT
# ==========================================

@router.get("/schedule", response_model=List[StaffSchedule])
async def get_staff_schedules(
    start_date: date,
    end_date: Optional[date] = None,
    barber_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get staff schedules for a date range"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Default end date to start date if not provided
        if not end_date:
            end_date = start_date
        
        # Get schedules
        query = supabase.table('staff_schedule').select('*').eq('barbershop_id', shop_response.data['id']).gte('date', start_date).lte('date', end_date)
        
        if barber_id:
            query = query.eq('barber_id', barber_id)
        
        response = query.order('date', desc=False).execute()
        
        schedules = []
        for schedule in response.data:
            schedules.append(StaffSchedule(
                barber_id=schedule['barber_id'],
                date=schedule['date'],
                start_time=schedule['start_time'],
                end_time=schedule['end_time'],
                break_start=schedule.get('break_start'),
                break_end=schedule.get('break_end'),
                is_available=schedule['is_available'],
                notes=schedule.get('notes')
            ))
        
        return schedules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule", response_model=StaffSchedule)
async def create_staff_schedule(
    schedule_data: StaffSchedule,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Create a staff schedule entry"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Create schedule
        insert_data = {
            'barbershop_id': shop_response.data['id'],
            'barber_id': schedule_data.barber_id,
            'date': str(schedule_data.date),
            'start_time': str(schedule_data.start_time),
            'end_time': str(schedule_data.end_time),
            'break_start': str(schedule_data.break_start) if schedule_data.break_start else None,
            'break_end': str(schedule_data.break_end) if schedule_data.break_end else None,
            'is_available': schedule_data.is_available,
            'notes': schedule_data.notes,
            'day_of_week': schedule_data.date.weekday()
        }
        
        response = supabase.table('staff_schedule').insert(insert_data).execute()
        
        return schedule_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule/bulk")
async def create_bulk_schedules(
    schedules: List[StaffSchedule],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Create multiple schedule entries at once"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Prepare bulk insert data
        insert_data = []
        for schedule in schedules:
            insert_data.append({
                'barbershop_id': shop_response.data['id'],
                'barber_id': schedule.barber_id,
                'date': str(schedule.date),
                'start_time': str(schedule.start_time),
                'end_time': str(schedule.end_time),
                'break_start': str(schedule.break_start) if schedule.break_start else None,
                'break_end': str(schedule.break_end) if schedule.break_end else None,
                'is_available': schedule.is_available,
                'notes': schedule.notes,
                'day_of_week': schedule.date.weekday()
            })
        
        response = supabase.table('staff_schedule').insert(insert_data).execute()
        
        return {"message": f"Created {len(insert_data)} schedule entries"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINTS - ANALYTICS & METRICS
# ==========================================

@router.get("/metrics", response_model=ShopMetrics)
async def get_shop_metrics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive shop metrics and analytics"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        shop_id = shop_response.data['id']
        
        # Call stored procedure for metrics
        metrics_response = supabase.rpc('get_shop_dashboard_metrics', {'p_barbershop_id': shop_id}).execute()
        
        if metrics_response.data:
            metrics_data = metrics_response.data
        else:
            # Fallback to manual calculation if stored procedure fails
            metrics_data = await calculate_metrics_manually(shop_id)
        
        return ShopMetrics(
            total_revenue=metrics_data.get('month_revenue', 0),
            today_revenue=metrics_data.get('today_revenue', 0),
            week_revenue=metrics_data.get('week_revenue', 0),
            month_revenue=metrics_data.get('month_revenue', 0),
            total_appointments=metrics_data.get('week_appointments', 0),
            today_appointments=metrics_data.get('today_appointments', 0),
            completed_appointments=0,  # Would need additional query
            cancellation_rate=0,  # Would need additional calculation
            average_service_value=0,  # Would need additional calculation
            total_customers=metrics_data.get('total_customers', 0),
            new_customers_month=metrics_data.get('new_customers_month', 0),
            returning_customers=metrics_data.get('active_customers', 0),
            average_rating=4.5,  # Default or calculate from reviews
            total_products=metrics_data.get('total_products', 0),
            low_stock_products=metrics_data.get('low_stock_products', 0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def calculate_metrics_manually(shop_id: str) -> dict:
    """Fallback function to calculate metrics manually"""
    metrics = {
        'today_revenue': 0,
        'week_revenue': 0,
        'month_revenue': 0,
        'today_appointments': 0,
        'week_appointments': 0,
        'total_customers': 0,
        'new_customers_month': 0,
        'active_customers': 0,
        'total_products': 0,
        'low_stock_products': 0
    }
    
    try:
        # Get transactions for revenue
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_start = today.replace(day=1)
        
        transactions = supabase.table('transactions').select('*').eq('barbershop_id', shop_id).execute()
        
        for transaction in transactions.data:
            trans_date = datetime.fromisoformat(transaction['processed_at'].replace('Z', '+00:00')).date()
            amount = float(transaction.get('net_amount', 0))
            
            if trans_date == today:
                metrics['today_revenue'] += amount
            if trans_date >= week_ago:
                metrics['week_revenue'] += amount
            if trans_date >= month_start:
                metrics['month_revenue'] += amount
        
        # Get customer count
        customers = supabase.table('customers').select('id, created_at, last_visit').eq('barbershop_id', shop_id).execute()
        metrics['total_customers'] = len(customers.data)
        
        for customer in customers.data:
            if customer.get('created_at'):
                created_date = datetime.fromisoformat(customer['created_at'].replace('Z', '+00:00')).date()
                if created_date >= month_start:
                    metrics['new_customers_month'] += 1
            
            if customer.get('last_visit'):
                last_visit = datetime.fromisoformat(customer['last_visit'].replace('Z', '+00:00')).date()
                if last_visit >= week_ago:
                    metrics['active_customers'] += 1
        
        # Get product metrics
        products = supabase.table('products').select('current_stock, min_stock_level').eq('barbershop_id', shop_id).execute()
        metrics['total_products'] = len(products.data)
        
        for product in products.data:
            if product.get('current_stock', 0) <= product.get('min_stock_level', 0):
                metrics['low_stock_products'] += 1
        
        # Get appointment counts
        bookings = supabase.table('bookings').select('created_at').eq('shop_id', shop_id).execute()
        
        for booking in bookings.data:
            booking_date = datetime.fromisoformat(booking['created_at'].replace('Z', '+00:00')).date()
            if booking_date == today:
                metrics['today_appointments'] += 1
            if booking_date >= week_ago:
                metrics['week_appointments'] += 1
    
    except Exception as e:
        print(f"Error calculating metrics manually: {e}")
    
    return metrics

@router.get("/commissions", response_model=List[CommissionReport])
async def get_commission_reports(
    start_date: date,
    end_date: date,
    barber_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get commission reports for barbers"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        shop_id = shop_response.data['id']
        
        # Call stored procedure for commission calculation
        commission_response = supabase.rpc('calculate_barber_commission', {
            'p_barbershop_id': shop_id,
            'p_start_date': str(start_date),
            'p_end_date': str(end_date)
        }).execute()
        
        reports = []
        for commission in commission_response.data:
            if not barber_id or commission['barber_id'] == barber_id:
                reports.append(CommissionReport(
                    barber_id=commission['barber_id'],
                    barber_name=commission['barber_name'],
                    period_start=start_date,
                    period_end=end_date,
                    total_services=float(commission.get('total_services', 0)),
                    total_products=float(commission.get('total_products', 0)),
                    total_tips=0,  # Would need additional calculation
                    commission_rate=float(commission.get('commission_rate', 0)),
                    commission_amount=float(commission.get('commission_amount', 0)),
                    booth_rent=0,  # Would need to fetch from financial_arrangements
                    net_payout=float(commission.get('commission_amount', 0))  # Simplified
                ))
        
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINTS - SERVICES
# ==========================================

@router.get("/services")
async def get_services(
    active_only: bool = True,
    category: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get all services for the shop"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Get services
        query = supabase.table('services').select('*').eq('barbershop_id', shop_response.data['id'])
        
        if active_only:
            query = query.eq('is_active', True)
        
        if category:
            query = query.eq('category', category)
        
        response = query.order('display_order', desc=False).execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/services")
async def create_service(
    service: ServiceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Create a new service"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Create service
        insert_data = service.dict()
        insert_data['barbershop_id'] = shop_response.data['id']
        
        response = supabase.table('services').insert(insert_data).execute()
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/services/{service_id}")
async def update_service(
    service_id: str,
    service: ServiceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Update a service"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update service
        update_data = service.dict(exclude_unset=True)
        response = supabase.table('services').update(update_data).eq('id', service_id).eq('barbershop_id', shop_response.data['id']).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Service not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Delete a service (soft delete)"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Soft delete service
        response = supabase.table('services').update({'is_active': False}).eq('id', service_id).eq('barbershop_id', shop_response.data['id']).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Service not found")
        
        return {"message": "Service deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINTS - INVENTORY
# ==========================================

@router.post("/inventory/movement")
async def record_inventory_movement(
    movement: InventoryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Record an inventory movement (purchase, sale, adjustment, etc.)"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Record inventory movement
        insert_data = {
            'barbershop_id': shop_response.data['id'],
            'product_id': movement.product_id,
            'movement_type': movement.movement_type,
            'quantity': movement.quantity_change,
            'cost_per_unit': movement.cost_per_unit,
            'total_cost': (movement.cost_per_unit * movement.quantity_change) if movement.cost_per_unit else None,
            'notes': movement.notes,
            'recorded_by': current_user['id']
        }
        
        response = supabase.table('inventory_movements').insert(insert_data).execute()
        
        # Update product stock
        if movement.movement_type in ['purchase', 'adjustment']:
            # Increase stock
            product_response = supabase.table('products').select('current_stock').eq('id', movement.product_id).single().execute()
            new_stock = product_response.data['current_stock'] + movement.quantity_change
        elif movement.movement_type in ['sale', 'waste']:
            # Decrease stock
            product_response = supabase.table('products').select('current_stock').eq('id', movement.product_id).single().execute()
            new_stock = max(0, product_response.data['current_stock'] - abs(movement.quantity_change))
        else:
            new_stock = None
        
        if new_stock is not None:
            supabase.table('products').update({'current_stock': new_stock}).eq('id', movement.product_id).execute()
        
        return {"message": "Inventory movement recorded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/alerts")
async def get_inventory_alerts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory alerts for low stock products"""
    try:
        # Get shop
        shop_response = supabase.table('barbershops').select('id').eq('owner_id', current_user['id']).single().execute()
        
        if not shop_response.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Get low stock products
        response = supabase.table('products').select('*').eq('barbershop_id', shop_response.data['id']).lte('current_stock', supabase.table('products').select('min_stock_level')).execute()
        
        alerts = []
        for product in response.data:
            if product['current_stock'] <= product['min_stock_level']:
                alerts.append({
                    'product_id': product['id'],
                    'product_name': product['name'],
                    'current_stock': product['current_stock'],
                    'min_stock_level': product['min_stock_level'],
                    'reorder_quantity': product.get('reorder_quantity', 0),
                    'alert_level': 'critical' if product['current_stock'] == 0 else 'warning'
                })
        
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export router
__all__ = ['router']