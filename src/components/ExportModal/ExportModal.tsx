import { useState } from 'react';
import { X, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BookmarkExporter } from '@/lib/export';
import { toast } from 'sonner';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { bookmarks } = useBookmarks();
  const [format, setFormat] = useState<'csv' | 'json' | 'markdown'>('csv');
  const [range, setRange] = useState<'all' | 'filtered'>('all');

  const handleExport = () => {
    try {
      BookmarkExporter.export({
        format,
        range,
        bookmarks
      });
      toast.success(`导出成功！已下载 ${format.toUpperCase()} 文件`);
      onClose();
    } catch (error) {
      toast.error('导出失败，请重试');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">导出数据</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">导出格式</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <FileSpreadsheet size={16} className="mr-2" />
                CSV (Excel兼容)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <FileJson size={16} className="mr-2" />
                JSON
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="markdown"
                  checked={format === 'markdown'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <FileText size={16} className="mr-2" />
                Markdown
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">导出范围</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={range === 'all'}
                  onChange={(e) => setRange(e.target.value as any)}
                  className="mr-2"
                />
                全部书签 ({bookmarks.length} 条)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="filtered"
                  checked={range === 'filtered'}
                  onChange={(e) => setRange(e.target.value as any)}
                  className="mr-2"
                />
                当前筛选结果
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
}