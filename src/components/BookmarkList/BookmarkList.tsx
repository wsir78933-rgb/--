import { useState } from 'react';
import { Bookmark } from '../../types';
import { formatDate, cn } from '../../lib/utils';
import { BookmarkForm } from '../BookmarkForm/BookmarkForm';
import { Trash2, Edit, CheckSquare, Square } from 'lucide-react';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  loading?: boolean;
  onUpdate: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  emptyMessage?: string;
  className?: string;
  selectedTag?: string | null;
}

export function BookmarkList({
  bookmarks,
  loading = false,
  onUpdate,
  onDelete,
  onBatchDelete,
  emptyMessage = '没有收藏',
  className
}: BookmarkListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

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

  // 批量操作处理函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedIds(new Set());
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === bookmarks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookmarks.map(b => b.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || !onBatchDelete) return;

    setBatchDeleting(true);
    try {
      await onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBatchMode(false);
    } catch (error) {
      console.error('Failed to batch delete bookmarks:', error);
    } finally {
      setBatchDeleting(false);
    }
  };

  const isAllSelected = selectedIds.size === bookmarks.length && bookmarks.length > 0;

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
    <div className={cn('space-y-3', className)}>
      {/* 批量操作控制栏 */}
      {bookmarks.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {!batchMode ? (
              <button
                onClick={toggleBatchMode}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <CheckSquare size={16} />
                批量管理
              </button>
            ) : (
              <>
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {isAllSelected ? <Square size={16} /> : <CheckSquare size={16} />}
                  {isAllSelected ? '取消全选' : '全选'}
                </button>

                {selectedIds.size > 0 && onBatchDelete && (
                  <button
                    onClick={handleBatchDelete}
                    disabled={batchDeleting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {batchDeleting ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    删除选中 ({selectedIds.size})
                  </button>
                )}

                <button
                  onClick={toggleBatchMode}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </>
            )}
          </div>

          {batchMode && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              已选择 {selectedIds.size} / {bookmarks.length} 个收藏
            </div>
          )}
        </div>
      )}

      {/* 收藏列表 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {bookmarks.map(bookmark => (
        <div
          key={bookmark.id}
          className={cn(
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow",
            batchMode && selectedIds.has(bookmark.id) && "ring-2 ring-blue-500 dark:ring-blue-400"
          )}
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
                {/* 批量选择框 */}
                {batchMode && (
                  <div className="flex-shrink-0 pt-1">
                    <button
                      onClick={() => toggleSelectItem(bookmark.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {selectedIds.has(bookmark.id) ? (
                        <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                )}

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
                {!batchMode && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(bookmark)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="编辑"
                    >
                      <Edit size={16} />
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
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                )}
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
    </div>
  );
}