import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { TagInput } from '../TagInput/TagInput';
import { cn } from '../../lib/utils';

interface BookmarkSearchProps {
  searchQuery: string;
  selectedTags: string[];
  availableTags: string[];
  popularTags: string[];
  onSearchChange: (query: string) => void;
  onTagAdd: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  onClear: () => void;
  isSearching?: boolean;
  resultsCount?: number;
  className?: string;
}

export function BookmarkSearch({
  searchQuery,
  selectedTags,
  availableTags,
  popularTags,
  onSearchChange,
  onTagAdd,
  onTagRemove,
  onClear,
  isSearching = false,
  resultsCount,
  className
}: BookmarkSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasActiveFilters = searchQuery || selectedTags.length > 0;

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700', className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Search className="mr-2" size={20} />
            搜索收藏
          </h3>

          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              {resultsCount !== undefined && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  找到 {resultsCount} 个结果
                </span>
              )}
              <button
                onClick={onClear}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="清除搜索条件"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 搜索内容 */}
      <div className="p-4 space-y-4">
        {/* 基础搜索 */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索标题、URL或备注..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>

        {/* 高级过滤器切换 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <Filter className="mr-1" size={14} />
          {showAdvanced ? '隐藏' : '显示'}高级筛选
        </button>

        {/* 高级筛选区域 */}
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* 标签筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                按标签筛选
              </label>
              <TagInput
                tags={selectedTags}
                availableTags={availableTags}
                popularTags={popularTags}
                onTagAdd={onTagAdd}
                onTagRemove={onTagRemove}
                placeholder="选择标签..."
              />
            </div>

            {/* 热门标签快捷选择 */}
            {popularTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  热门标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagAdd(tag)}
                      disabled={selectedTags.includes(tag)}
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                        selectedTags.includes(tag)
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 已选择的筛选条件显示 */}
            {selectedTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  已选择标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {tag}
                      <button
                        onClick={() => onTagRemove(tag)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 搜索提示 */}
        {!hasActiveFilters && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
            输入关键词或选择标签开始搜索
          </div>
        )}
      </div>
    </div>
  );
}