"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface OrderStatusData {
  _id: string;
  count: number;
  amount: number;
}

interface OrderStatusChartProps {
  data: OrderStatusData[];
}

const COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  shipped: "#8b5cf6",
  confirmed: "#06b6d4",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  delivered: "Delivered",
  cancelled: "Cancelled",
  shipped: "Shipped",
  confirmed: "Confirmed",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">
          {STATUS_LABELS[data._id] || data._id}
        </p>
        <p className="text-gray-600">Orders: {data.count}</p>
        <p className="text-gray-600">
          Amount: ${data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function OrderStatusChart({ data }: OrderStatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        No order data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    name: STATUS_LABELS[item._id] || item._id,
    color: COLORS[item._id] || "#94a3b8",
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="count"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-xs">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
