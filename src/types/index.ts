export interface Bookmark {
  id: string;
  url: string;
  title: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  favicon?: string;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
  color?: string;
  createdAt: string;
  order?: number;  // 添加排序字段
}

export interface StorageData {
  bookmarks: Bookmark[];
  tags: Record<string, Tag>;
  deletedDefaultTags?: string[]; // 记录用户删除的默认标签
  settings: {
    version: string;
    theme?: 'light' | 'dark' | 'auto';
    dashboardCollapsed?: boolean;
  };
}

import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1),
  note: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  deleted: z.boolean().optional(),
  deletedAt: z.string().datetime().optional(),
  favicon: z.string().optional()
});

export type BookmarkInput = z.infer<typeof BookmarkSchema>;