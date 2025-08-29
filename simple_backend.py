#!/usr/bin/env python3
"""
Simple FastAPI backend for 6FB AI Agent System - minimal dependencies
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import hashlib
import secrets
import sqlite3
import os
import json
import time
from datetime import datetime, timedelta
from contextlib import contextmanager

app = FastAPI(title="6FB AI Agent System API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9999", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_PATH = "data/agent_system.db"

@contextmanager
def get_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                shop_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # POS Products table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                current_stock INTEGER NOT NULL DEFAULT 0,
                sku TEXT,
                barcode TEXT,
                category TEXT,
                image_url TEXT,
                thumbnail_url TEXT,
                tax_rate REAL DEFAULT 0.0,
                commission_rate REAL DEFAULT 0.0,
                barbershop_id TEXT NOT NULL DEFAULT '1',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # POS Sales table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pos_sales (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                barbershop_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                barber_id TEXT,
                customer_id TEXT,
                payment_method TEXT NOT NULL,
                receipt_number TEXT NOT NULL,
                customer_contact TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        """)
        
        # Payment Links table (simplified SQLite version)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pos_payment_links (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                barbershop_id TEXT NOT NULL,
                barber_id TEXT,
                cart_data TEXT NOT NULL,
                payment_link_url TEXT NOT NULL,
                customer_contact TEXT NOT NULL,
                contact_method TEXT DEFAULT 'sms',
                status TEXT DEFAULT 'pending',
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'usd',
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP
            )
        """)
        
        # QR Payment Sessions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS qr_payment_sessions (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                session_id TEXT UNIQUE NOT NULL,
                barbershop_id TEXT NOT NULL,
                barber_id TEXT,
                customer_id TEXT,
                cart_items TEXT NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                stripe_session_url TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Terminal Payment Intents table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS terminal_payment_intents (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                stripe_payment_intent_id TEXT UNIQUE NOT NULL,
                barbershop_id TEXT NOT NULL,
                barber_id TEXT,
                customer_id TEXT,
                amount_cents INTEGER NOT NULL,
                currency TEXT DEFAULT 'usd',
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()

# Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# POS Models
class Product(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    current_stock: int
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tax_rate: Optional[float] = 0.0
    commission_rate: Optional[float] = 0.0

class CartItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    quantity: int
    sku: Optional[str] = None
    tax_rate: Optional[float] = 0.0
    image_url: Optional[str] = None

class POSSale(BaseModel):
    barbershop_id: str
    product_id: str
    quantity: int
    unit_price: float
    barber_id: Optional[str] = None
    customer_id: Optional[str] = None
    payment_method: str
    receipt_number: str
    customer_contact: Optional[str] = None

class PaymentLinkRequest(BaseModel):
    barbershopId: str
    barberId: Optional[str] = None
    cartItems: List[CartItem]
    customerContact: str
    contactMethod: str  # 'sms' or 'email'
    expiresInHours: int = 24

class QRPaymentRequest(BaseModel):
    barbershopId: str
    barberId: Optional[str] = None
    customerId: Optional[str] = None
    cartItems: List[CartItem]
    totalAmount: float

class TerminalPaymentRequest(BaseModel):
    barbershopId: str
    barberId: Optional[str] = None
    customerId: Optional[str] = None
    cartItems: List[CartItem]
    totalAmount: float
    readerId: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    salt = "6fb-salt"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
            (token, user_id)
        )
        conn.commit()
    return token

# Initialize DB and create demo user
def create_demo_data():
    with get_db() as conn:
        # Create demo user
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", ("demo@barbershop.com",))
        if not cursor.fetchone():
            password_hash = hash_password("demo123")
            conn.execute(
                "INSERT INTO users (email, password_hash, shop_name, is_active) VALUES (?, ?, ?, ?)",
                ("demo@barbershop.com", password_hash, "Demo Barbershop", 1)
            )
            print("✅ Demo user created")
        
        # Create demo products
        demo_products = [
            ('prod_1', 'Premium Hair Pomade', 'High-quality styling pomade for professional looks', 25.00, 50, 'POMADE001', None, 'Hair Products', None, None, 8.25, 15.0),
            ('prod_2', 'Beard Oil', 'Nourishing beard oil with natural ingredients', 18.00, 30, 'BEARD001', None, 'Beard Care', None, None, 8.25, 12.0),
            ('prod_3', 'Hair Clipper Set', 'Professional-grade hair clippers', 120.00, 5, 'CLIPPER001', None, 'Tools', None, None, 8.25, 20.0),
            ('prod_4', 'Straight Razor', 'Traditional straight razor for precise shaving', 85.00, 8, 'RAZOR001', None, 'Shaving', None, None, 8.25, 25.0),
            ('prod_5', 'Hair Styling Wax', 'Strong hold styling wax', 22.00, 25, 'WAX001', None, 'Hair Products', None, None, 8.25, 15.0),
            ('prod_6', 'Aftershave Balm', 'Soothing aftershave balm', 16.00, 40, 'BALM001', None, 'Aftercare', None, None, 8.25, 10.0)
        ]
        
        for product in demo_products:
            cursor = conn.execute("SELECT id FROM products WHERE id = ?", (product[0],))
            if not cursor.fetchone():
                conn.execute("""
                    INSERT INTO products 
                    (id, name, description, price, current_stock, sku, barcode, category, 
                     image_url, thumbnail_url, tax_rate, commission_rate, barbershop_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1')
                """, product)
        
        conn.commit()
        print("✅ Demo products created")

@app.on_event("startup")
async def startup_event():
    init_db()
    create_demo_data()
    print("✅ Database initialized")

@app.get("/")
async def root():
    return {"message": "6FB AI Agent System Backend", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id, email, password_hash, shop_name FROM users WHERE email = ?",
            (user.email,)
        )
        db_user = cursor.fetchone()
    
    if not db_user or hash_password(user.password) != db_user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_token(db_user["id"])
    
    return {
        "access_token": token,
        "user": {
            "id": db_user["id"],
            "email": db_user["email"],
            "shop_name": db_user["shop_name"]
        }
    }

@app.get("/api/v1/auth/me")
async def get_current_user():
    # For now, return a simple user object
    # In production, this would validate the token from the Authorization header
    return {
        "id": 1,
        "email": "demo@barbershop.com",
        "shop_name": "Demo Barbershop"
    }

# ==========================================
# POS API ENDPOINTS
# ==========================================

@app.get("/api/pos/products")
async def get_products(barbershop_id: str = "1", in_stock_only: bool = True, category: Optional[str] = None):
    """
    Get products for POS system
    """
    with get_db() as conn:
        query = "SELECT * FROM products WHERE barbershop_id = ?"
        params = [barbershop_id]
        
        if in_stock_only:
            query += " AND current_stock > 0"
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        query += " ORDER BY name ASC"
        
        cursor = conn.execute(query, params)
        products = [dict(row) for row in cursor.fetchall()]
    
    return products

@app.post("/api/pos/sales")
async def create_sale(sale: POSSale):
    """
    Create a POS sale record
    """
    with get_db() as conn:
        # Check product stock
        cursor = conn.execute(
            "SELECT current_stock FROM products WHERE id = ?",
            (sale.product_id,)
        )
        product = cursor.fetchone()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        if product["current_stock"] < sale.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient stock"
            )
        
        # Calculate total price
        total_price = sale.unit_price * sale.quantity
        
        # Create sale record
        sale_id = f"sale_{int(time.time())}_{secrets.token_hex(4)}"
        conn.execute("""
            INSERT INTO pos_sales 
            (id, barbershop_id, product_id, quantity, unit_price, total_price, 
             barber_id, customer_id, payment_method, receipt_number, customer_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sale_id, sale.barbershop_id, sale.product_id, sale.quantity,
            sale.unit_price, total_price, sale.barber_id, sale.customer_id,
            sale.payment_method, sale.receipt_number, sale.customer_contact
        ))
        
        # Update product stock
        conn.execute(
            "UPDATE products SET current_stock = current_stock - ? WHERE id = ?",
            (sale.quantity, sale.product_id)
        )
        
        conn.commit()
    
    return {"success": True, "sale_id": sale_id, "total_price": total_price}

