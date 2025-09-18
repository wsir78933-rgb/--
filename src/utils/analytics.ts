import type { Bookmark } from '@/types';

export interface TimePoint {
  date: string;
  count: number;
  label: string;
}

export interface TagStats {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

// 获取标签的颜色
const getTagColor = (index: number): string => {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#EC4899', // pink
    '#6366F1', // indigo
  ];
  return colors[index % colors.length];
};

// 时间趋势数据处理
export function processTimeData(bookmarks: Bookmark[], timeRange: '7d' | '30d' | '90d' | 'all'): TimePoint[] {
  const now = new Date();
  const cutoffDate = new Date();

  // 设置截止日期
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
      if (bookmarks.length > 0) {
        const oldestBookmark = bookmarks.reduce((oldest, bookmark) =>
          new Date(bookmark.createdAt) < new Date(oldest.createdAt) ? bookmark : oldest
        );
        cutoffDate.setTime(new Date(oldestBookmark.createdAt).getTime());
      } else {
        cutoffDate.setDate(now.getDate() - 30); // 默认30天
      }
      break;
  }

  // 过滤书签
  const filteredBookmarks = bookmarks.filter(bookmark =>
    new Date(bookmark.createdAt) >= cutoffDate
  );

  // 根据时间范围决定分组方式
  const groupBy = timeRange === '7d' ? 'day' : timeRange === '30d' ? 'day' : timeRange === '90d' ? 'week' : 'month';

  // 创建时间分组
  const groups = new Map<string, number>();

  // 初始化时间点
  const current = new Date(cutoffDate);
  const end = new Date(now);

  if (groupBy === 'day') {
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      groups.set(key, 0);
      current.setDate(current.getDate() + 1);
    }
  } else if (groupBy === 'week') {
    // 找到周的开始（周一）
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - current.getDay() + 1);

    while (startOfWeek <= end) {
      const key = startOfWeek.toISOString().split('T')[0];
      groups.set(key, 0);
      startOfWeek.setDate(startOfWeek.getDate() + 7);
    }
  } else {
    // 月分组
    current.setDate(1); // 设置为月初
    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      groups.set(key, 0);
      current.setMonth(current.getMonth() + 1);
    }
  }

  // 统计每个时间点的数量
  filteredBookmarks.forEach(bookmark => {
    const date = new Date(bookmark.createdAt);
    let key: string;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      // 找到这一周的周一
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay() + 1);
      key = startOfWeek.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (groups.has(key)) {
      groups.set(key, groups.get(key)! + 1);
    }
  });

  // 转换为图表数据
  return Array.from(groups.entries()).map(([date, count]) => {
    let label: string;

    if (groupBy === 'day') {
      const d = new Date(date);
      label = `${d.getMonth() + 1}/${d.getDate()}`;
    } else if (groupBy === 'week') {
      const d = new Date(date);
      const endWeek = new Date(d);
      endWeek.setDate(d.getDate() + 6);
      label = `${d.getMonth() + 1}/${d.getDate()}-${endWeek.getMonth() + 1}/${endWeek.getDate()}`;
    } else {
      const [year, month] = date.split('-');
      label = `${year}/${month}`;
    }

    return { date, count, label };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// 标签分布数据处理
export function processTagData(bookmarks: Bookmark[], timeRange: '7d' | '30d' | '90d' | 'all'): TagStats[] {
  const now = new Date();
  const cutoffDate = new Date();

  // 设置截止日期
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

  // 过滤书签
  const filteredBookmarks = bookmarks.filter(bookmark =>
    new Date(bookmark.createdAt) >= cutoffDate
  );

  // 统计标签使用次数
  const tagCounts = new Map<string, number>();

  filteredBookmarks.forEach(bookmark => {
    bookmark.tags.forEach((tag: string) => {
      const normalizedTag = tag.trim().toLowerCase();
      if (normalizedTag) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      }
    });
  });

  // 计算总数
  const totalCount = Array.from(tagCounts.values()).reduce((sum, count) => sum + count, 0);

  if (totalCount === 0) {
    return [];
  }

  // 转换为图表数据并排序
  const tagStats = Array.from(tagCounts.entries())
    .map(([name, count], index) => ({
      name,
      count,
      percentage: Math.round((count / totalCount) * 100),
      color: getTagColor(index)
    }))
    .sort((a, b) => b.count - a.count);

  // 如果标签太多，只显示前10个，其余合并为"其他"
  if (tagStats.length > 10) {
    const top9 = tagStats.slice(0, 9);
    const others = tagStats.slice(9);
    const othersCount = others.reduce((sum, tag) => sum + tag.count, 0);
    const othersPercentage = others.reduce((sum, tag) => sum + tag.percentage, 0);

    return [
      ...top9,
      {
        name: '其他',
        count: othersCount,
        percentage: othersPercentage,
        color: '#9CA3AF' // gray
      }
    ];
  }

  return tagStats;
}

// 获取热门标签 (用于其他统计)
export function getTopTags(bookmarks: Bookmark[], limit: number = 5): { name: string; count: number }[] {
  const tagCounts = new Map<string, number>();

  bookmarks.forEach(bookmark => {
    bookmark.tags.forEach((tag: string) => {
      const normalizedTag = tag.trim();
      if (normalizedTag) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      }
    });
  });

  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// 按域名统计收藏来源
export function processDomainData(bookmarks: Bookmark[], limit: number = 10): { domain: string; count: number }[] {
  const domainCounts = new Map<string, number>();

  bookmarks.forEach(bookmark => {
    try {
      const url = new URL(bookmark.url);
      const domain = url.hostname.replace('www.', '');
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } catch {
      // 忽略无效URL
    }
  });

  return Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}