import { useState } from 'react';
import { BookmarkList } from '@/components/BookmarkList/BookmarkList';
import { Dashboard } from '@/components/Dashboard/Dashboard';
import { TagGrid } from '@/components/TagGrid/TagGrid';
import { ExportModal } from '@/components/ExportModal/ExportModal';
import { Download, Moon, Sun } from 'lucide-react';

export function OptionsApp() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              智能收藏管理
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2" size={16} />
                导出数据
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />

        <div className="mt-8 space-y-8">
          <TagGrid
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />

          {selectedTag !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTag ? `"${selectedTag}" 标签下的收藏` : '所有收藏'}
                </h3>
              </div>
              <div className="p-6">
                <BookmarkList
                  bookmarks={[]}
                  loading={false}
                  onUpdate={async () => {}}
                  onDelete={async () => {}}
                  selectedTag={selectedTag}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}