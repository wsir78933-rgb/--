import { useState, useMemo } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTags } from '@/hooks/useTags';
import { BarChart3, PieChart, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import { processTimeData, processTagData } from '@/utils/analytics';
import { TrendChart } from './TrendChart';
import { TagDistributionChart, TagRankingList } from './TagDistributionChart';

export interface AnalyticsProps {
  onBack?: () => void;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const timeRangeOptions = [
  { value: '7d' as TimeRange, label: '最近7天' },
  { value: '30d' as TimeRange, label: '最近30天' },
  { value: '90d' as TimeRange, label: '最近90天' },
  { value: 'all' as TimeRange, label: '全部时间' },
];

export function Analytics({ onBack }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { bookmarks, loading } = useBookmarks();
  const { getTagList } = useTags();

  // 处理图表数据
  const chartData = useMemo(() => {
    const timeData = processTimeData(bookmarks, timeRange);
    const tagData = processTagData(bookmarks, timeRange);

    return { timeData, tagData };
  }, [bookmarks, timeRange]);

  // 基础统计数据
  const stats = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        cutoffDate.setFullYear(2000);
        break;
    }

    const filteredBookmarks = bookmarks.filter(bookmark =>
      new Date(bookmark.createdAt) >= cutoffDate
    );

    const totalBookmarks = filteredBookmarks.length;
    const totalTags = getTagList().length;
    const avgPerDay = timeRange === 'all'
      ? totalBookmarks / Math.max(1, Math.ceil((now.getTime() - Math.min(...bookmarks.map(b => new Date(b.createdAt).getTime()))) / (1000 * 60 * 60 * 24)))
      : totalBookmarks / Math.max(1, Math.ceil((now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      totalBookmarks,
      totalTags,
      avgPerDay: Math.round(avgPerDay * 10) / 10,
      filteredBookmarks
    };
  }, [bookmarks, timeRange, getTagList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="mr-2" size={24} />
                数据分析
              </h1>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 加载状态 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="mr-2" size={24} />
                数据分析
              </h1>
            </div>

            {/* 时间范围选择 */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalBookmarks}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    收藏总数
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <PieChart size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalTags}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    标签数量
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.avgPerDay}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    日均收藏
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Calendar size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.ceil((new Date().getTime() - Math.min(...bookmarks.map(b => new Date(b.createdAt).getTime()))) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    使用天数
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 时间趋势图表 */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp size={20} className="mr-2" />
                收藏趋势
              </h3>
              <TrendChart data={chartData.timeData} timeRange={timeRange} />
            </div>

            {/* 标签分布图表 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <PieChart size={20} className="mr-2" />
                标签分布
              </h3>
              <TagDistributionChart data={chartData.tagData} />
            </div>
          </div>

          {/* 标签排行 */}
          {chartData.tagData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <TagRankingList data={chartData.tagData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}