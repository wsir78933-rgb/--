import { useState, useCallback, useMemo } from 'react';
import { BookmarkList } from '@/components/BookmarkList/BookmarkList';
import { TagGrid } from '@/components/TagGrid/TagGrid';
import { ExportModal } from '@/components/ExportModal/ExportModal';
import { Analytics } from '@/components/Analytics/Analytics';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTags } from '@/hooks/useTags';
import { Download, Moon, Sun, BarChart3 } from 'lucide-react';

type ViewMode = 'dashboard' | 'analytics';

export function OptionsApp() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  // 使用useBookmarks hook获取书签数据
  const {
    bookmarks,
    loading: bookmarksLoading,
    updateBookmark,
    deleteBookmark
  } = useBookmarks();

  // 使用useTags hook获取标签数据
  const { getTagList } = useTags();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

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

        <div className="space-y-8">
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
                selectedTag={selectedTag}
                emptyMessage={selectedTag ? `"${selectedTag}" 标签下暂无收藏` : '暂无收藏，开始添加一些书签吧！'}
              />
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