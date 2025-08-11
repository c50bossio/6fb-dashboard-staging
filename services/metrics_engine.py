"""
Metrics Calculation Engine
Handles all business metrics calculations including internal margins and commissions
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from dataclasses import dataclass, asdict
import asyncio

logger = logging.getLogger(__name__)

@dataclass
class PlatformFeeStructure:
    """Platform fee structure for internal payment processing"""
    standard_booking: float = 0.15      # 15% platform fee
    premium_booking: float = 0.20        # 20% for premium services  
    walk_in: float = 0.10               # 10% for walk-ins
    recurring: float = 0.12             # 12% for recurring appointments
    group_booking: float = 0.18         # 18% for group bookings
    
@dataclass
class CommissionStructure:
    """Commission structure for barbers and shops"""
    barber_employee: float = 0.60       # 60% to employed barber
    barber_independent: float = 0.70    # 70% to independent barber
    barber_contractor: float = 0.65     # 65% to contractor
    shop_owner_share: float = 0.25      # 25% to shop (from remaining after barber)
    
@dataclass
class PaymentSplit:
    """Calculated payment split for a transaction"""
    total_amount: float
    service_amount: float
    tip_amount: float
    platform_fee: float              # Our margin
    barber_commission: float         # Barber's earnings
    shop_earnings: float             # Shop's earnings
    barber_payout: float            # Barber total (commission + tips)
    platform_profit_margin: float   # Our profit percentage

class MetricsEngine:
    """
    Engine for calculating all business metrics including internal margins
    """
    
    def __init__(self):
        self.fee_structure = PlatformFeeStructure()
        self.commission_structure = CommissionStructure()
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        
    # ==========================================
    # PAYMENT CALCULATIONS
    # ==========================================
    
    def calculate_payment_split(
        self,
        service_amount: float,
        tip_amount: float = 0,
        booking_type: str = 'standard_booking',
        barber_type: str = 'barber_employee'
    ) -> PaymentSplit:
        """
        Calculate the complete payment split for internal processing
        
        Args:
            service_amount: Base service price
            tip_amount: Customer tip
            booking_type: Type of booking for fee calculation
            barber_type: Type of barber for commission calculation
            
        Returns:
            PaymentSplit with all calculated amounts
        """
        try:
            # Get platform fee rate
            fee_rate = getattr(self.fee_structure, booking_type, self.fee_structure.standard_booking)
            
            # Calculate platform fee (our margin)
            platform_fee = service_amount * fee_rate
            
            # Amount after platform fee
            amount_after_platform = service_amount - platform_fee
            
            # Get barber commission rate
            commission_rate = getattr(self.commission_structure, barber_type, self.commission_structure.barber_employee)
            
            # Calculate barber commission from service amount after platform fee
            barber_commission = amount_after_platform * commission_rate
            
            # Shop gets the remainder after barber commission
            shop_earnings = amount_after_platform - barber_commission
            
            # Barber gets commission plus all tips
            barber_payout = barber_commission + tip_amount
            
            # Total amount (service + tips)
            total_amount = service_amount + tip_amount
            
            # Calculate our profit margin percentage
            platform_profit_margin = (platform_fee / service_amount) * 100 if service_amount > 0 else 0
            
            return PaymentSplit(
                total_amount=round(total_amount, 2),
                service_amount=round(service_amount, 2),
                tip_amount=round(tip_amount, 2),
                platform_fee=round(platform_fee, 2),
                barber_commission=round(barber_commission, 2),
                shop_earnings=round(shop_earnings, 2),
                barber_payout=round(barber_payout, 2),
                platform_profit_margin=round(platform_profit_margin, 2)
            )
            
        except Exception as e:
            logger.error(f"Error calculating payment split: {e}")
            raise
    
    def calculate_bulk_payments(self, payments: List[Dict]) -> Dict:
        """
        Calculate metrics for multiple payments
        
        Args:
            payments: List of payment records
            
        Returns:
            Aggregated payment metrics
        """
        try:
            total_revenue = 0
            total_platform_fees = 0
            total_barber_payouts = 0
            total_shop_earnings = 0
            total_tips = 0
            
            for payment in payments:
                service_amount = float(payment.get('service_amount', 0))
                tip_amount = float(payment.get('tip_amount', 0))
                
                # Calculate split for each payment
                split = self.calculate_payment_split(
                    service_amount=service_amount,
                    tip_amount=tip_amount,
                    booking_type=payment.get('booking_type', 'standard_booking'),
                    barber_type=payment.get('barber_type', 'barber_employee')
                )
                
                total_revenue += split.total_amount
                total_platform_fees += split.platform_fee
                total_barber_payouts += split.barber_payout
                total_shop_earnings += split.shop_earnings
                total_tips += split.tip_amount
            
            # Calculate averages and percentages
            avg_platform_margin = (total_platform_fees / (total_revenue - total_tips) * 100) if total_revenue > total_tips else 0
            
            return {
                'total_revenue': round(total_revenue, 2),
                'total_platform_fees': round(total_platform_fees, 2),
                'total_barber_payouts': round(total_barber_payouts, 2),
                'total_shop_earnings': round(total_shop_earnings, 2),
                'total_tips': round(total_tips, 2),
                'average_platform_margin': round(avg_platform_margin, 2),
                'transaction_count': len(payments)
            }
            
        except Exception as e:
            logger.error(f"Error calculating bulk payments: {e}")
            return {}
    
    # ==========================================
    # REVENUE METRICS
    # ==========================================
    
    def calculate_revenue_growth(self, current_revenue: float, previous_revenue: float) -> float:
        """Calculate revenue growth percentage"""
        if previous_revenue == 0:
            return 100.0 if current_revenue > 0 else 0.0
        
        growth = ((current_revenue - previous_revenue) / previous_revenue) * 100
        return round(growth, 2)
    
    def calculate_revenue_forecast(self, historical_data: List[float], periods: int = 3) -> List[float]:
        """
        Simple revenue forecast based on historical data
        
        Args:
            historical_data: List of historical revenue values
            periods: Number of periods to forecast
            
        Returns:
            List of forecasted values
        """
        try:
            if len(historical_data) < 2:
                return [historical_data[-1] if historical_data else 0] * periods
            
            # Calculate simple moving average growth rate
            growth_rates = []
            for i in range(1, len(historical_data)):
                if historical_data[i-1] > 0:
                    growth = (historical_data[i] - historical_data[i-1]) / historical_data[i-1]
                    growth_rates.append(growth)
            
            avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0
            
            # Generate forecast
            forecast = []
            last_value = historical_data[-1]
            
            for _ in range(periods):
                next_value = last_value * (1 + avg_growth)
                forecast.append(round(next_value, 2))
                last_value = next_value
            
            return forecast
            
        except Exception as e:
            logger.error(f"Error calculating revenue forecast: {e}")
            return [0] * periods
    
    # ==========================================
    # UTILIZATION METRICS
    # ==========================================
    
    def calculate_utilization_rate(
        self,
        appointments: List[Dict],
        total_slots: int,
        period_days: int = 30
    ) -> float:
        """
        Calculate staff utilization rate
        
        Args:
            appointments: List of appointment records
            total_slots: Total available appointment slots
            period_days: Number of days in the period
            
        Returns:
            Utilization rate as percentage
        """
        try:
            if total_slots == 0:
                return 0.0
            
            # Count only completed appointments
            completed = len([a for a in appointments if a.get('status') == 'COMPLETED'])
            
            utilization = (completed / total_slots) * 100
            return round(utilization, 2)
            
        except Exception as e:
            logger.error(f"Error calculating utilization rate: {e}")
            return 0.0
    
    def calculate_peak_hours(self, appointments: List[Dict]) -> List[Tuple[int, int]]:
        """
        Identify peak booking hours
        
        Args:
            appointments: List of appointment records
            
        Returns:
            List of (hour, count) tuples sorted by count
        """
        try:
            hour_counts = {}
            
            for apt in appointments:
                scheduled_at = apt.get('scheduled_at')
                if scheduled_at:
                    # Parse the datetime and get the hour
                    if isinstance(scheduled_at, str):
                        dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                    else:
                        dt = scheduled_at
                    
                    hour = dt.hour
                    hour_counts[hour] = hour_counts.get(hour, 0) + 1
            
            # Sort by count (descending)
            sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
            
            return sorted_hours[:5]  # Top 5 peak hours
            
        except Exception as e:
            logger.error(f"Error calculating peak hours: {e}")
            return []
    
    # ==========================================
    # CUSTOMER METRICS
    # ==========================================
    
    def calculate_customer_lifetime_value(
        self,
        customer_payments: List[Dict],
        customer_tenure_months: int
    ) -> float:
        """
        Calculate customer lifetime value
        
        Args:
            customer_payments: List of payments by customer
            customer_tenure_months: How long customer has been active
            
        Returns:
            Estimated lifetime value
        """
        try:
            if not customer_payments:
                return 0.0
            
            total_spent = sum(float(p.get('total_amount', 0)) for p in customer_payments)
            
            # Calculate average monthly spend
            avg_monthly = total_spent / max(customer_tenure_months, 1)
            
            # Estimate lifetime (36 months average for loyal customers)
            estimated_lifetime_months = 36
            
            lifetime_value = avg_monthly * estimated_lifetime_months
            
            return round(lifetime_value, 2)
            
        except Exception as e:
            logger.error(f"Error calculating customer lifetime value: {e}")
            return 0.0
    
    def calculate_retention_rate(
        self,
        customers_start: int,
        customers_end: int,
        new_customers: int
    ) -> float:
        """
        Calculate customer retention rate
        
        Args:
            customers_start: Customers at start of period
            customers_end: Customers at end of period
            new_customers: New customers acquired during period
            
        Returns:
            Retention rate as percentage
        """
        try:
            if customers_start == 0:
                return 0.0
            
            retained = customers_end - new_customers
            retention_rate = (retained / customers_start) * 100
            
            return round(max(0, min(100, retention_rate)), 2)
            
        except Exception as e:
            logger.error(f"Error calculating retention rate: {e}")
            return 0.0
    
    # ==========================================
    # PERFORMANCE METRICS
    # ==========================================
    
    def calculate_barber_performance(
        self,
        barber_appointments: List[Dict],
        barber_payments: List[Dict]
    ) -> Dict:
        """
        Calculate performance metrics for a barber
        
        Args:
            barber_appointments: Appointments handled by barber
            barber_payments: Payments for barber's services
            
        Returns:
            Performance metrics dictionary
        """
        try:
            total_appointments = len(barber_appointments)
            completed = len([a for a in barber_appointments if a.get('status') == 'COMPLETED'])
            
            # Calculate revenue generated
            total_revenue = sum(float(p.get('total_amount', 0)) for p in barber_payments)
            
            # Calculate average service value
            avg_service_value = total_revenue / completed if completed > 0 else 0
            
            # Calculate completion rate
            completion_rate = (completed / total_appointments * 100) if total_appointments > 0 else 0
            
            # Calculate ratings (would come from reviews in real system)
            avg_rating = 4.5  # Placeholder - would calculate from actual reviews
            
            return {
                'total_appointments': total_appointments,
                'completed_appointments': completed,
                'completion_rate': round(completion_rate, 2),
                'total_revenue_generated': round(total_revenue, 2),
                'average_service_value': round(avg_service_value, 2),
                'average_rating': avg_rating,
                'performance_score': round((completion_rate * 0.4 + avg_rating * 20 * 0.6), 2)
            }
            
        except Exception as e:
            logger.error(f"Error calculating barber performance: {e}")
            return {}
    
    # ==========================================
    # PROFITABILITY METRICS
    # ==========================================
    
    def calculate_service_profitability(
        self,
        service_name: str,
        revenue: float,
        bookings: int,
        duration_minutes: int
    ) -> Dict:
        """
        Calculate profitability metrics for a service
        
        Args:
            service_name: Name of the service
            revenue: Total revenue from service
            bookings: Number of bookings
            duration_minutes: Service duration
            
        Returns:
            Profitability metrics
        """
        try:
            # Calculate average price
            avg_price = revenue / bookings if bookings > 0 else 0
            
            # Calculate platform earnings (using standard rate)
            platform_earnings = revenue * self.fee_structure.standard_booking
            
            # Calculate revenue per minute (efficiency metric)
            revenue_per_minute = revenue / (bookings * duration_minutes) if bookings > 0 else 0
            
            # Calculate profitability score (combination of margin and efficiency)
            profitability_score = (platform_earnings / revenue * 100) if revenue > 0 else 0
            
            return {
                'service_name': service_name,
                'total_revenue': round(revenue, 2),
                'total_bookings': bookings,
                'average_price': round(avg_price, 2),
                'platform_earnings': round(platform_earnings, 2),
                'revenue_per_minute': round(revenue_per_minute, 2),
                'profitability_score': round(profitability_score, 2)
            }
            
        except Exception as e:
            logger.error(f"Error calculating service profitability: {e}")
            return {}
    
    def calculate_overall_profitability(self, revenue_data: Dict) -> Dict:
        """
        Calculate overall business profitability metrics
        
        Args:
            revenue_data: Dictionary with revenue information
            
        Returns:
            Overall profitability metrics
        """
        try:
            monthly_revenue = revenue_data.get('monthly_revenue', 0)
            monthly_platform_fee = revenue_data.get('monthly_platform_fee', 0)
            
            # Calculate gross margin
            gross_margin = (monthly_platform_fee / monthly_revenue * 100) if monthly_revenue > 0 else 0
            
            # Estimate operating costs (simplified - would be more complex in reality)
            estimated_operating_costs = monthly_platform_fee * 0.3  # 30% of platform fees
            
            # Calculate net margin
            net_profit = monthly_platform_fee - estimated_operating_costs
            net_margin = (net_profit / monthly_revenue * 100) if monthly_revenue > 0 else 0
            
            return {
                'monthly_revenue': round(monthly_revenue, 2),
                'monthly_platform_fee': round(monthly_platform_fee, 2),
                'gross_margin_percentage': round(gross_margin, 2),
                'estimated_operating_costs': round(estimated_operating_costs, 2),
                'net_profit': round(net_profit, 2),
                'net_margin_percentage': round(net_margin, 2)
            }
            
        except Exception as e:
            logger.error(f"Error calculating overall profitability: {e}")
            return {}
    
    # ==========================================
    # TREND ANALYSIS
    # ==========================================
    
    def analyze_trends(self, time_series_data: List[Dict]) -> Dict:
        """
        Analyze trends in time series data
        
        Args:
            time_series_data: List of data points with timestamps
            
        Returns:
            Trend analysis results
        """
        try:
            if len(time_series_data) < 2:
                return {'trend': 'insufficient_data'}
            
            # Sort by timestamp
            sorted_data = sorted(time_series_data, key=lambda x: x.get('timestamp', ''))
            
            # Calculate trend direction
            first_half = sorted_data[:len(sorted_data)//2]
            second_half = sorted_data[len(sorted_data)//2:]
            
            first_half_avg = sum(d.get('value', 0) for d in first_half) / len(first_half)
            second_half_avg = sum(d.get('value', 0) for d in second_half) / len(second_half)
            
            if second_half_avg > first_half_avg * 1.05:
                trend = 'increasing'
            elif second_half_avg < first_half_avg * 0.95:
                trend = 'decreasing'
            else:
                trend = 'stable'
            
            # Calculate volatility (standard deviation)
            values = [d.get('value', 0) for d in sorted_data]
            mean = sum(values) / len(values)
            variance = sum((x - mean) ** 2 for x in values) / len(values)
            std_dev = variance ** 0.5
            volatility = (std_dev / mean * 100) if mean > 0 else 0
            
            return {
                'trend': trend,
                'trend_strength': abs(second_half_avg - first_half_avg) / first_half_avg if first_half_avg > 0 else 0,
                'volatility': round(volatility, 2),
                'data_points': len(sorted_data)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trends: {e}")
            return {'trend': 'error'}

# Create singleton instance
metrics_engine = MetricsEngine()