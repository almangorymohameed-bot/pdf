import React from 'react';
import { 
  BookOpen, 
  Settings, 
  FileText, 
  Languages, 
  Eye, 
  Download, 
  Trash2, 
  RotateCw, 
  Type, 
  Edit3, 
  Sparkles,
  FileDown,
  Upload,
  RefreshCw
} from 'lucide-react';

interface ToolbarProps {
  activeTab: 'read' | 'edit-layout' | 'ocr' | 'convert';
  onChangeTab: (tab: 'read' | 'edit-layout' | 'ocr' | 'convert') => void;
  hasDocument: boolean;
  onDownload: () => void;
  onReset: () => void;
  documentName?: string;
}

export default function Toolbar({
  activeTab,
  onChangeTab,
  hasDocument,
  onDownload,
  onReset,
  documentName
}: ToolbarProps) {
  return (
    <header className="bg-[#121212] border-b border-white/10 sticky top-0 z-40 shadow-xl px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight font-sans">نقلة PDF</h1>
            <p className="text-xs text-gray-400">قارئ ومحرر ومُستخرِج نصوص متكامل</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#0a0a0a] p-1.5 rounded-xl border border-white/5 gap-1 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => onChangeTab('read')}
            id="tab-btn-read"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 flex-1 md:flex-initial whitespace-nowrap ${
              activeTab === 'read'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>عرض وقراءة</span>
          </button>

          <button
            onClick={() => onChangeTab('edit-layout')}
            id="tab-btn-edit"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 flex-1 md:flex-initial whitespace-nowrap ${
              activeTab === 'edit-layout'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>تعديل وترتيب الصفحات</span>
          </button>

          <button
            onClick={() => onChangeTab('ocr')}
            id="tab-btn-ocr"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 flex-1 md:flex-initial whitespace-nowrap ${
              activeTab === 'ocr'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>قارئ OCR الذكي</span>
          </button>

          <button
            onClick={() => onChangeTab('convert')}
            id="tab-btn-convert"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 flex-1 md:flex-initial whitespace-nowrap ${
              activeTab === 'convert'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileDown className="w-4 h-4" />
            <span>تحويل المستندات</span>
          </button>
        </div>

        {/* Global Action Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {hasDocument && (
            <>
              <div className="hidden lg:block text-left text-xs ml-2 text-gray-500 max-w-44 truncate font-mono" dir="ltr">
                {documentName}
              </div>
              <button
                onClick={onReset}
                id="btn-global-reset"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-950/30 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                title="إغلاق ورفع مستند آخر"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">مستند جديد</span>
              </button>
              <button
                onClick={onDownload}
                id="btn-global-download"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-950/50"
              >
                <Download className="w-4 h-4" />
                <span>تحميل المستند</span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
