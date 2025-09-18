import React, { useState } from 'react';
import { useTags } from '@/hooks/useTags';
import { Tag as TagIcon, MoreVertical, Edit2, Trash2, Star, Hash, Filter } from 'lucide-react';
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

// 获取标签的颜色主题
const getTagColor = (tag: string): { bg: string; text: string; border: string; hover: string } => {
  const colors = [
    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30' },
    { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700', hover: 'hover:bg-green-100 dark:hover:bg-green-900/30' },
    { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30' },
    { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-700', hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30' },
    { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30' },
    { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700', hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30' },
    { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700', hover: 'hover:bg-red-100 dark:hover:bg-red-900/30' },
    { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700', hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30' },
    { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-700', hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/30' },
    { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-700', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30' },
  ];

  const normalizedTag = tag.toLowerCase();
  const index = normalizedTag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Filter className="mr-2" size={20} />
            标签筛选
          </h2>
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* 标签按钮加载状态 */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ width: `${60 + Math.random() * 40}px` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <TagIcon className="mr-2" size={20} />
          标签筛选
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{tags.length + 1} 个标签</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* 全部书签标签 */}
        <button
          onClick={() => onSelectTag(null)}
          className={cn(
            "inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            !selectedTag
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
          )}
        >
          <Star size={14} className="mr-1.5" />
          全部收藏
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white/60 dark:bg-black/20">
            {tags.reduce((sum, tag) => sum + tag.count, 0)}
          </span>
        </button>

        {/* 标签按钮 */}
        {tags.map((tagItem) => {
          const colors = getTagColor(tagItem.name);
          const isSelected = selectedTag === tagItem.name;

          return (
            <button
              key={tagItem.id}
              onClick={() => onSelectTag(tagItem.name)}
              onContextMenu={(e) => handleContextMenu(e, tagItem.name)}
              className={cn(
                "group inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isSelected
                  ? `${colors.bg} ${colors.text} ${colors.border} border`
                  : `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 ${colors.hover}`
              )}
            >
              <Hash size={14} className="mr-1.5" />
              <span className="truncate max-w-[100px]" title={tagItem.name}>
                {tagItem.name}
              </span>
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white/60 dark:bg-black/20">
                {tagItem.count}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, tagItem.name);
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 transition-all"
              >
                <MoreVertical size={12} />
              </button>
            </button>
          );
        })}
      </div>

      {tags.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <TagIcon size={48} className="mx-auto mb-3 opacity-50" />
          <p>暂无标签</p>
          <p className="text-sm">开始添加一些收藏来创建标签吧</p>
        </div>
      )}

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