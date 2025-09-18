import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TimePoint } from '@/utils/analytics';

interface TrendChartProps {
  data: TimePoint[];
  timeRange: '7d' | '30d' | '90d' | 'all';
}

export function TrendChart({ data }: TrendChartProps) {
  const getYAxisDomain = () => {
    if (data.length === 0) return [0, 10];

    const maxCount = Math.max(...data.map(d => d.count));
    return [0, Math.max(maxCount + 1, 5)];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TimePoint;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {data.label}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            收藏数: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-lg mb-2">📊</div>
        <p className="text-sm">暂无数据</p>
        <p className="text-xs">在所选时间范围内没有收藏记录</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            className="fill-gray-600 dark:fill-gray-400"
            tickLine={{ stroke: '#9CA3AF' }}
            axisLine={{ stroke: '#9CA3AF' }}
          />
          <YAxis
            domain={getYAxisDomain()}
            tick={{ fontSize: 12 }}
            className="fill-gray-600 dark:fill-gray-400"
            tickLine={{ stroke: '#9CA3AF' }}
            axisLine={{ stroke: '#9CA3AF' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{
              r: 4,
              fill: '#3B82F6',
              strokeWidth: 2,
              stroke: '#ffffff',
            }}
            activeDot={{
              r: 6,
              fill: '#1D4ED8',
              strokeWidth: 2,
              stroke: '#ffffff',
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}