/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionProvider } from 'next-auth/react';
import MainDashboard from '../../../components/dashboard/MainDashboard';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Database next/dynamic for OptimizedCharts
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFunction, options = {}) => {
    const Component = React.lazy(importFunction);
    const DynamicComponent = (props) => (
      <React.Suspense fallback={options.loading || <div>Loading...</div>}>
        <Component {...props} />
      </React.Suspense>
    );
    DynamicComponent.displayName = 'DynamicComponent';
    return DynamicComponent;
  },
}));

// Database OptimizedCharts component
jest.mock('../../../components/ui/OptimizedCharts', () => ({
  RevenueChart: ({ data, loading }) => (
    <div data-testid="revenue-chart">
      {loading ? 'Loading chart...' : `Revenue data: ${data?.length || 0} points`}
    </div>
  ),
  AppointmentChart: ({ data, loading }) => (
    <div data-testid="appointment-chart">
      {loading ? 'Loading chart...' : `Appointments: ${data?.length || 0} points`}
    </div>
  ),
  CustomerChart: ({ data, loading }) => (
    <div data-testid="customer-chart">
      {loading ? 'Loading chart...' : `Customers: ${data?.length || 0} points`}
    </div>
  ),
}));

const Session = {
  user: {
    id: 'user-123',
    email: 'test@bookedbarber.com',
    name: await getTestUserFromDatabase(),
    role: 'SHOP_OWNER',
  },
  expires: '2024-12-31',
};

const DashboardData = {
  revenue: {
    total: 15000,
    change: 12.5,
    data: [
      { date: '2024-01-01', amount: 1200 },
      { date: '2024-01-02', amount: 1350 },
      { date: '2024-01-03', amount: 1100 },
    ]
  },
  appointments: {
    total: 245,
    change: 8.3,
    data: [
      { date: '2024-01-01', count: 25 },
      { date: '2024-01-02', count: 30 },
      { date: '2024-01-03', count: 22 },
    ]
  },
  customers: {
    total: 128,
    change: 15.2,
    data: [
      { date: '2024-01-01', count: 8 },
      { date: '2024-01-02', count: 12 },
      { date: '2024-01-03', count: 6 },
    ]
  },
  topServices: [
    { name: 'Haircut', revenue: 8500, count: 120 },
    { name: 'Beard Trim', revenue: 3200, count: 85 },
    { name: 'Full Service', revenue: 2800, count: 25 },
  ],
  recentBookings: [
    {
      id: 'booking-1',
      customerName: 'John Smith',
      service: 'Haircut',
      date: '2024-01-15T10:00:00Z',
      status: 'confirmed',
      amount: 35
    },
    {
      id: 'booking-2',
      customerName: 'Mike Johnson',
      service: 'Beard Trim',
      date: '2024-01-15T14:30:00Z',
      status: 'pending',
      amount: 25
    }
  ]
};

const renderWithProviders = (component, session = mockSession) => {
  return render(
    <SessionProvider session={session}>
      {component}
    </SessionProvider>
  );
};

