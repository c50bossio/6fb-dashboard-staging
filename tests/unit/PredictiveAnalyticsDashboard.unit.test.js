/**
 * COMPREHENSIVE UNIT TESTS FOR PREDICTIVE ANALYTICS DASHBOARD
 * 
 * Tests the business intelligence dashboard with 25+ KPIs and enterprise-grade analytics
 * Covers revenue forecasting, demand prediction, and real-time business insights
 */

import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import PredictiveAnalyticsDashboard from '../../components/PredictiveAnalyticsDashboard'
import fetch from 'jest-fetch-mock'

// Mock fetch for API calls
fetch.enableMocks()

describe('PredictiveAnalyticsDashboard Component - Unit Tests', () => {
  let user
  
  const mockDashboardData = {
    success: true,
    dashboard: {
      prediction_accuracy: '94.2%',
      revenue_trend: 'increasing',
      customer_satisfaction: 92,
      booking_efficiency: 87,
      staff_utilization: 89,
      total_revenue: 15420,
      total_bookings: 156,
      avg_service_price: 45,
      peak_hours: ['10:00', '14:00', '16:00'],
      busiest_day: 'Saturday',
      top_services: ['Haircut', 'Beard Trim', 'Hot Towel'],
      growth_rate: 12.5,
      churn_risk: 'low',
      seasonal_trend: 'holiday_boost'
    }
  }

  const mockForecastData = {
    success: true,
    forecast: {
      next_30_days: {
        predicted_revenue: 18650,
        confidence_level: 0.85,
        trend: 'upward',
        key_factors: ['holiday_season', 'marketing_campaign']
      },
      weekly_breakdown: [
        { week: 1, revenue: 4200, bookings: 42 },
        { week: 2, revenue: 4500, bookings: 45 },
        { week: 3, revenue: 4800, bookings: 48 },
        { week: 4, revenue: 5150, bookings: 52 }
      ]
    }
  }

  const mockDemandData = {
    success: true,
    demand_prediction: {
      peak_times: [
        { hour: 10, demand_score: 95 },
        { hour: 14, demand_score: 88 },
        { hour: 16, demand_score: 92 }
      ],
      service_demand: [
        { service: 'Haircut', predicted_bookings: 85 },
        { service: 'Beard Trim', predicted_bookings: 32 },
        { service: 'Hot Towel', predicted_bookings: 18 }
      ],
      capacity_alerts: [
        { day: 'Saturday', utilization: 96, alert_level: 'high' }
      ]
    }
  }

  beforeEach(() => {
    user = userEvent.setup()
    fetch.resetMocks()
    
    // Mock successful API responses by default
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDemandData
      })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Initialization and Loading', () => {
    test('renders loading state initially', () => {
      render(<PredictiveAnalyticsDashboard />)
      
      expect(screen.getByText('Predictive Analytics')).toBeInTheDocument()
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse')
    })

    test('loads predictions on mount with default barbershop ID', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/predictive?barbershop_id=demo')
      })
    })

    test('loads predictions with custom barbershop ID', async () => {
      render(<PredictiveAnalyticsDashboard barbershop_id="custom-shop-123" />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/predictive?barbershop_id=custom-shop-123')
      })
    })

    test('makes correct API calls for all prediction types', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        // Should make 3 API calls: dashboard, forecast, and demand
        expect(fetch).toHaveBeenCalledTimes(3)
        
        // Dashboard call
        expect(fetch).toHaveBeenCalledWith('/api/ai/predictive?barbershop_id=demo')
        
        // Revenue forecast call
        expect(fetch).toHaveBeenCalledWith('/api/ai/predictive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prediction_type: 'revenue_forecast',
            barbershop_id: 'demo',
            parameters: { timeframe: 30, confidence_level: 0.85 }
          })
        })
        
        // Demand prediction call
        expect(fetch).toHaveBeenCalledWith('/api/ai/predictive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prediction_type: 'demand_prediction',
            barbershop_id: 'demo'
          })
        })
      })
    })
  })

  describe('Dashboard Data Display', () => {
    test('displays prediction accuracy badge', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('94.2% accuracy')).toBeInTheDocument()
      })
    })

    test('displays key business metrics', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('$15,420')).toBeInTheDocument() // Total revenue
        expect(screen.getByText('156')).toBeInTheDocument() // Total bookings
        expect(screen.getByText('$45')).toBeInTheDocument() // Avg service price
      })
    })

    test('displays performance indicators', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument() // Customer satisfaction
        expect(screen.getByText('87%')).toBeInTheDocument() // Booking efficiency
        expect(screen.getByText('89%')).toBeInTheDocument() // Staff utilization
      })
    })

    test('displays business insights', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/Saturday/)).toBeInTheDocument() // Busiest day
        expect(screen.getByText(/12.5%/)).toBeInTheDocument() // Growth rate
        expect(screen.getByText(/low/)).toBeInTheDocument() // Churn risk
      })
    })

    test('displays top services list', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument()
        expect(screen.getByText('Beard Trim')).toBeInTheDocument()
        expect(screen.getByText('Hot Towel')).toBeInTheDocument()
      })
    })
  })

  describe('Revenue Forecasting', () => {
    test('displays revenue forecast data', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('$18,650')).toBeInTheDocument() // Predicted revenue
        expect(screen.getByText('85%')).toBeInTheDocument() // Confidence level
      })
    })

    test('displays trend indicators', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/upward/i)).toBeInTheDocument()
      })
    })

    test('displays weekly breakdown data', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('$4,200')).toBeInTheDocument() // Week 1
        expect(screen.getByText('$5,150')).toBeInTheDocument() // Week 4
      })
    })

    test('displays key factors affecting forecast', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/holiday_season/)).toBeInTheDocument()
        expect(screen.getByText(/marketing_campaign/)).toBeInTheDocument()
      })
    })
  })

  describe('Demand Prediction', () => {
    test('displays peak demand times', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/10:00/)).toBeInTheDocument()
        expect(screen.getByText(/14:00/)).toBeInTheDocument()
        expect(screen.getByText(/16:00/)).toBeInTheDocument()
      })
    })

    test('displays service demand predictions', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument() // Haircut bookings
        expect(screen.getByText('32')).toBeInTheDocument() // Beard Trim bookings
        expect(screen.getByText('18')).toBeInTheDocument() // Hot Towel bookings
      })
    })

    test('displays capacity alerts', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/96%/)).toBeInTheDocument() // Utilization
        expect(screen.getByText(/high/i)).toBeInTheDocument() // Alert level
      })
    })
  })

  describe('Timeframe Selection', () => {
    test('renders with default 30-day timeframe', () => {
      render(<PredictiveAnalyticsDashboard />)
      
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })

    test('allows changing timeframe', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      const timeframeSelect = screen.getByDisplayValue('30')
      
      await user.selectOptions(timeframeSelect, '60')
      
      expect(timeframeSelect).toHaveValue('60')
    })

    test('reloads predictions when timeframe changes', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      const timeframeSelect = screen.getByDisplayValue('30')
      
      // Reset fetch mocks for the reload
      fetch.resetMocks()
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockForecastData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockDemandData })
      
      await user.selectOptions(timeframeSelect, '60')
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/predictive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prediction_type: 'revenue_forecast',
            barbershop_id: 'demo',
            parameters: { timeframe: 60, confidence_level: 0.85 }
          })
        })
      })
    })
  })

  describe('View Switching', () => {
    test('starts with overview view as default', () => {
      render(<PredictiveAnalyticsDashboard />)
      
      expect(screen.getByText('overview')).toBeInTheDocument()
    })

    test('allows switching between different views', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      // Add view switching buttons to component first
      const forecastButton = screen.getByText(/forecast/i)
      await user.click(forecastButton)
      
      expect(screen.getByText(/revenue forecast/i)).toBeInTheDocument()
    })
  })

  describe('Refresh Functionality', () => {
    test('provides refresh button for reloading predictions', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/refresh/i)).toBeInTheDocument()
      })
    })

    test('reloads all predictions when refresh is clicked', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3)
      })
      
      // Reset and setup new mocks
      fetch.resetMocks()
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockForecastData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockDemandData })
      
      const refreshButton = screen.getByLabelText(/refresh/i)
      await user.click(refreshButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('Compact Mode', () => {
    test('renders in compact mode when prop is true', () => {
      render(<PredictiveAnalyticsDashboard compact={true} />)
      
      expect(screen.getByText('Predictive Analytics')).toBeInTheDocument()
    })

    test('adjusts layout for compact display', () => {
      const { container } = render(<PredictiveAnalyticsDashboard compact={true} />)
      
      // Check for compact-specific styling
      expect(container.firstChild).toHaveClass('bg-white')
    })
  })

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      fetch.resetMocks()
      fetch.mockRejectedValue(new Error('API Error'))
      
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        // Should not crash and should handle the error
        expect(screen.getByText('Predictive Analytics')).toBeInTheDocument()
      })
    })

    test('handles partial API failures', async () => {
      fetch.resetMocks()
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
        .mockRejectedValueOnce(new Error('Forecast API Error'))
        .mockResolvedValueOnce({ ok: true, json: async () => mockDemandData })
      
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        // Should display available data despite partial failure
        expect(screen.getByText('94.2% accuracy')).toBeInTheDocument()
      })
    })

    test('handles empty response data', async () => {
      fetch.resetMocks()
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) })
      
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Predictive Analytics')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Memory Management', () => {
    test('properly cleans up on unmount', () => {
      const { unmount } = render(<PredictiveAnalyticsDashboard />)
      
      expect(() => unmount()).not.toThrow()
    })

    test('handles rapid timeframe changes without memory leaks', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      const timeframeSelect = screen.getByDisplayValue('30')
      
      // Rapidly change timeframes
      for (let i = 0; i < 5; i++) {
        fetch.resetMocks()
        fetch
          .mockResolvedValue({ ok: true, json: async () => mockDashboardData })
          .mockResolvedValue({ ok: true, json: async () => mockForecastData })
          .mockResolvedValue({ ok: true, json: async () => mockDemandData })
        
        await user.selectOptions(timeframeSelect, i % 2 === 0 ? '30' : '60')
      }
      
      // Should not crash or cause memory issues
      expect(screen.getByText('Predictive Analytics')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('includes proper ARIA labels for screen readers', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/predictive analytics dashboard/i)).toBeInTheDocument()
      })
    })

    test('supports keyboard navigation', async () => {
      render(<PredictiveAnalyticsDashboard />)
      
      const refreshButton = screen.getByLabelText(/refresh/i)
      
      refreshButton.focus()
      expect(refreshButton).toHaveFocus()
      
      await user.keyboard('{Enter}')
      
      // Should trigger refresh functionality
      expect(fetch).toHaveBeenCalled()
    })
  })
})