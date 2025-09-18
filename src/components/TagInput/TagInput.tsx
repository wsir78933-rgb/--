import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

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
      return popularTags.filter(tag => !tags.includes(tag)).slice(0, 5);
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
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleTagRemove(tag)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:bg-blue-200 dark:focus:bg-blue-800"
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
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                index === focusedSuggestionIndex && 'bg-gray-100 dark:bg-gray-700'
              )}
            >
              <span className="text-gray-900 dark:text-gray-100">{suggestion}</span>
              {popularTags.includes(suggestion) && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(热门)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}