import React, { useEffect, useState, useRef } from 'react';
import { 
  RotateCw, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Check, 
  Sparkles, 
  Sliders, 
  Eye, 
  Save,
  Grid
} from 'lucide-react';
import { getPdfjs } from '../utils/pdfHelpers';
import { PageState } from '../types';

interface PageOrganizerProps {
  arrayBuffer: ArrayBuffer;
  totalPages: number;
  pagesState: PageState[];
  setPagesState: React.Dispatch<React.SetStateAction<PageState[]>>;
  onSaveEdits: () => void;
  saving: boolean;
}

// Mini page render helper to keep codebase clean and fast
function PageThumbnail({ 
  arrayBuffer, 
  pageNumber, 
  rotation 
}: { 
  arrayBuffer: ArrayBuffer; 
  pageNumber: number; 
  rotation: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const renderMini = async () => {
      const pdfjs = getPdfjs();
      if (!pdfjs) return;

      try {
        setLoading(true);
        const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const page = await doc.getPage(pageNumber);
        
        // Render with low scale for rapid thumbnail previews
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = canvasRef.current;
        if (!canvas || !active) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
      } catch (err) {
        console.error('Error rendering thumbnail:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    renderMini();
    return () => {
      active = false;
    };
  }, [arrayBuffer, pageNumber]);

  return (
    <div className="relative w-full aspect-[3/4] bg-[#0a0a0a] rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/10 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        style={{ transform: `rotate(${rotation}deg)` }}
        className="max-w-full max-h-full object-contain transition-transform duration-200" 
      />
    </div>
  );
}

export default function PageOrganizer({
  arrayBuffer,
  totalPages,
  pagesState,
  setPagesState,
  onSaveEdits,
  saving
}: PageOrganizerProps) {

  // Direct layout helper actions
  const rotateLeft = (index: number) => {
    setPagesState(prev => prev.map((p, i) => {
      if (i === index) {
        const nextRotation = (p.rotation - 90 + 360) % 360;
        return { ...p, rotation: nextRotation };
      }
      return p;
    }));
  };

  const rotateRight = (index: number) => {
    setPagesState(prev => prev.map((p, i) => {
      if (i === index) {
        const nextRotation = (p.rotation + 90) % 360;
        return { ...p, rotation: nextRotation };
      }
      return p;
    }));
  };

  const toggleDelete = (index: number) => {
    setPagesState(prev => prev.map((p, i) => {
      if (i === index) {
        return { ...p, isDeleted: !p.isDeleted };
      }
      return p;
    }));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPagesState(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === pagesState.length - 1) return;
    setPagesState(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const resetAllChanges = () => {
    const initial: PageState[] = Array.from({ length: totalPages }, (_, i) => ({
      pageNumber: i + 1,
      rotation: 0,
      isDeleted: false,
      originalIndex: i
    }));
    setPagesState(initial);
  };

  // Render stats
  const activePagesCount = pagesState.filter(p => !p.isDeleted).length;

  return (
    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/10 shadow-3xl max-w-7xl mx-auto min-h-[calc(100vh-140px)]">
      
      {/* Control panel header */}
      <div className="bg-[#121212] rounded-xl p-5 border border-white/10 mb-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-650/10 flex items-center justify-center text-red-400 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white">محرر ومُنظم صفحات PDF</h2>
            <p className="text-xs text-gray-400">
              قم بتدوير الصفحات وتغيير ترتيبها أو إزالة ما لا تريده، ثم قم بحفظ التعديلات محلياً ومجاناً.
            </p>
          </div>
        </div>

        {/* Dashboard Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="text-xs text-gray-400 font-bold ml-3 shrink-0">
            الصفحات النشطة: <span className="text-red-500 font-mono text-sm">{activePagesCount}</span> من <span className="font-mono text-sm text-white">{totalPages}</span>
          </div>
          <button
            onClick={resetAllChanges}
            id="btn-organize-reset"
            className="px-3.5 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 rounded-lg border border-white/10 transition-colors cursor-pointer"
          >
            تراجع عن التغييرات
          </button>
          
          <button
            onClick={onSaveEdits}
            id="btn-organize-apply"
            disabled={saving || activePagesCount === 0}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-lg ${
              saving 
                ? 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed border border-white/5' 
                : 'bg-red-600 hover:bg-red-750 text-white shadow-red-955/25'
            }`}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>جاري البناء...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات الجديدة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      {pagesState.length === 0 ? (
        <div className="text-center py-20 bg-[#121212] rounded-xl border border-white/10">
          <Grid className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">لا توجد صفحات نشطة في هذا المستند</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {pagesState.map((page, idx) => {
            return (
              <div 
                key={`${page.pageNumber}-${idx}`}
                className={`flex flex-col bg-[#121212] rounded-xl p-3 border transition-all duration-200 relative group select-none ${
                  page.isDeleted 
                    ? 'opacity-40 border-red-500/30 bg-red-950/5 scale-95' 
                    : 'border-white/10 hover:border-red-500/60 hover:scale-101 shadow-xl'
                }`}
              >
                {/* Visual count label */}
                <span className="absolute top-2 right-2 bg-red-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-md">
                  {idx + 1} ({page.pageNumber})
                </span>

                {/* Main page thumbnail preview */}
                <div className="relative">
                  <PageThumbnail 
                    arrayBuffer={arrayBuffer} 
                    pageNumber={page.pageNumber} 
                    rotation={page.rotation} 
                  />

                  {/* Deleted overlay status */}
                  {page.isDeleted && (
                    <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-xs rounded-lg flex items-center justify-center border border-red-500/20">
                      <span className="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-md shadow-lg">
                        محذوفة
                      </span>
                    </div>
                  )}
                </div>

                {/* Toolbar operations for this single page */}
                <div className="grid grid-cols-5 gap-1 mt-3">
                  {/* Rotate Left */}
                  <button
                    onClick={() => rotateLeft(idx)}
                    disabled={page.isDeleted}
                    className="flex items-center justify-center p-1.5 rounded-md bg-[#0a0a0a] hover:bg-white/5 text-gray-300 disabled:opacity-30 border border-white/5 transition-colors cursor-pointer"
                    title="تدوير لليسار"
                  >
                    <RotateCw className="w-3.5 h-3.5 transform -scale-x-100" />
                  </button>

                  {/* Rotate Right */}
                  <button
                    onClick={() => rotateRight(idx)}
                    disabled={page.isDeleted}
                    className="flex items-center justify-center p-1.5 rounded-md bg-[#0a0a0a] hover:bg-white/5 text-gray-300 disabled:opacity-30 border border-white/5 transition-colors cursor-pointer"
                    title="تدوير لليمين"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete / Restore toggle */}
                  <button
                    onClick={() => toggleDelete(idx)}
                    className={`flex items-center justify-center p-1.5 rounded-md border transition-colors cursor-pointer ${
                      page.isDeleted 
                        ? 'bg-red-600/10 hover:bg-red-600/20 border-red-500/20 text-red-400' 
                        : 'bg-[#0a0a0a] hover:bg-red-955/20 border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/30'
                    }`}
                    title={page.isDeleted ? 'استعادة الصفحة' : 'حذف الصفحة'}
                  >
                    {page.isDeleted ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Move Up/Left */}
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0 || page.isDeleted}
                    className="flex items-center justify-center p-1.5 rounded-md bg-[#0a0a0a] hover:bg-white/5 text-gray-300 disabled:opacity-30 border border-white/5 transition-colors cursor-pointer"
                    title="نقل للأمام"
                  >
                    <ArrowUp className="w-3.5 h-3.5 transform -rotate-90" />
                  </button>

                  {/* Move Down/Right */}
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === pagesState.length - 1 || page.isDeleted}
                    className="flex items-center justify-center p-1.5 rounded-md bg-[#0a0a0a] hover:bg-white/5 text-gray-300 disabled:opacity-30 border border-white/5 transition-colors cursor-pointer"
                    title="نقل للخلف"
                  >
                    <ArrowDown className="w-3.5 h-3.5 transform -rotate-90" />
                  </button>
                </div>

                {/* Rotation label if non-zero */}
                {page.rotation > 0 && !page.isDeleted && (
                  <div className="mt-2 text-center text-[10px] font-bold text-red-405 bg-red-655/10 py-1 rounded border border-red-500/10">
                    زاوية الدوران: {page.rotation}°
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
