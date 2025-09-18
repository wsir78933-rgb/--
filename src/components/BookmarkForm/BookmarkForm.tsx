import React, { useState, useEffect } from 'react';
import { Bookmark } from '../../types';
import { TagInput } from '../TagInput/TagInput';
import { cn } from '../../lib/utils';

interface BookmarkFormProps {
  initialData?: Partial<Bookmark>;
  availableTags?: string[];
  popularTags?: string[];
  onSubmit: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export function BookmarkForm({
  initialData,
  availableTags = [],
  popularTags = [],
  onSubmit,
  loading = false,
  className
}: BookmarkFormProps) {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    note: '',
    tags: [] as string[],
    favicon: undefined as string | undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with provided data
  useEffect(() => {
    if (initialData) {
      setFormData({
        url: initialData.url || '',
        title: initialData.title || '',
        note: initialData.note || '',
        tags: initialData.tags || [],
        favicon: initialData.favicon
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL不能为空';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = '请输入有效的URL';
      }
    }

    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        url: formData.url.trim(),
        title: formData.title.trim(),
        note: formData.note.trim(),
        tags: formData.tags,
        favicon: formData.favicon
      });

      // Reset form after successful submission
      setFormData({
        url: '',
        title: '',
        note: '',
        tags: [],
        favicon: undefined
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to submit bookmark:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagAdd = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const isDisabled = loading || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-4', className)}
    >
      {/* URL Field */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          网址 *
        </label>
        <input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          disabled={isDisabled}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100',
            errors.url
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          placeholder="https://example.com"
        />
        {errors.url && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.url}</p>
        )}
      </div>

      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          标题 *
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          disabled={isDisabled}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100',
            errors.title
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          placeholder="页面标题"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Note Field */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          备注
        </label>
        <textarea
          id="note"
          value={formData.note}
          onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
          disabled={isDisabled}
          rows={3}
          className={cn(
            'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 resize-none',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          placeholder="为这个收藏添加一些备注..."
        />
      </div>

      {/* Tags Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          标签
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            (点击下拉箭头选择预设标签，或直接输入新标签)
          </span>
        </label>
        <TagInput
          tags={formData.tags}
          availableTags={availableTags}
          popularTags={popularTags}
          onTagAdd={handleTagAdd}
          onTagRemove={handleTagRemove}
          disabled={isDisabled}
          placeholder="点击右侧箭头选择标签或直接输入..."
        />
      </div>

      {/* Popular Tags Quick Select */}
      {popularTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            快速选择常用标签
          </label>
          <div className="flex flex-wrap gap-2">
            {popularTags.slice(0, 8).map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagAdd(tag)}
                disabled={isDisabled || formData.tags.includes(tag)}
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  formData.tags.includes(tag)
                    ? 'bg-blue-500 text-white cursor-default transform scale-95'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-gray-600 hover:scale-105',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {formData.tags.includes(tag) && (
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isDisabled}
        className={cn(
          'w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors',
          isDisabled && 'opacity-50 cursor-not-allowed hover:bg-blue-600'
        )}
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            保存中...
          </>
        ) : (
          '保存收藏'
        )}
      </button>
    </form>
  );
}