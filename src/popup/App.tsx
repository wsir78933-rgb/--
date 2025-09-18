import React, { useState, useEffect } from 'react';
import { Bookmark } from '../types';
import { useBookmarks } from '../hooks/useBookmarks';
import { useTags } from '../hooks/useTags';
import { useCurrentTab } from '../hooks/useCurrentTab';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { BookmarkForm } from '../components/BookmarkForm/BookmarkForm';
import { BookmarkList } from '../components/BookmarkList/BookmarkList';
import { TagInput } from '../components/TagInput/TagInput';
import { cn } from '../lib/utils';

interface PopupAppProps {
  className?: string;
}

export function PopupApp({ className }: PopupAppProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'search'>('add');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const {
    bookmarks,
    loading: bookmarksLoading,
    error: bookmarksError,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    searchBookmarks
  } = useBookmarks();

  const {
    getTagNames,
    getPopularTags,
    loading: tagsLoading
  } = useTags();

  const {
    currentTab,
    loading: tabLoading,
    error: tabError
  } = useCurrentTab();

  const [searchResults, setSearchResults] = useState<Bookmark[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (activeTab === 'search' && (debouncedSearchQuery || selectedTags.length > 0)) {
        setIsLoading(true);
        try {
          const results = await searchBookmarks(debouncedSearchQuery, selectedTags);
          setSearchResults(results);
          setShowSearchResults(true);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, selectedTags, activeTab, searchBookmarks]);

  const handleAddBookmark = async (bookmarkData: Omit<Bookmark, 'id' | 'createdAt'>) => {
    try {
      setIsLoading(true);
      await addBookmark(bookmarkData);
      // Optionally switch to search tab to show the added bookmark
      setActiveTab('search');
    } catch (error) {
      console.error('Failed to add bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBookmark = async (id: string, updates: Partial<Bookmark>) => {
    try {
      await updateBookmark(id, updates);
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      await deleteBookmark(id);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const handleTagSelect = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const popularTags = getPopularTags(5);
  const allTagNames = getTagNames();

  return (
    <div className={cn('w-96 min-h-[500px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100', className)}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-lg font-semibold">智能收藏助手</h1>

        {/* Tab Navigation */}
        <div className="flex mt-3 bg-blue-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('add')}
            className={cn(
              'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors',
              activeTab === 'add'
                ? 'bg-blue-500 text-white'
                : 'text-blue-100 hover:text-white hover:bg-blue-600'
            )}
          >
            添加收藏
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors',
              activeTab === 'search'
                ? 'bg-blue-500 text-white'
                : 'text-blue-100 hover:text-white hover:bg-blue-600'
            )}
          >
            搜索收藏
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Add Bookmark Tab */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            {tabError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                {tabError}
              </div>
            )}

            {currentTab && (
              <BookmarkForm
                initialData={{
                  url: currentTab.url,
                  title: currentTab.title,
                  note: '',
                  tags: [],
                  favicon: currentTab.favicon
                }}
                availableTags={allTagNames}
                popularTags={popularTags.map(t => t.name)}
                onSubmit={handleAddBookmark}
                loading={isLoading || tabLoading}
              />
            )}

            {tabLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">获取页面信息...</span>
              </div>
            )}
          </div>
        )}

        {/* Search Bookmark Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Input */}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                按标签筛选
              </label>
              <TagInput
                tags={selectedTags}
                availableTags={allTagNames}
                popularTags={popularTags.map(t => t.name)}
                onTagAdd={handleTagSelect}
                onTagRemove={handleTagRemove}
                placeholder="选择标签..."
              />
            </div>

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  热门标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagSelect(tag.name)}
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
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

            {/* Search Results or All Bookmarks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {showSearchResults ? '搜索结果' : '所有收藏'}
                </label>
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>

              {bookmarksError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm mb-4">
                  {bookmarksError}
                </div>
              )}

              <BookmarkList
                bookmarks={showSearchResults ? searchResults : bookmarks}
                loading={bookmarksLoading}
                onUpdate={handleUpdateBookmark}
                onDelete={handleDeleteBookmark}
                emptyMessage={
                  showSearchResults
                    ? (searchQuery || selectedTags.length > 0 ? '没有找到匹配的收藏' : '输入关键词或选择标签来搜索')
                    : '还没有任何收藏，点击"添加收藏"来开始吧！'
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>共 {bookmarks.length} 个收藏</span>
          <button
            onClick={() => {
              // Open options page
              chrome.runtime.openOptionsPage?.();
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            设置
          </button>
        </div>
      </div>
    </div>
  );
}