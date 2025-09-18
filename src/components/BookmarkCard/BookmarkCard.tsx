import React from 'react';
import { Bookmark } from '@/types';
import { Edit2, Trash2, ExternalLink, Calendar, Tag } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface BookmarkCardProps {
  bookmark: Bookmark;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit?: (bookmark: Bookmark) => void;
  onDelete?: (id: string) => void;
}

export function BookmarkCard({
  bookmark,
  selected,
  onSelect,
  onEdit,
  onDelete
}: BookmarkCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                {bookmark.favicon && (
                  <img
                    src={bookmark.favicon}
                    alt=""
                    className="inline-block w-4 h-4 mr-2"
                  />
                )}
                {bookmark.title}
              </h3>

              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 mt-1"
              >
                <ExternalLink size={12} />
                {bookmark.url}
              </a>

              {bookmark.note && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {bookmark.note}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {bookmark.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <Tag size={10} className="mr-1" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-2 flex items-center text-xs text-gray-500">
                <Calendar size={12} className="mr-1" />
                {formatDate(bookmark.createdAt)}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(bookmark)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="编辑"
                >
                  <Edit2 size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(bookmark.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}