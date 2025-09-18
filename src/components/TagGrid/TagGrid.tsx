import React, { useState } from 'react';
import { useTags } from '@/hooks/useTags';
import { Tag as TagIcon, MoreVertical, Edit2, Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagGridProps {
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

interface ContextMenuProps {
  tag: string;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: (tag: string) => void;
  onDelete: (tag: string) => void;
}

// 获取标签的渐变色彩
const getTagGradient = (tag: string): string => {
  const gradients = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-orange-400 to-orange-600',
    'from-indigo-400 to-indigo-600',
    'from-red-400 to-red-600',
    'from-yellow-400 to-yellow-600',
    'from-teal-400 to-teal-600',
    'from-cyan-400 to-cyan-600',
    'from-emerald-400 to-emerald-600',
    'from-rose-400 to-rose-600',
    'from-violet-400 to-violet-600',
    'from-amber-400 to-amber-600',
    'from-lime-400 to-lime-600'
  ];

  const normalizedTag = tag.toLowerCase();
  const index = normalizedTag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
};

function ContextMenu({ tag, x, y, onClose, onEdit, onDelete }: ContextMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]"
        style={{ left: x, top: y }}
      >
        <button
          onClick={() => {
            onEdit(tag);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <Edit2 size={14} className="mr-2" />
          编辑
        </button>
        <button
          onClick={() => {
            onDelete(tag);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-red-600 dark:text-red-400"
        >
          <Trash2 size={14} className="mr-2" />
          删除
        </button>
      </div>
    </>
  );
}

export function TagGrid({ selectedTag, onSelectTag }: TagGridProps) {
  const { getTagList, loading } = useTags();
  const [contextMenu, setContextMenu] = useState<{
    tag: string;
    x: number;
    y: number;
  } | null>(null);

  const tags = getTagList();

  const handleContextMenu = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      tag,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleEdit = (tag: string) => {
    // TODO: 实现编辑功能
    console.log('编辑标签:', tag);
  };

  const handleDelete = (tag: string) => {
    // TODO: 实现删除功能
    console.log('删除标签:', tag);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">标签管理</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[4/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <TagIcon className="mr-2" size={24} />
          标签管理
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          共 {tags.length + 1} 个标签
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* 全部书签卡片 */}
        <button
          onClick={() => onSelectTag(null)}
          className={cn(
            "group relative aspect-[4/3] rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg",
            "bg-gradient-to-br from-gray-400 to-gray-600 text-white",
            !selectedTag && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
          )}
        >
          <div className="absolute inset-0 bg-black/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Star size={20} className="text-white/80" />
              {!selectedTag && (
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>

            <div>
              <div className="text-lg font-semibold mb-1">全部书签</div>
              <div className="text-sm text-white/80">
                {tags.reduce((sum, tag) => sum + tag.count, 0)} 个收藏
              </div>
            </div>
          </div>
        </button>

        {/* 标签卡片 */}
        {tags.map((tagItem) => {
          const gradient = getTagGradient(tagItem.name);
          const isSelected = selectedTag === tagItem.name;

          return (
            <button
              key={tagItem.id}
              onClick={() => onSelectTag(tagItem.name)}
              onContextMenu={(e) => handleContextMenu(e, tagItem.name)}
              className={cn(
                "group relative aspect-[4/3] rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg",
                `bg-gradient-to-br ${gradient} text-white`,
                isSelected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
              )}
            >
              <div className="absolute inset-0 bg-black/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {tagItem.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, tagItem.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 transition-all"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>

                <div>
                  <div className="text-lg font-semibold mb-1 truncate" title={tagItem.name}>
                    {tagItem.name}
                  </div>
                  <div className="text-sm text-white/80">
                    {tagItem.count} 个收藏
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          tag={contextMenu.tag}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}