import React, { useState, useRef } from 'react';
import { useTags } from '@/hooks/useTags';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Tag as TagIcon, Star, Filter, GripVertical, X, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TagGridProps {
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
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

export function TagGrid({ selectedTag, onSelectTag }: TagGridProps) {
  const { getTagList, loading, forceUpdate: forceUpdateTags } = useTags();
  const { bookmarks, updateBookmark, reload: reloadBookmarks } = useBookmarks();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [dragOverTag, setDragOverTag] = useState<string | null>(null);
  const [, setForceRender] = useState(0); // 强制重新渲染
  const [isDraggable, setIsDraggable] = useState<string | null>(null); // 控制哪个标签可以拖拽
  const editInputRef = useRef<HTMLInputElement>(null);

  const tags = getTagList();

  const handleEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const handleSaveEdit = async () => {
    if (!editingTag || !editValue.trim() || editValue.trim() === editingTag) {
      setEditingTag(null);
      return;
    }

    const newTagName = editValue.trim();

    // 检查新标签名是否已存在
    if (tags.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase() && tag.name !== editingTag)) {
      toast.error('标签名已存在');
      return;
    }

    try {
      console.log('编辑标签操作:', editingTag, '->', newTagName);

      // 获取当前存储数据
      const data = await chrome.storage.local.get(null);

      // 更新标签数据
      const updatedTags = { ...data.tags };
      const oldTagKey = Object.keys(updatedTags).find(key =>
        updatedTags[key].name.toLowerCase() === editingTag.toLowerCase()
      );

      if (oldTagKey) {
        // 保留旧标签的所有属性，只更新名称
        const oldTag = updatedTags[oldTagKey];

        // 删除旧key
        delete updatedTags[oldTagKey];
        console.log('删除旧标签键:', oldTagKey);

        // 使用新key添加标签，保留原有order和其他属性
        const newTagKey = newTagName.toLowerCase();
        updatedTags[newTagKey] = {
          ...oldTag,
          name: newTagName,
          // 保持原有的order，如果没有则使用当前时间戳
          order: oldTag.order || Date.now()
        };
        console.log('添加新标签键:', newTagKey);
      }

      // 更新所有包含此标签的书签
      const updatedBookmarksList = (data.bookmarks || []).map((bookmark: any) => {
        if (bookmark.tags && bookmark.tags.some((t: string) => t.toLowerCase() === editingTag.toLowerCase())) {
          return {
            ...bookmark,
            tags: bookmark.tags.map((t: string) =>
              t.toLowerCase() === editingTag.toLowerCase() ? newTagName : t
            ),
            updatedAt: new Date().toISOString()
          };
        }
        return bookmark;
      });

      // 一次性更新存储，确保数据一致性
      await chrome.storage.local.set({
        ...data,
        tags: updatedTags,
        bookmarks: updatedBookmarksList
      });

      console.log('标签重命名操作完成，存储已更新');
      toast.success(`标签"${editingTag}"已重命名为"${newTagName}"`);

      // 如果当前选中的标签被重命名，更新选中状态
      if (selectedTag === editingTag) {
        onSelectTag(newTagName);
      }

      // 强制刷新数据
      setTimeout(async () => {
        await forceUpdateTags();
        await reloadBookmarks();
        setForceRender(prev => prev + 1);
      }, 100);

    } catch (error) {
      console.error('重命名标签失败:', error);
      toast.error('重命名标签失败');
    }

    setEditingTag(null);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
  };

  const handleDelete = async (tag: string) => {
    if (!confirm(`确定要删除标签"${tag}"吗？这将从所有相关收藏中移除此标签。`)) {
      return;
    }

    try {
      console.log('删除标签操作:', tag);

      // 获取当前存储数据
      const data = await chrome.storage.local.get(null);

      // 找到要删除的标签键
      const updatedTags = { ...data.tags };
      const tagKey = Object.keys(updatedTags).find(key =>
        updatedTags[key].name.toLowerCase() === tag.toLowerCase()
      );

      if (tagKey) {
        // 删除标签
        delete updatedTags[tagKey];
        console.log('已删除标签键:', tagKey);
      }

      // 更新所有书签，移除该标签
      const updatedBookmarksList = (data.bookmarks || []).map((bookmark: any) => {
        if (bookmark.tags && bookmark.tags.some((t: string) => t.toLowerCase() === tag.toLowerCase())) {
          return {
            ...bookmark,
            tags: bookmark.tags.filter((t: string) => t.toLowerCase() !== tag.toLowerCase()),
            updatedAt: new Date().toISOString()
          };
        }
        return bookmark;
      });

      // 一次性更新存储，确保数据一致性
      await chrome.storage.local.set({
        ...data,
        tags: updatedTags,
        bookmarks: updatedBookmarksList
      });

      console.log('标签删除操作完成，存储已更新');
      toast.success(`标签"${tag}"已删除`);

      // 如果当前选中的标签被删除，重置选中状态
      if (selectedTag === tag) {
        onSelectTag(null);
      }

      // 强制刷新数据
      setTimeout(async () => {
        await forceUpdateTags();
        await reloadBookmarks();
      }, 100);

    } catch (error) {
      console.error('删除标签失败:', error);
      toast.error('删除标签失败');
    }
  };

  // 鼠标按下，立即启用拖拽
  const handleMouseDown = (tag: string) => {
    // 立即启用拖拽
    setIsDraggable(tag);
    // 添加触觉反馈（如果支持）
    if (window.navigator && 'vibrate' in window.navigator) {
      window.navigator.vibrate(20);
    }
  };

  const handleMouseUp = () => {
    // 延迟一点清除拖拽状态，避免拖拽结束太快
    setTimeout(() => {
      setIsDraggable(null);
    }, 100);
  };

  const handleMouseLeave = () => {
    // 鼠标离开时不立即清除，避免意外中断拖拽
  };

  // 拖拽相关处理
  const handleDragStart = (e: React.DragEvent, tag: string) => {
    if (isDraggable === tag) {
      setDraggedTag(tag);
      e.dataTransfer.effectAllowed = 'move';
    } else {
      e.preventDefault();
    }
  };

  const handleDragEnd = () => {
    setIsDraggable(null);
    setDraggedTag(null);
    setDragOverTag(null);
  };

  const handleDragOver = (e: React.DragEvent, tag: string) => {
    if (draggedTag) {
      e.preventDefault();
      setDragOverTag(tag);
    }
  };

  const handleDragLeave = () => {
    setDragOverTag(null);
  };

  const handleDrop = async (e: React.DragEvent, targetTag: string) => {
    e.preventDefault();

    if (draggedTag && draggedTag !== targetTag) {
      try {
        console.log('拖拽排序:', draggedTag, '->', targetTag);

        // 获取当前存储数据
        const data = await chrome.storage.local.get(null);
        const updatedTags = { ...data.tags };

        // 找到源标签和目标标签
        const draggedIndex = tags.findIndex(t => t.name === draggedTag);
        const targetIndex = tags.findIndex(t => t.name === targetTag);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // 重新计算所有标签的order
          const reorderedTags = [...tags];
          const [removed] = reorderedTags.splice(draggedIndex, 1);
          reorderedTags.splice(targetIndex, 0, removed);

          // 更新存储中的order
          reorderedTags.forEach((tag, index) => {
            const tagKey = Object.keys(updatedTags).find(key =>
              updatedTags[key].name === tag.name
            );
            if (tagKey) {
              updatedTags[tagKey].order = index;
            }
          });

          // 保存到存储
          await chrome.storage.local.set({ ...data, tags: updatedTags });

          // 更新UI
          await forceUpdateTags();
          setForceRender(prev => prev + 1);

          toast.success('标签排序已更新');
        }
      } catch (error) {
        console.error('排序失败:', error);
        toast.error('标签排序失败');
      }
    }

    setDraggedTag(null);
    setDragOverTag(null);
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
          const isEditing = editingTag === tagItem.name;
          const isDraggedOver = dragOverTag === tagItem.name;

          if (isEditing) {
            return (
              <div
                key={tagItem.id}
                className={cn(
                  "inline-flex items-center px-3 py-2 rounded-lg border transition-all duration-200",
                  `${colors.bg} ${colors.border} border-2`
                )}
              >
                <input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  onBlur={handleSaveEdit}
                  className="bg-transparent text-sm font-medium border-none outline-none min-w-0 max-w-[80px]"
                  style={{ color: 'inherit' }}
                />
                <div className="flex items-center ml-2 gap-1">
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-white/60 dark:bg-black/20">
                    {tagItem.count}
                  </span>
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 hover:bg-white/30 rounded transition-colors"
                    title="保存"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 hover:bg-white/30 rounded transition-colors"
                    title="取消"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={tagItem.id}
              className={cn(
                "group inline-flex items-center rounded-lg transition-all duration-200 relative",
                isDraggedOver && "ring-2 ring-blue-400 ring-offset-1",
                draggedTag === tagItem.name && "opacity-50"
              )}
              draggable={isDraggable === tagItem.name}
              onDragStart={(e) => handleDragStart(e, tagItem.name)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, tagItem.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tagItem.name)}
            >
              <div
                className={cn(
                  "inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-grab active:cursor-grabbing select-none",
                  isSelected
                    ? `${colors.bg} ${colors.text} ${colors.border} border`
                    : `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 ${colors.hover}`,
                  isDraggable === tagItem.name && "cursor-grabbing shadow-lg"
                )}
                onClick={() => {
                  // 如果不是拖拽模式，执行选择
                  if (!isDraggable) {
                    onSelectTag(tagItem.name);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // 清除拖拽状态，避免编辑时处于拖拽模式
                  setIsDraggable(null);
                  handleEdit(tagItem.name);
                }}
                onMouseDown={(e) => {
                  // 如果点击的是删除按钮，不启动长按
                  const target = e.target as HTMLElement;
                  if (!target.closest('button')) {
                    handleMouseDown(tagItem.name);
                  }
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={(e) => {
                  // 支持触摸设备
                  const target = e.target as HTMLElement;
                  if (!target.closest('button')) {
                    handleMouseDown(tagItem.name);
                  }
                }}
                onTouchEnd={handleMouseUp}
                title="拖拽排序 | 单击选择 | 双击编辑"
              >
                <GripVertical size={12} className={cn(
                  "mr-1 transition-opacity pointer-events-none",
                  isDraggable === tagItem.name ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                )} />
                <span className="truncate max-w-[80px] pointer-events-none">
                  {tagItem.name}
                </span>
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white/60 dark:bg-black/20 pointer-events-none">
                  {tagItem.count}
                </span>

                {/* 悬停时显示的删除按钮 - 在标签内部 */}
                <div className="ml-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onMouseDown={(e) => {
                      // 阻止删除按钮触发长按
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('删除按钮被点击:', tagItem.name);
                      handleDelete(tagItem.name);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-600 dark:text-red-400"
                    title="删除标签"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
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
    </div>
  );
}