import { Bookmark, BookmarkSchema } from '@/types';

// 导入结果接口
export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  conflicts: TagConflict[];
  errors: string[];
  imported: Bookmark[];
}

// 标签冲突接口
export interface TagConflict {
  importTag: string;
  existingTags: string[];
  type: 'exact' | 'case' | 'similar' | 'new';
  action: 'merge' | 'rename' | 'keep' | 'skip';
  suggestedName?: string;
}

// 导入选项接口
export interface ImportOptions {
  format: 'json' | 'csv';
  conflictStrategy: 'skip' | 'overwrite' | 'merge';
  strictValidation: boolean;
  onProgress?: (progress: number, current: string) => void;
}

// 字段映射配置
interface FieldMapping {
  [oldField: string]: string;
}

// 默认值配置
interface ImportDefaults {
  required: string[];
  fieldMapping: FieldMapping;
  defaults: {
    [field: string]: any | ((record: any) => any);
  };
  repair: {
    [field: string]: (value: any, record?: any) => any;
  };
}

export class BookmarkImporter {
  private static readonly FIELD_MAPPINGS: FieldMapping = {
    // 兼容旧版本字段名
    'bookmark_url': 'url',
    'bookmark_title': 'title',
    'created_time': 'createdAt',
    'updated_time': 'updatedAt',
    'tag_list': 'tags',
    'description': 'note',
    'memo': 'note'
  };

