import { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { BookmarkImporter, ImportResult, ImportOptions, TagConflict } from '@/lib/import';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTags } from '@/hooks/useTags';
import { toast } from 'sonner';

interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: (result: ImportResult) => void;
}

type ImportStep = 'select' | 'configure' | 'conflicts' | 'importing' | 'result';

export function ImportModal({ onClose, onImportSuccess }: ImportModalProps) {
  const { bookmarks, addBookmarks } = useBookmarks();
  const { getTagNames } = useTags();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<'json' | 'csv' | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    format: 'json',
    conflictStrategy: 'skip',
    strictValidation: true
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [tagConflicts, setTagConflicts] = useState<TagConflict[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = BookmarkImporter.validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelectedFile(file);
    setFileFormat(validation.format!);
    setImportOptions(prev => ({ ...prev, format: validation.format! }));
    setStep('configure');
  };

  const handleImport = async () => {
    if (!selectedFile || !fileFormat) return;

    setStep('importing');
    setImportProgress(0);

    try {
      const existingTags = getTagNames();

      const result = await BookmarkImporter.import(
        selectedFile,
        bookmarks,
        existingTags,
        {
          ...importOptions,
          onProgress: (progress, status) => {
            setImportProgress(progress);
            setImportStatus(status);
          }
        }
      );

      setImportResult(result);

      if (result.conflicts.length > 0) {
        setTagConflicts(result.conflicts);
        setStep('conflicts');
      } else {
        // 直接添加书签
        if (result.imported.length > 0) {
          await addBookmarks(result.imported);
          toast.success(`成功导入 ${result.success} 条书签`);
        }
        setStep('result');
        onImportSuccess(result);
      }

    } catch (error) {
      toast.error('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setStep('configure');
    }
  };

  const handleConflictsResolved = async () => {
    if (!importResult) return;

    // 根据用户的冲突解决方案，处理标签
    const processedBookmarks = importResult.imported.map(bookmark => {
      const processedTags = bookmark.tags.map(tag => {
        const conflict = tagConflicts.find(c => c.importTag === tag);
        if (conflict) {
          switch (conflict.action) {
            case 'merge':
              return conflict.suggestedName || conflict.existingTags[0] || tag;
            case 'rename':
              return conflict.suggestedName || tag;
            case 'keep':
              return tag;
            default:
              return tag;
          }
        }
        return tag;
      });

      return { ...bookmark, tags: processedTags };
    });

    try {
      await addBookmarks(processedBookmarks);
      toast.success(`成功导入 ${processedBookmarks.length} 条书签`);
      setStep('result');
      onImportSuccess({ ...importResult, imported: processedBookmarks });
    } catch (error) {
      toast.error('保存书签失败');
    }
  };

  const updateTagConflictAction = (index: number, action: TagConflict['action'], suggestedName?: string) => {
    setTagConflicts(prev => prev.map((conflict, i) =>
      i === index
        ? { ...conflict, action, suggestedName }
        : conflict
    ));
  };

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">选择导入文件</h3>
        <p className="text-gray-500 mb-4">支持 JSON 和 CSV 格式的书签文件</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <FileText className="mr-2 h-4 w-4" />
          选择文件
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium mb-2">支持的文件格式：</h4>
        <ul className="text-sm space-y-1">
          <li>• JSON: 完整的书签数据，包含所有字段</li>
          <li>• CSV: 表格格式，支持字段映射</li>
        </ul>
      </div>
    </div>
  );

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium mb-2">文件信息</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          文件名: {selectedFile?.name}<br />
          格式: {fileFormat?.toUpperCase()}<br />
          大小: {(selectedFile?.size || 0) / 1024 < 1024
            ? `${Math.round((selectedFile?.size || 0) / 1024)} KB`
            : `${Math.round((selectedFile?.size || 0) / 1024 / 1024 * 100) / 100} MB`
          }
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">重复处理策略</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="skip"
                checked={importOptions.conflictStrategy === 'skip'}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  conflictStrategy: e.target.value as any
                }))}
                className="mr-2"
              />
              跳过重复项（推荐）
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="overwrite"
                checked={importOptions.conflictStrategy === 'overwrite'}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  conflictStrategy: e.target.value as any
                }))}
                className="mr-2"
              />
              覆盖现有数据
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={importOptions.strictValidation}
              onChange={(e) => setImportOptions(prev => ({
                ...prev,
                strictValidation: e.target.checked
              }))}
              className="mr-2"
            />
            严格验证（推荐）
          </label>
          <p className="text-xs text-gray-500 mt-1">
            启用后将拒绝格式不正确的数据
          </p>
        </div>
      </div>
    </div>
  );

  const renderConflictsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
        <h3 className="font-medium">标签冲突处理</h3>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-3">
        {tagConflicts.map((conflict, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">"{conflict.importTag}"</span>
              <span className={`text-xs px-2 py-1 rounded ${
                conflict.type === 'exact' ? 'bg-green-100 text-green-700' :
                conflict.type === 'case' ? 'bg-yellow-100 text-yellow-700' :
                conflict.type === 'similar' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {conflict.type === 'exact' ? '完全匹配' :
                 conflict.type === 'case' ? '大小写差异' :
                 conflict.type === 'similar' ? '相似标签' : '新标签'}
              </span>
            </div>

            {conflict.existingTags.length > 0 && (
              <p className="text-sm text-gray-600 mb-2">
                现有标签: {conflict.existingTags.join(', ')}
              </p>
            )}

            <div className="space-y-1">
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  checked={conflict.action === 'merge'}
                  onChange={() => updateTagConflictAction(index, 'merge', conflict.suggestedName)}
                  className="mr-2"
                />
                合并到现有标签
                {conflict.suggestedName && ` (${conflict.suggestedName})`}
              </label>

              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  checked={conflict.action === 'keep'}
                  onChange={() => updateTagConflictAction(index, 'keep')}
                  className="mr-2"
                />
                保留为新标签
              </label>

              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  checked={conflict.action === 'rename'}
                  onChange={() => updateTagConflictAction(index, 'rename')}
                  className="mr-2"
                />
                重命名为:
                <input
                  type="text"
                  defaultValue={conflict.suggestedName || `${conflict.importTag}(导入)`}
                  onChange={(e) => updateTagConflictAction(index, 'rename', e.target.value)}
                  className="ml-2 px-2 py-1 border rounded text-xs flex-1"
                  disabled={conflict.action !== 'rename'}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <h3 className="text-lg font-medium">正在导入...</h3>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${importProgress}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-500">{importStatus}</p>
    </div>
  );

  const renderResultStep = () => {
    if (!importResult) return null;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">导入完成</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>成功导入:</span>
            <span className="font-medium text-green-600">{importResult.success} 条</span>
          </div>
          <div className="flex justify-between">
            <span>跳过重复:</span>
            <span className="font-medium text-yellow-600">{importResult.skipped} 条</span>
          </div>
          <div className="flex justify-between">
            <span>导入失败:</span>
            <span className="font-medium text-red-600">{importResult.failed} 条</span>
          </div>
        </div>

        {importResult.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">错误信息:</h4>
            <div className="text-sm text-red-600 dark:text-red-400 max-h-32 overflow-y-auto">
              {importResult.errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const canProceed = () => {
    switch (step) {
      case 'configure':
        return selectedFile && fileFormat;
      case 'conflicts':
        return tagConflicts.every(c => c.action);
      default:
        return true;
    }
  };

  const getNextButtonText = () => {
    switch (step) {
      case 'configure':
        return '开始导入';
      case 'conflicts':
        return '确认并导入';
      case 'result':
        return '完成';
      default:
        return '下一步';
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'configure':
        handleImport();
        break;
      case 'conflicts':
        handleConflictsResolved();
        break;
      case 'result':
        onClose();
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">导入书签</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {step === 'select' && renderSelectStep()}
        {step === 'configure' && renderConfigureStep()}
        {step === 'conflicts' && renderConflictsStep()}
        {step === 'importing' && renderImportingStep()}
        {step === 'result' && renderResultStep()}

        {step !== 'importing' && (
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
            {step !== 'select' && step !== 'result' && (
              <button
                onClick={() => {
                  if (step === 'configure') setStep('select');
                  if (step === 'conflicts') setStep('configure');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                上一步
              </button>
            )}
            {step !== 'select' && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getNextButtonText()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}