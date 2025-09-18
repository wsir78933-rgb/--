import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { TagStats } from '@/utils/analytics';

interface TagDistributionChartProps {
  data: TagStats[];
}

export function TagDistributionChart({ data }: TagDistributionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TagStats;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            数量: {data.count}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            占比: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center text-xs">
            <div
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[80px]" title={entry.value}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-lg mb-2">🏷️</div>
        <p className="text-sm">暂无标签数据</p>
        <p className="text-xs">在所选时间范围内没有使用标签</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 标签排行榜组件（作为饼图的补充）
export function TagRankingList({ data }: TagDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <p className="text-sm">暂无标签数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        标签排行
      </h4>
      {data.slice(0, 8).map((tag, index) => (
        <div key={tag.name} className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white rounded-full mr-3" style={{ backgroundColor: tag.color }}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={tag.name}>
                {tag.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{tag.count}</span>
            <span className="text-xs">({tag.percentage}%)</span>
          </div>
        </div>
      ))}
      {data.length > 8 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
          还有 {data.length - 8} 个标签...
        </div>
      )}
    </div>
  );
}