  private static readonly DEFAULTS: ImportDefaults = {
    required: ['url', 'title'],
    fieldMapping: this.FIELD_MAPPINGS,
    defaults: {
      id: () => crypto.randomUUID(),
      note: '',
      tags: [],
      createdAt: () => new Date().toISOString(),
      updatedAt: undefined,
      deleted: false,
      deletedAt: undefined,
      favicon: (record: any) => {
        try {
          const url = new URL(record.url);
          return `https://www.google.com/s2/favicons?domain=${url.hostname}`;
        } catch {
          return null;
        }
      }
    },
    repair: {
      tags: (value: any) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(/[,|]/).map(t => t.trim()).filter(t => t);
        }
        return [];
      },
      title: (value: any, record?: any) => {
        if (value) return value;
        if (record?.url) {
          try {
            const url = new URL(record.url);
            return url.hostname + url.pathname;
          } catch {
            return record.url;
          }
        }
        return 'Untitled';
      },
      url: (value: any) => {
        if (!value) return value;
        // 确保URL有协议前缀
        if (!/^https?:\/\//i.test(value)) {
          return 'https://' + value;
        }
        return value;
      }
    }
  };

  /**
   * 导入书签数据
   */
  static async import(
    file: File,
    existingBookmarks: Bookmark[],
    existingTags: string[],
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      conflicts: [],
      errors: [],
      imported: []
    };

    try {
      // 读取文件内容
      const content = await this.readFile(file);

      // 解析数据
      const rawData = await this.parseContent(content, options.format);

      // 处理每条记录
      for (let i = 0; i < rawData.length; i++) {
        if (options.onProgress) {
          options.onProgress(
            Math.round((i / rawData.length) * 100),
            `处理第 ${i + 1}/${rawData.length} 条记录`
          );
        }

        try {
          const processed = await this.processRecord(
            rawData[i],
            existingBookmarks,
            existingTags,
            options
          );

          if (processed.action === 'skip') {
            result.skipped++;
            if (processed.reason) {
              result.errors.push(`跳过记录 ${i + 1}: ${processed.reason}`);
            }
          } else if (processed.bookmark) {
            result.imported.push(processed.bookmark);
            result.success++;

            // 收集标签冲突信息
            if (processed.tagConflicts) {
              result.conflicts.push(...processed.tagConflicts);
            }
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`记录 ${i + 1} 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      if (options.onProgress) {
        options.onProgress(100, '导入完成');
      }

    } catch (error) {
      result.errors.push(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return result;
  }

  /**
   * 读取文件内容
   */
  private static readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * 解析文件内容
   */
  private static async parseContent(content: string, format: 'json' | 'csv'): Promise<any[]> {
    switch (format) {
      case 'json':
        return this.parseJSON(content);
      case 'csv':
        return this.parseCSV(content);
      default:
        throw new Error(`不支持的格式: ${format}`);
    }
  }

  /**
   * 解析JSON格式
   */
  private static parseJSON(content: string): any[] {
    try {
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      throw new Error('JSON格式错误');
    }
  }

  /**
   * 解析CSV格式
   */
  private static parseCSV(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
    }

    const headers = this.parseCSVLine(lines[0]);
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        records.push(record);
      }
    }

    return records;
  }

  /**
   * 解析CSV行
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // 跳过下一个引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * 处理单条记录
   */
  private static async processRecord(
    rawRecord: any,
    existingBookmarks: Bookmark[],
    existingTags: string[],
    options: ImportOptions
  ): Promise<{
    action: 'import' | 'skip';
    bookmark?: Bookmark;
    tagConflicts?: TagConflict[];
    reason?: string;
  }> {
    try {
      // 1. 映射字段名
      const mappedRecord = this.mapFields(rawRecord);

      // 2. 应用默认值和修复
      const repairedRecord = this.applyDefaults(mappedRecord);

      // 3. 验证数据
      if (options.strictValidation) {
        try {
          BookmarkSchema.parse(repairedRecord);
        } catch (error) {
          return {
            action: 'skip',
            reason: '数据验证失败'
          };
        }
      }

      // 4. 检查重复
      const existingBookmark = existingBookmarks.find(b =>
        b.url === repairedRecord.url || b.id === repairedRecord.id
      );

      if (existingBookmark) {
        if (options.conflictStrategy === 'skip') {
          return {
            action: 'skip',
            reason: 'URL已存在'
          };
        }
        // 其他冲突策略的处理...
      }

      // 5. 处理标签冲突
      const tagConflicts = this.detectTagConflicts(repairedRecord.tags, existingTags);

      return {
        action: 'import',
        bookmark: repairedRecord as Bookmark,
        tagConflicts: tagConflicts.length > 0 ? tagConflicts : undefined
      };

    } catch (error) {
      return {
        action: 'skip',
        reason: error instanceof Error ? error.message : '处理失败'
      };
    }
  }

  /**
   * 映射字段名
   */
  private static mapFields(record: any): any {
    const mapped: any = {};

    for (const [key, value] of Object.entries(record)) {
      const mappedKey = this.DEFAULTS.fieldMapping[key] || key;
      mapped[mappedKey] = value;
    }

    return mapped;
  }

  /**
   * 应用默认值和修复
   */
  private static applyDefaults(record: any): any {
    const result = { ...record };

    // 检查必需字段
    for (const field of this.DEFAULTS.required) {
      if (!result[field]) {
        throw new Error(`缺少必需字段: ${field}`);
      }
    }

    // 应用修复函数
    for (const [field, repairFn] of Object.entries(this.DEFAULTS.repair)) {
      if (result[field] !== undefined) {
        result[field] = repairFn(result[field], result);
      }
    }

    // 应用默认值
    for (const [field, defaultValue] of Object.entries(this.DEFAULTS.defaults)) {
      if (result[field] === undefined || result[field] === null || result[field] === '') {
        result[field] = typeof defaultValue === 'function'
          ? defaultValue(result)
          : defaultValue;
      }
    }

    return result;
  }

  /**
   * 检测标签冲突
   */
  private static detectTagConflicts(importTags: string[], existingTags: string[]): TagConflict[] {
    const conflicts: TagConflict[] = [];

    for (const importTag of importTags) {
      const conflict = this.analyzeTagConflict(importTag, existingTags);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * 分析单个标签冲突
   */
  private static analyzeTagConflict(importTag: string, existingTags: string[]): TagConflict | null {
    // 1. 完全匹配 - 自动合并
    if (existingTags.includes(importTag)) {
      return {
        importTag,
        existingTags: [importTag],
        type: 'exact',
        action: 'merge'
      };
    }

    // 2. 大小写差异 - 询问用户
    const caseMatch = existingTags.find(tag =>
      tag.toLowerCase() === importTag.toLowerCase()
    );
    if (caseMatch) {
      return {
        importTag,
        existingTags: [caseMatch],
        type: 'case',
        action: 'merge', // 默认合并，可由用户更改
        suggestedName: caseMatch
      };
    }

    // 3. 相似度检测 - 建议合并
    const similarTags = existingTags.filter(tag =>
      this.calculateSimilarity(importTag, tag) > 0.8
    );
    if (similarTags.length > 0) {
      return {
        importTag,
        existingTags: similarTags,
        type: 'similar',
        action: 'merge',
        suggestedName: similarTags[0]
      };
    }

    // 4. 新标签 - 直接添加
    return {
      importTag,
      existingTags: [],
      type: 'new',
      action: 'keep'
    };
  }

  /**
   * 计算字符串相似度
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 验证导入文件格式
   */
  static validateFile(file: File): { valid: boolean; format?: 'json' | 'csv'; error?: string } {
    // 检查文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: '文件大小不能超过 10MB' };
    }

    // 检查文件类型
    const extension = file.name.toLowerCase().split('.').pop();

    switch (extension) {
      case 'json':
        return { valid: true, format: 'json' };
      case 'csv':
        return { valid: true, format: 'csv' };
      default:
        return { valid: false, error: '仅支持 JSON 和 CSV 格式' };
    }
  }
}