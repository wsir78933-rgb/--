import React, { useState, useRef, useEffect } from 'react';
import { cn, getTagColor } from '../../lib/utils';

interface TagInputProps {
  tags: string[];
  availableTags?: string[];
  popularTags?: string[];
  onTagAdd: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  tags,
  availableTags = [],
  popularTags = [],
  onTagAdd,
  onTagRemove,
  disabled = false,
  placeholder = "添加标签...",
  className
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const suggestions = React.useMemo(() => {
    if (!inputValue.trim()) {
      // 当没有输入时，显示所有可用标签，优先显示热门标签
      const allAvailable = availableTags.filter(tag => !tags.includes(tag));
      const popularAvailable = popularTags.filter(tag => !tags.includes(tag));

      // 合并并去重，热门标签在前
      const combined = [
        ...popularAvailable,
        ...allAvailable.filter(tag => !popularAvailable.includes(tag))
      ];

      return combined.slice(0, 10);
    }

    const filtered = availableTags
      .filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(tag)
      )
      .slice(0, 10);

    return filtered;
  }, [inputValue, availableTags, popularTags, tags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(true);
    setFocusedSuggestionIndex(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (focusedSuggestionIndex >= 0 && suggestions[focusedSuggestionIndex]) {
          addTag(suggestions[focusedSuggestionIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        setFocusedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Escape':
        setShowSuggestions(false);
        setFocusedSuggestionIndex(-1);
        break;

      case 'Backspace':
        if (!inputValue && tags.length > 0) {
          onTagRemove(tags[tags.length - 1]);
        }
        break;

      case ',':
      case ';':
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
        break;
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagAdd(trimmedTag);
    }
    setInputValue('');
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
  };

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
    inputRef.current?.focus();
  };

  const handleTagRemove = (tag: string) => {
    onTagRemove(tag);
    inputRef.current?.focus();
  };

  const handleDropdownToggle = () => {
    setShowSuggestions(!showSuggestions);
    setFocusedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Tag container */}
      <div
        className={cn(
          'min-h-[42px] flex flex-wrap items-center gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-700'
        )}
      >
        {/* Existing tags */}
        {tags.map(tag => (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              getTagColor(tag)
            )}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleTagRemove(tag)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:bg-black/10 dark:focus:bg-white/10 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowSuggestions(true)}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm placeholder-gray-500 dark:placeholder-gray-400 dark:text-gray-100"
        />

        {/* Dropdown toggle button */}
        {!disabled && (
          <button
            type="button"
            onClick={handleDropdownToggle}
            className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
            title="选择标签"
          >
            <svg
              className={cn(
                "w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform",
                showSuggestions && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || availableTags.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                  index === focusedSuggestionIndex && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-gray-100">{suggestion}</span>
                  <div className="flex items-center space-x-1">
                    {popularTags.includes(suggestion) && (
                      <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300 rounded">热门</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
              {inputValue ? '没有匹配的标签' : '输入文字添加新标签'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}