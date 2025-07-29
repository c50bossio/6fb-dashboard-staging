'use client'

import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from './Card'
import { cn, formatCurrency, formatNumber } from '../../lib/utils'

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {label && (
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {labelFormatter ? labelFormatter(label) : label}
          </p>
        )}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Line Chart Component
const LineChartComponent = ({ 
  data, 
  title, 
  height = 300,
  className,
  lines = [{ dataKey: 'value', stroke: '#0ea5e9', name: 'Value' }],
  xAxisKey = 'name',
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  formatter,
  labelFormatter
}) => (
  <Card className={className}>
    {title && (
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatter={formatter} labelFormatter={labelFormatter} />}
            />
          )}
          {showLegend && <Legend />}
          {lines.map((line, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={line.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)

// Area Chart Component
const AreaChartComponent = ({ 
  data, 
  title, 
  height = 300,
  className,
  areas = [{ dataKey: 'value', fill: '#0ea5e9', stroke: '#0ea5e9', name: 'Value' }],
  xAxisKey = 'name',
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  formatter,
  labelFormatter
}) => (
  <Card className={className}>
    {title && (
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatter={formatter} labelFormatter={labelFormatter} />}
            />
          )}
          {showLegend && <Legend />}
          {areas.map((area, index) => (
            <Area
              key={index}
              type="monotone"
              dataKey={area.dataKey}
              stroke={area.stroke}
              fill={area.fill}
              fillOpacity={0.6}
              name={area.name}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)

// Bar Chart Component
const BarChartComponent = ({ 
  data, 
  title, 
  height = 300,
  className,
  bars = [{ dataKey: 'value', fill: '#0ea5e9', name: 'Value' }],
  xAxisKey = 'name',
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  formatter,
  labelFormatter
}) => (
  <Card className={className}>
    {title && (
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatter={formatter} labelFormatter={labelFormatter} />}
            />
          )}
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={index}
              dataKey={bar.dataKey}
              fill={bar.fill}
              radius={[4, 4, 0, 0]}
              name={bar.name}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)

// Pie Chart Component
const PieChartComponent = ({ 
  data, 
  title, 
  height = 300,
  className,
  showTooltip = true,
  showLegend = true,
  formatter,
  colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
}) => (
  <Card className={className}>
    {title && (
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatter={formatter} />}
            />
          )}
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)

// Radial Progress Chart
const RadialProgressChart = ({ 
  value, 
  max = 100, 
  title, 
  className,
  color = '#0ea5e9',
  size = 120,
  strokeWidth = 8
}) => {
  const percentage = (value / max) * 100
  const data = [{ value: percentage, fill: color }]

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="relative">
            <ResponsiveContainer width={size} height={size}>
              <RadialBarChart
                data={data}
                startAngle={90}
                endAngle={-270}
                innerRadius="60%"
                outerRadius="90%"
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={strokeWidth / 2}
                  fill={color}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(percentage)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {value} / {max}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mini Chart Component (for small spaces)
const MiniChart = ({ 
  data, 
  type = 'line', 
  height = 60, 
  color = '#0ea5e9',
  className 
}) => (
  <div className={cn('w-full', className)}>
    <ResponsiveContainer width="100%" height={height}>
      {type === 'line' ? (
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      ) : (
        <AreaChart data={data}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  </div>
)

export {
  LineChartComponent as LineChart,
  AreaChartComponent as AreaChart,
  BarChartComponent as BarChart,
  PieChartComponent as PieChart,
  RadialProgressChart,
  MiniChart,
  CustomTooltip
}