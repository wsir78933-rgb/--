import { useTags } from '@/hooks/useTags';
import { Tag as TagIcon, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSidebarProps {
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function TagSidebar({ selectedTag, onSelectTag }: TagSidebarProps) {
  const { getTagList, loading } = useTags();
  const tags = getTagList();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <TagIcon className="mr-2" size={20} />
        标签筛选
      </h2>

      <button
        onClick={() => onSelectTag(null)}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg mb-2",
          !selectedTag && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
        )}
      >
        全部书签
      </button>

      <div className="space-y-1">
        {tags.map((tagItem) => (
          <button
            key={tagItem.id}
            onClick={() => onSelectTag(tagItem.name)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center",
              selectedTag === tagItem.name && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
            )}
          >
            <span className="flex items-center">
              <Hash size={14} className="mr-1" />
              {tagItem.name}
            </span>
            <span className="text-sm text-gray-500">{tagItem.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}