import { useState, useCallback, useMemo, useEffect } from 'react';
import { BookmarkList } from '@/components/BookmarkList/BookmarkList';
import { TagGrid } from '@/components/TagGrid/TagGrid';
import { ExportModal } from '@/components/ExportModal/ExportModal';
import { Analytics } from '@/components/Analytics/Analytics';
import { BookmarkSearch } from '@/components/BookmarkSearch/BookmarkSearch';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTags } from '@/hooks/useTags';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Download, Moon, Sun, BarChart3 } from 'lucide-react';
import { Bookmark } from '@/types';

type ViewMode = 'dashboard' | 'analytics';

export function OptionsApp() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Bookmark[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // 使用useBookmarks hook获取书签数据
  const {
    bookmarks,
    loading: bookmarksLoading,
    updateBookmark,
    deleteBookmark,
    searchBookmarks
  } = useBookmarks();

  // 使用useTags hook获取标签数据
  const { getTagList, getTagNames, getPopularTags } = useTags();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  // 处理搜索
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery || searchTags.length > 0) {
        setIsSearching(true);
        try {
          const results = await searchBookmarks(debouncedSearchQuery, searchTags);
          setSearchResults(results);
          setShowSearchResults(true);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, searchTags, searchBookmarks]);

  // 搜索处理函数
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSearchTagAdd = useCallback((tag: string) => {
    if (!searchTags.includes(tag)) {
      setSearchTags([...searchTags, tag]);
    }
  }, [searchTags]);

  const handleSearchTagRemove = useCallback((tag: string) => {
    setSearchTags(searchTags.filter(t => t !== tag));
  }, [searchTags]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setSearchTags([]);
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // 批量删除处理函数
  const handleBatchDelete = useCallback(async (ids: string[]) => {
    try {
      // 批量删除 - 逐个删除每个书签
      await Promise.all(ids.map(id => deleteBookmark(id)));
    } catch (error) {
      console.error('Failed to batch delete bookmarks:', error);
      throw error;
    }
  }, [deleteBookmark]);

  // 获取过滤后的书签
  const filteredBookmarks = useMemo(() => {
    if (!selectedTag) {
      return bookmarks;
    }
    return bookmarks.filter(bookmark =>
      bookmark.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
    );
  }, [bookmarks, selectedTag]);

  // 优化的标签选择处理
  const handleTagSelect = useCallback((tag: string | null) => {
    setSelectedTag(tag);
  }, []);

  // 如果是分析模式，直接显示分析页面
  if (viewMode === 'analytics') {
    return <Analytics onBack={() => setViewMode('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              智能收藏管理
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('analytics')}
                className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <BarChart3 className="mr-2" size={16} />
                数据分析
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2" size={16} />
                导出数据
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 简化的仪表板 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            智能收藏管理
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {bookmarks.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">总收藏数</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {getTagList().length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">标签数</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {bookmarks.filter(b => {
                  const now = new Date();
                  const created = new Date(b.createdAt);
                  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                  return diffDays <= 7;
                }).length}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">最近7天</div>
            </div>
          </div>
        </div>

        {/* 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：标签和收藏列表 */}
          <div className="lg:col-span-2 space-y-8">
            <TagGrid
              selectedTag={selectedTag}
              onSelectTag={handleTagSelect}
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTag ? `"${selectedTag}" 标签下的收藏` : '所有收藏'}
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  共 {filteredBookmarks.length} 个收藏
                </div>
              </div>
              <div className="p-6">
                <BookmarkList
                  bookmarks={filteredBookmarks}
                  loading={bookmarksLoading}
                  onUpdate={updateBookmark}
                  onDelete={deleteBookmark}
                  onBatchDelete={handleBatchDelete}
                  selectedTag={selectedTag}
                  emptyMessage={selectedTag ? `"${selectedTag}" 标签下暂无收藏` : '暂无收藏，开始添加一些书签吧！'}
                />
              </div>
            </div>
          </div>

          {/* 右侧：搜索功能 */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <BookmarkSearch
                searchQuery={searchQuery}
                selectedTags={searchTags}
                availableTags={getTagNames()}
                popularTags={getPopularTags(8).map(t => t.name)}
                onSearchChange={handleSearchChange}
                onTagAdd={handleSearchTagAdd}
                onTagRemove={handleSearchTagRemove}
                onClear={handleSearchClear}
                isSearching={isSearching}
                resultsCount={showSearchResults ? searchResults.length : undefined}
              />

              {/* 搜索结果 */}
              {showSearchResults && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      搜索结果
                    </h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      找到 {searchResults.length} 个结果
                    </div>
                  </div>
                  <div className="p-4">
                    <BookmarkList
                      bookmarks={searchResults}
                      loading={isSearching}
                      onUpdate={updateBookmark}
                      onDelete={deleteBookmark}
                      onBatchDelete={handleBatchDelete}
                      emptyMessage="没有找到匹配的收藏"
                      className="max-h-[600px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}