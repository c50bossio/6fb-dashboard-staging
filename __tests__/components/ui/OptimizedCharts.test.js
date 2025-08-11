/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RevenueChart, AppointmentChart, CustomerChart } from '../../../components/ui/OptimizedCharts';

// Mock Chart.js and react-chartjs-2
const ChartjsAuto = {
  Chart: {
    register: jest.fn(),
    defaults: {
      plugins: {
        legend: {},
        tooltip: {}
      },
      scales: {
        x: {},
        y: {}
      }
    }
  },
  CategoryScale: class {},
  LinearScale: class {},
  PointElement: class {},
  LineElement: class {},
  BarElement: class {},
  Title: class {},
  Tooltip: class {},
  Legend: class {},
  Filler: class {},
};

jest.mock('chart.js/auto', () => mockChartjsAuto);

const Line = jest.fn(({ data, options }) => (
  <div 
    data-testid="line-chart" 
    data-chart-type="line"
    data-datasets={JSON.stringify(data?.datasets)}
    data-labels={JSON.stringify(data?.labels)}
    data-options={JSON.stringify(options)}
  >
    Line Chart: {data?.datasets?.[0]?.label || 'No data'}
  </div>
));

const Bar = jest.fn(({ data, options }) => (
  <div 
    data-testid="bar-chart" 
    data-chart-type="bar"
    data-datasets={JSON.stringify(data?.datasets)}
    data-labels={JSON.stringify(data?.labels)}
    data-options={JSON.stringify(options)}
  >
    Bar Chart: {data?.datasets?.[0]?.label || 'No data'}
  </div>
));

