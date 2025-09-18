import { Bookmark } from '@/types';

interface ExportOptions {
  format: 'csv' | 'json' | 'markdown';
  range: 'all' | 'filtered' | 'selected';
  bookmarks: Bookmark[];
}

export class BookmarkExporter {
  static export(options: ExportOptions) {
    const { format, bookmarks } = options;

    switch (format) {
      case 'csv':
        return this.exportCSV(bookmarks);
      case 'json':
        return this.exportJSON(bookmarks);
      case 'markdown':
        return this.exportMarkdown(bookmarks);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static exportCSV(bookmarks: Bookmark[]): void {
    const headers = ['id', 'created_at', 'url', 'title', 'note', 'tags'];

    const rows = bookmarks.map(b => [
      b.id,
      b.createdAt,
      b.url,
      this.escapeCSV(b.title),
      this.escapeCSV(b.note),
      b.tags.join(',')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.download('\uFEFF' + csv, this.getFilename('csv'), 'text/csv');
  }

  private static exportJSON(bookmarks: Bookmark[]): void {
    const json = JSON.stringify(bookmarks, null, 2);
    this.download(json, this.getFilename('json'), 'application/json');
  }

  private static exportMarkdown(bookmarks: Bookmark[]): void {
    const md = bookmarks.map(b => `
## ${b.title}

- **URL**: ${b.url}
- **Tags**: ${b.tags.join(', ')}
- **Date**: ${new Date(b.createdAt).toLocaleDateString()}

${b.note}

---
    `).join('\n');

    this.download(md, this.getFilename('md'), 'text/markdown');
  }

  private static escapeCSV(text: string): string {
    if (!text) return '';
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private static getFilename(ext: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `bookmarks_${date}.${ext}`;
  }

  private static download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }
}