@app.post("/api/pos/payment-link")
async def create_payment_link(request: PaymentLinkRequest):
    """
    Create a payment link for the cart
    """
    try:
        # Calculate total amount
        total_amount = sum(item.price * item.quantity for item in request.cartItems)
        tax_amount = sum((item.price * item.quantity * (item.tax_rate or 0)) / 100 for item in request.cartItems)
        final_amount = total_amount + tax_amount
        
        # Generate payment link (mock implementation)
        payment_link_id = f"plink_{int(time.time())}_{secrets.token_hex(6)}"
        payment_link_url = f"https://checkout.stripe.com/pay/{payment_link_id}#fidkdWxOYHwnPyd1blpxYHZxWjA0S25QbWR8S01DUEtcVm1rVDVCNkBDTWdxZnNjUTB8TGNiMWRMNTRgZ0Zvc3dLUXB%2FN29qSUNMZH2BdDJy"
        
        expires_at = datetime.now() + timedelta(hours=request.expiresInHours)
        
        # Store payment link in database
        with get_db() as conn:
            conn.execute("""
                INSERT INTO pos_payment_links 
                (id, barbershop_id, barber_id, cart_data, payment_link_url, 
                 customer_contact, contact_method, amount, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payment_link_id,
                request.barbershopId,
                request.barberId,
                json.dumps([item.dict() for item in request.cartItems]),
                payment_link_url,
                request.customerContact,
                request.contactMethod,
                final_amount,
                expires_at.isoformat()
            ))
            conn.commit()
        
        # Mock SMS/Email sending success
        delivery_success = True
        delivery_message = f"Payment link sent via {request.contactMethod.upper()} to {request.customerContact}"
        
        return {
            "success": True,
            "paymentLink": {
                "id": payment_link_id,
                "url": payment_link_url,
                "amount": final_amount,
                "expires_at": expires_at.isoformat(),
                "send_result": {
                    "success": delivery_success,
                    "message": delivery_message
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment link: {str(e)}"
        )

@app.post("/api/pos/qr-payment")
async def create_qr_payment(request: QRPaymentRequest):
    """
    Create a QR code payment session
    """
    try:
        # Generate session ID and URL
        session_id = f"qr_session_{int(time.time())}_{secrets.token_hex(8)}"
        checkout_url = f"https://checkout.stripe.com/c/pay/cs_{session_id}#fidkdWxOYHwnPyd1blpxYHZxWjA0S25QbWR8S01DUEtcVm1rVDVCNkBDTWdxZnNjUTB8TGNiMWRMNTRgZ0Zvc3dLUXB%2FN29qSUNMZHw"
        
        expires_at = datetime.now() + timedelta(minutes=30)
        
        # Store QR session in database
        with get_db() as conn:
            conn.execute("""
                INSERT INTO qr_payment_sessions 
                (id, session_id, barbershop_id, barber_id, customer_id, 
                 cart_items, total_amount, stripe_session_url, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"qr_{int(time.time())}_{secrets.token_hex(4)}",
                session_id,
                request.barbershopId,
                request.barberId,
                request.customerId,
                json.dumps([item.dict() for item in request.cartItems]),
                request.totalAmount,
                checkout_url,
                expires_at.isoformat()
            ))
            conn.commit()
        
        return {
            "success": True,
            "qrSession": {
                "sessionId": session_id,
                "checkoutUrl": checkout_url,
                "qrCodeData": checkout_url,  # In real implementation, this would be a QR-optimized URL
                "amount": request.totalAmount,
                "expiresAt": expires_at.isoformat()
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create QR payment: {str(e)}"
        )

@app.post("/api/stripe/terminal/payment-intent")
async def create_terminal_payment_intent(request: TerminalPaymentRequest):
    """
    Create a terminal payment intent
    """
    try:
        # Generate payment intent ID
        payment_intent_id = f"pi_terminal_{int(time.time())}_{secrets.token_hex(8)}"
        amount_cents = int(request.totalAmount * 100)  # Convert to cents
        
        # Store terminal payment intent in database
        with get_db() as conn:
            conn.execute("""
                INSERT INTO terminal_payment_intents 
                (stripe_payment_intent_id, barbershop_id, barber_id, customer_id, 
                 amount_cents, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                payment_intent_id,
                request.barbershopId,
                request.barberId,
                request.customerId,
                amount_cents,
                "requires_payment_method"
            ))
            conn.commit()
        
        return {
            "success": True,
            "paymentIntent": {
                "id": payment_intent_id,
                "amount": amount_cents,
                "currency": "usd",
                "status": "requires_payment_method",
                "client_secret": f"{payment_intent_id}_secret_{secrets.token_hex(16)}"
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create terminal payment intent: {str(e)}"
        )

@app.post("/api/stripe/terminal/collect-payment")
async def collect_terminal_payment(payment_intent_id: str = None, reader_id: str = None):
    """
    Simulate collecting payment on terminal
    """
    try:
        # Mock successful payment collection
        return {
            "success": True,
            "paymentIntent": {
                "id": payment_intent_id,
                "status": "succeeded",
                "charges": {
                    "data": [{
                        "id": f"ch_{secrets.token_hex(12)}",
                        "amount": 2500,  # Mock amount
                        "currency": "usd",
                        "status": "succeeded",
                        "payment_method_details": {
                            "card_present": {
                                "brand": "visa",
                                "last4": "4242",
                                "exp_month": 12,
                                "exp_year": 2025
                            }
                        }
                    }]
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to collect terminal payment: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting 6FB AI Agent System FastAPI backend with POS integration on port 8001...")
    init_db()
    uvicorn.run(app, host="0.0.0.0", port=8001)