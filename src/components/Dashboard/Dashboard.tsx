import React, { useState, useEffect } from 'react';
import { Bookmark, Tag } from '../../types';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useTags } from '../../hooks/useTags';
import { useStorage } from '../../hooks/useStorage';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { BookmarkList } from '../BookmarkList/BookmarkList';
import { TagInput } from '../TagInput/TagInput';
import { StorageManager } from '../../lib/storage';
import { cn, formatDate } from '../../lib/utils';

interface DashboardProps {
  className?: string;
}

export function Dashboard({ className }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const {
    bookmarks,
    loading: bookmarksLoading,
    error: bookmarksError,
    updateBookmark,
    deleteBookmark,
    searchBookmarks
  } = useBookmarks();

  const {
    getTagList,
    getTagNames,
    getPopularTags
  } = useTags();

  const { data: storageData } = useStorage();

  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle search and filtering
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery || selectedTags.length > 0) {
        setIsSearching(true);
        try {
          const results = await searchBookmarks(debouncedSearchQuery, selectedTags);
          setFilteredBookmarks(results);
        } catch (error) {
          console.error('Search failed:', error);
          setFilteredBookmarks([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredBookmarks(bookmarks);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, selectedTags, bookmarks, searchBookmarks]);

  // Sort bookmarks
  const sortedBookmarks = React.useMemo(() => {
    const sorted = [...filteredBookmarks].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updatedAt':
          aValue = a.updatedAt || a.createdAt;
          bValue = b.updatedAt || b.createdAt;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredBookmarks, sortBy, sortOrder]);

  const handleTagSelect = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const storageManager = StorageManager.getInstance();
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = await storageManager.exportToJSON();
        filename = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        content = await storageManager.exportToCSV();
        filename = `bookmarks-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const content = await file.text();
      const storageManager = StorageManager.getInstance();
      const result = await storageManager.importFromJSON(content);

      alert(`导入完成！成功导入 ${result.imported} 个收藏。${result.errors.length > 0 ? `错误：${result.errors.length} 个` : ''}`);

    } catch (error) {
      console.error('Import failed:', error);
      alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsImporting(false);
    }
  };

  const tagList = getTagList();
  const tagNames = getTagNames();
  const popularTags = getPopularTags(10);

  const stats = {
    totalBookmarks: bookmarks.length,
    totalTags: tagList.length,
    recentBookmarks: bookmarks.filter(b => {
      const now = new Date();
      const created = new Date(b.createdAt);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }).length
  };

  return (
    <div className={cn('max-w-6xl mx-auto p-6 space-y-6', className)}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          智能收藏管理
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalBookmarks}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">总收藏数</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalTags}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">标签数</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.recentBookmarks}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">最近7天</div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              搜索收藏
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题、URL或备注..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              按标签筛选
            </label>
            <TagInput
              tags={selectedTags}
              availableTags={tagNames}
              popularTags={popularTags.map(t => t.name)}
              onTagAdd={handleTagSelect}
              onTagRemove={handleTagRemove}
              placeholder="选择标签..."
            />
          </div>

          {/* Sort and View Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                排序：
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="createdAt">创建时间</option>
                <option value="updatedAt">更新时间</option>
                <option value="title">标题</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                视图：
              </label>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-2 py-1 text-sm rounded',
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                列表
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-2 py-1 text-sm rounded',
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                网格
              </button>
            </div>

            {/* Export/Import */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isExporting ? '导出中...' : '导出JSON'}
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isExporting ? '导出中...' : '导出CSV'}
              </button>
              <label className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
                {isImporting ? '导入中...' : '导入'}
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImport(file);
                      e.target.value = '';
                    }
                  }}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            热门标签
          </h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagSelect(tag.name)}
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  selectedTags.includes(tag.name)
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {tag.name}
                <span className="ml-1 text-gray-600 dark:text-gray-400">({tag.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bookmarks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {searchQuery || selectedTags.length > 0 ? '搜索结果' : '所有收藏'}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({sortedBookmarks.length})
            </span>
          </h2>
          {isSearching && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          )}
        </div>

        {bookmarksError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
            {bookmarksError}
          </div>
        )}

        <BookmarkList
          bookmarks={sortedBookmarks}
          loading={bookmarksLoading}
          onUpdate={updateBookmark}
          onDelete={deleteBookmark}
          emptyMessage={
            searchQuery || selectedTags.length > 0
              ? '没有找到匹配的收藏'
              : '还没有任何收藏，使用浏览器扩展来添加收藏吧！'
          }
          className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : ''}
        />
      </div>
    </div>
  );
}