jest.mock('react-chartjs-2', () => ({
  Line: mockLine,
  Bar: mockBar,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const RevenueData = [
  { date: '2024-01-01', amount: 1200, transactions: 15 },
  { date: '2024-01-02', amount: 1350, transactions: 18 },
  { date: '2024-01-03', amount: 1100, transactions: 12 },
  { date: '2024-01-04', amount: 1500, transactions: 20 },
  { date: '2024-01-05', amount: 1800, transactions: 22 },
];

const AppointmentData = [
  { date: '2024-01-01', count: 25, completed: 23, cancelled: 2 },
  { date: '2024-01-02', count: 30, completed: 28, cancelled: 2 },
  { date: '2024-01-03', count: 22, completed: 20, cancelled: 2 },
  { date: '2024-01-04', count: 35, completed: 32, cancelled: 3 },
  { date: '2024-01-05', count: 28, completed: 26, cancelled: 2 },
];

const CustomerData = [
  { date: '2024-01-01', count: 8, new: 3, returning: 5 },
  { date: '2024-01-02', count: 12, new: 5, returning: 7 },
  { date: '2024-01-03', count: 6, new: 2, returning: 4 },
  { date: '2024-01-04', count: 15, new: 6, returning: 9 },
  { date: '2024-01-05', count: 10, new: 4, returning: 6 },
];

describe('OptimizedCharts Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RevenueChart Component', () => {
    it('renders loading state correctly', () => {
      render(<RevenueChart data={mockRevenueData} loading={true} />);
      
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.getByText('Loading revenue data...')).toBeInTheDocument();
    });

    it('renders chart with revenue data', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-chart-type', 'line');
    });

    it('formats revenue data correctly for chart', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      const labels = JSON.parse(chart.getAttribute('data-labels'));
      
      expect(labels).toEqual(['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5']);
      expect(datasets[0].data).toEqual([1200, 1350, 1100, 1500, 1800]);
      expect(datasets[0].label).toBe('Revenue');
    });

    it('applies correct styling and colors', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      expect(datasets[0].borderColor).toBe('rgb(34, 197, 94)');
      expect(datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.1)');
      expect(datasets[0].fill).toBe(true);
    });

    it('includes transaction count in tooltip', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.plugins.tooltip.callbacks).toBeDefined();
      expect(typeof options.plugins.tooltip.callbacks.afterLabel).toBe('function');
    });

    it('handles empty data gracefully', () => {
      render(<RevenueChart data={[]} loading={false} />);
      
      expect(screen.getByText('No revenue data available')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('handles null/undefined data', () => {
      render(<RevenueChart data={null} loading={false} />);
      
      expect(screen.getByText('No revenue data available')).toBeInTheDocument();
    });

    it('supports different time periods', () => {
      const weeklyData = [
        { date: '2024-W01', amount: 8500, transactions: 105 },
        { date: '2024-W02', amount: 9200, transactions: 118 },
      ];

      render(<RevenueChart data={weeklyData} loading={false} period="weekly" />);
      
      const chart = screen.getByTestId('line-chart');
      const labels = JSON.parse(chart.getAttribute('data-labels'));
      
      expect(labels).toEqual(['Week 1', 'Week 2']);
    });

    it('shows revenue trend indicator', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} showTrend={true} />);
      
      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
      expect(screen.getByText(/trending/i)).toBeInTheDocument();
    });

    it('calculates trend correctly', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} showTrend={true} />);
      
      const trendElement = screen.getByTestId('trend-value');
      expect(trendElement).toHaveTextContent('+50.0%'); // (1800 - 1200) / 1200 * 100
    });
  });

  describe('AppointmentChart Component', () => {
    it('renders appointment data as bar chart', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={false} />);
      
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-chart-type', 'bar');
    });

    it('shows completed and cancelled appointments', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={false} />);
      
      const chart = screen.getByTestId('bar-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      expect(datasets).toHaveLength(2);
      expect(datasets[0].label).toBe('Completed');
      expect(datasets[1].label).toBe('Cancelled');
    });

    it('uses appropriate colors for appointment status', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={false} />);
      
      const chart = screen.getByTestId('bar-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      expect(datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.8)'); // Green for completed
      expect(datasets[1].backgroundColor).toBe('rgba(239, 68, 68, 0.8)'); // Red for cancelled
    });

    it('displays completion rate', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={false} showStats={true} />);
      
      expect(screen.getByTestId('completion-rate')).toBeInTheDocument();
      expect(screen.getByText('92.1%')).toBeInTheDocument(); // Calculated completion rate
    });

    it('supports stacked bar view', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={false} stacked={true} />);
      
      const chart = screen.getByTestId('bar-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.scales.x.stacked).toBe(true);
      expect(options.scales.y.stacked).toBe(true);
    });

    it('handles loading state', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={true} />);
      
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.getByText('Loading appointment data...')).toBeInTheDocument();
    });
  });

  describe('CustomerChart Component', () => {
    it('renders customer data with new and returning segments', () => {
      render(<CustomerChart data={mockCustomerData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      expect(datasets).toHaveLength(2);
      expect(datasets[0].label).toBe('New Customers');
      expect(datasets[1].label).toBe('Returning Customers');
    });

    it('uses distinct colors for customer types', () => {
      render(<CustomerChart data={mockCustomerData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      expect(datasets[0].borderColor).toBe('rgb(59, 130, 246)'); // Blue for new
      expect(datasets[1].borderColor).toBe('rgb(168, 85, 247)'); // Purple for returning
    });

    it('shows customer retention rate', () => {
      render(<CustomerChart data={mockCustomerData} loading={false} showStats={true} />);
      
      expect(screen.getByTestId('retention-rate')).toBeInTheDocument();
      expect(screen.getByText(/retention rate/i)).toBeInTheDocument();
    });

    it('calculates retention rate correctly', () => {
      render(<CustomerChart data={mockCustomerData} loading={false} showStats={true} />);
      
      const retentionElement = screen.getByTestId('retention-value');
      // Total returning: 31, Total new: 20, Retention: 31/(31+20) = 60.8%
      expect(retentionElement).toHaveTextContent('60.8%');
    });

    it('supports area chart visualization', () => {
      render(<CustomerChart data={mockCustomerData} loading={false} type="area" />);
      
      const chart = screen.getByTestId('line-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      expect(datasets[0].fill).toBe(true);
      expect(datasets[1].fill).toBe(true);
    });
  });

  describe('Chart Interactions', () => {
    it('supports click events on data points', () => {
      const onDataPointClick = jest.fn();
      render(<RevenueChart data={mockRevenueData} loading={false} onDataPointClick={onDataPointClick} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.onClick).toBeDefined();
    });

    it('supports hover events', () => {
      const onHover = jest.fn();
      render(<RevenueChart data={mockRevenueData} loading={false} onHover={onHover} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.onHover).toBeDefined();
    });

    it('supports legend toggle', () => {
      render(<AppointmentChart data={mockAppointmentData} loading={false} />);
      
      const chart = screen.getByTestId('bar-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.plugins.legend.onClick).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to container size changes', () => {
      const { rerender } = render(
        <div style={{ width: 800, height: 400 }}>
          <RevenueChart data={mockRevenueData} loading={false} />
        </div>
      );
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
    });

    it('adjusts font sizes for mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.plugins.legend.labels.font.size).toBe(12);
    });
  });

  describe('Performance Optimizations', () => {
    it('uses animation only when appropriate', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} animated={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.animation).toBe(false);
    });

    it('implements data decimation for large datasets', () => {
      const largeDataset = await fetchFromDatabase({ limit: 1000 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        amount: Math.random() * 1000,
        transactions: Math.floor(Math.random() * 50)
      }));

      render(<RevenueChart data={largeDataset} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.plugins.decimation).toBeDefined();
    });

    it('uses parsing cache for repeated renders', () => {
      const { rerender } = render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      rerender(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.parsing).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chartContainer = screen.getByRole('img', { name: /revenue chart/i });
      expect(chartContainer).toBeInTheDocument();
    });

    it('includes data table for screen readers', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} includeDataTable={true} />);
      
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('aria-label', 'Revenue data table');
    });

    it('supports keyboard navigation', () => {
      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const options = JSON.parse(chart.getAttribute('data-options'));
      
      expect(options.plugins.a11y).toBeDefined();
    });

    it('provides high contrast mode support', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('high-contrast'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      const chart = screen.getByTestId('line-chart');
      const datasets = JSON.parse(chart.getAttribute('data-datasets'));
      
      // Should use high contrast colors
      expect(datasets[0].borderColor).toBe('rgb(0, 0, 0)');
    });
  });

  describe('Error Handling', () => {
    it('handles malformed data gracefully', () => {
      const malformedData = [
        { date: null, amount: 'invalid' },
        { date: '2024-01-02', amount: undefined },
      ];

      render(<RevenueChart data={malformedData} loading={false} />);
      
      expect(screen.getByText('Error processing chart data')).toBeInTheDocument();
    });

    it('shows fallback UI on chart render error', () => {
      // Mock console.error to suppress error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force chart render error
      mockLine.mockImplementationOnce(() => {
        throw new Error('Chart render failed');
      });

      render(<RevenueChart data={mockRevenueData} loading={false} />);
      
      expect(screen.getByText('Unable to display chart')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});