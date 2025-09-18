import { useState } from 'react';
import { Bookmark } from '../../types';
import { formatDate, cn } from '../../lib/utils';
import { BookmarkForm } from '../BookmarkForm/BookmarkForm';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  loading?: boolean;
  onUpdate: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage?: string;
  className?: string;
  selectedTag?: string | null;
}

export function BookmarkList({
  bookmarks,
  loading = false,
  onUpdate,
  onDelete,
  emptyMessage = '没有收藏',
  className
}: BookmarkListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (updates: Omit<Bookmark, 'id' | 'createdAt'>) => {
    if (!editingId) return;

    try {
      await onUpdate(editingId, updates);
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const openUrl = (url: string) => {
    chrome.tabs.create({ url });
  };

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-24"
          />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 max-h-96 overflow-y-auto', className)}>
      {bookmarks.map(bookmark => (
        <div
          key={bookmark.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow"
        >
          {editingId === bookmark.id ? (
            <div className="space-y-3">
              <BookmarkForm
                initialData={bookmark}
                onSubmit={handleSaveEdit}
                loading={false}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {bookmark.favicon && (
                      <img
                        src={bookmark.favicon}
                        alt=""
                        className="w-4 h-4 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <h3
                      className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => openUrl(bookmark.url)}
                      title={bookmark.title}
                    >
                      {bookmark.title}
                    </h3>
                  </div>
                  <a
                    href={bookmark.url}
                    onClick={(e) => {
                      e.preventDefault();
                      openUrl(bookmark.url);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
                    title={bookmark.url}
                  >
                    {bookmark.url}
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(bookmark)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    disabled={deletingId === bookmark.id}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="删除"
                  >
                    {deletingId === bookmark.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Note */}
              {bookmark.note && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {bookmark.note}
                </p>
              )}

              {/* Tags */}
              {bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {bookmark.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>创建于 {formatDate(bookmark.createdAt)}</span>
                {bookmark.updatedAt && (
                  <span>更新于 {formatDate(bookmark.updatedAt)}</span>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}