"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DailySalesData {
  day: string;
  sales: number;
  orders: number;
}

interface WeeklySalesChartProps {
  data: DailySalesData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-green-600">
          Sales: ${payload[0]?.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-blue-600">Orders: {payload[1]?.value}</p>
      </div>
    );
  }
  return null;
};

export default function WeeklySalesChart({ data }: WeeklySalesChartProps) {
  // Fill in missing days with zero values
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const filledData = days.map((day) => {
    const existing = data.find((d) => d.day === day);
    return existing || { day, sales: 0, orders: 0 };
  });

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No sales data available for this week
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filledData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="sales" 
            name="Sales ($)"
            fill="#22c55e" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
          <Bar 
            yAxisId="right"
            dataKey="orders" 
            name="Orders"
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
