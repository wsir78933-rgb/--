import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

export function escapeCSV(text: string): string {
  if (!text) return '';
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 预设标签配置
export const DEFAULT_TAGS = [
  '工作',
  '学习',
  '技术',
  '生活',
  '娱乐',
  '购物',
  '旅行',
  '美食',
  '新闻',
  '工具',
  '设计',
  '开发',
  '文档',
  '资源',
  '教程'
] as const;

export type DefaultTag = typeof DEFAULT_TAGS[number];

// 获取预设标签的颜色
export function getTagColor(tag: string): string {
  const colors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  ];

  const normalizedTag = normalizeTag(tag);
  const index = normalizedTag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}