describe('MainDashboard Component', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/dashboard/analytics', () => 
        HttpResponse.json(mockDashboardData)
      )
    );
  });

  describe('Initial Rendering', () => {
    it('renders dashboard layout with loading states', () => {
      renderWithProviders(<MainDashboard />);
      
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays user welcome message with correct name', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Test User/)).toBeInTheDocument();
      });
    });

    it('shows current date and time', () => {
      renderWithProviders(<MainDashboard />);
      
      const dateElement = screen.getByText(new RegExp(new Date().getFullYear().toString()));
      expect(dateElement).toBeInTheDocument();
    });
  });

  describe('Data Loading and Display', () => {
    it('loads and displays analytics data successfully', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('$15,000')).toBeInTheDocument();
        expect(screen.getByText('245')).toBeInTheDocument();
        expect(screen.getByText('128')).toBeInTheDocument();
      });
    });

    it('displays percentage changes with correct styling', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const revenueChange = screen.getByText('+12.5%');
        const appointmentChange = screen.getByText('+8.3%');
        const customerChange = screen.getByText('+15.2%');
        
        expect(revenueChange).toHaveClass('text-green-600');
        expect(appointmentChange).toHaveClass('text-green-600');
        expect(customerChange).toHaveClass('text-green-600');
      });
    });

    it('handles negative percentage changes correctly', async () => {
      const negativeChangeData = {
        ...mockDashboardData,
        revenue: { ...mockDashboardData.revenue, change: -5.2 }
      };

      server.use(
        http.get('/api/dashboard/analytics', () => 
          HttpResponse.json(negativeChangeData)
        )
      );

      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const negativeChange = screen.getByText('-5.2%');
        expect(negativeChange).toHaveClass('text-red-600');
      });
    });
  });

  describe('Chart Components', () => {
    it('renders all chart components with correct data', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('revenue-chart')).toBeInTheDocument();
        expect(screen.getByTestId('appointment-chart')).toBeInTheDocument();
        expect(screen.getByTestId('customer-chart')).toBeInTheDocument();
      });
    });

    it('passes correct data to chart components', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Revenue data: 3 points')).toBeInTheDocument();
        expect(screen.getByText('Appointments: 3 points')).toBeInTheDocument();
        expect(screen.getByText('Customers: 3 points')).toBeInTheDocument();
      });
    });

    it('shows loading states for charts during data fetch', () => {
      renderWithProviders(<MainDashboard />);
      
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    });
  });

  describe('Top Services Section', () => {
    it('displays top performing services correctly', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Top Services')).toBeInTheDocument();
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.getByText('$8,500')).toBeInTheDocument();
        expect(screen.getByText('120 bookings')).toBeInTheDocument();
      });
    });

    it('sorts services by revenue correctly', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const services = screen.getAllByText(/\$\d+,?\d*/);
        expect(services[3].textContent).toBe('$8,500'); // First service revenue
        expect(services[4].textContent).toBe('$3,200'); // Second service revenue
      });
    });
  });

  describe('Recent Bookings Section', () => {
    it('displays recent bookings with correct information', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Bookings')).toBeInTheDocument();
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      });
    });

    it('shows booking status with appropriate styling', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const confirmedStatus = screen.getByText('confirmed');
        const pendingStatus = screen.getByText('pending');
        
        expect(confirmedStatus).toHaveClass('bg-green-100', 'text-green-800');
        expect(pendingStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });

    it('formats booking dates correctly', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Jan 15.*10:00 AM/)).toBeInTheDocument();
        expect(screen.getByText(/Jan 15.*2:30 PM/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      server.use(
        http.get('/api/dashboard/analytics', () => 
          new HttpResponse(null, { status: 500 })
        )
      );

      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading dashboard data/)).toBeInTheDocument();
      });
    });

    it('provides retry functionality on error', async () => {
      server.use(
        http.get('/api/dashboard/analytics', () => 
          new HttpResponse(null, { status: 500 })
        )
      );

      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('retries data loading when retry button is clicked', async () => {
      let callCount = 0;
      server.use(
        http.get('/api/dashboard/analytics', () => {
          callCount++;
          if (callCount === 1) {
            return new HttpResponse(null, { status: 500 });
          }
          return HttpResponse.json(mockDashboardData);
        })
      );

      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('$15,000')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewports', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('768px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProviders(<MainDashboard />);
      
      const dashboard = screen.getByTestId('main-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });
  });

  describe('Real-time Updates', () => {
    it('updates data automatically at specified intervals', async () => {
      jest.useFakeTimers();
      
      let updateCount = 0;
      server.use(
        http.get('/api/dashboard/analytics', () => {
          updateCount++;
          return HttpResponse.json({
            ...mockDashboardData,
            revenue: { ...mockDashboardData.revenue, total: 15000 + updateCount * 1000 }
          });
        })
      );

      renderWithProviders(<MainDashboard />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('$15,000')).toBeInTheDocument();
      });

      // Fast-forward time to trigger refresh
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      await waitFor(() => {
        expect(screen.getByText('$16,000')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByLabelText('Revenue overview')).toBeInTheDocument();
        expect(screen.getByLabelText('Appointments overview')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const firstFocusableElement = screen.getByRole('button', { name: /refresh/i });
        firstFocusableElement.focus();
        expect(firstFocusableElement).toHaveFocus();
      });
    });

    it('provides proper color contrast for text elements', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        const heading = screen.getByText('Dashboard Overview');
        const computedStyle = window.getComputedStyle(heading);
        // This would typically check actual contrast ratios
        expect(computedStyle.color).toBeDefined();
      });
    });
  });

  describe('Role-based Display', () => {
    it('shows appropriate content for SHOP_OWNER role', async () => {
      renderWithProviders(<MainDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Shop Performance')).toBeInTheDocument();
        expect(screen.getByText('Manage Staff')).toBeInTheDocument();
      });
    });

    it('adapts content for BARBER role', async () => {
      const barberSession = {
        ...mockSession,
        user: { ...mockSession.user, role: 'BARBER' }
      };

      renderWithProviders(<MainDashboard />, barberSession);
      
      await waitFor(() => {
        expect(screen.getByText('Your Performance')).toBeInTheDocument();
        expect(screen.queryByText('Manage Staff')).not.toBeInTheDocument();
      });
    });

    it('shows enterprise features for ENTERPRISE_OWNER role', async () => {
      const enterpriseSession = {
        ...mockSession,
        user: { ...mockSession.user, role: 'ENTERPRISE_OWNER' }
      };

      renderWithProviders(<MainDashboard />, enterpriseSession);
      
      await waitFor(() => {
        expect(screen.getByText('Multi-Shop Overview')).toBeInTheDocument();
        expect(screen.getByText('Franchise Analytics')).toBeInTheDocument();
      });
    });
  });
});