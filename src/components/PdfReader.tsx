import React, { useEffect, useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronRight, 
  ChevronLeft, 
  PenTool, 
  Highlighter, 
  Type, 
  RotateCw, 
  Trash2, 
  Eraser, 
  Check, 
  Compass, 
  Save, 
  AlertCircle 
} from 'lucide-react';
import { getPdfjs } from '../utils/pdfHelpers';
import { DrawingPath, TextAnnotation, Position } from '../types';

interface PdfReaderProps {
  arrayBuffer: ArrayBuffer;
  totalPages: number;
  drawings: Record<number, DrawingPath[]>;
  setDrawings: React.Dispatch<React.SetStateAction<Record<number, DrawingPath[]>>>;
  texts: Record<number, TextAnnotation[]>;
  setTexts: React.Dispatch<React.SetStateAction<Record<number, TextAnnotation[]>>>;
  onApplyEdits: () => void;
  saving: boolean;
}

export default function PdfReader({
  arrayBuffer,
  totalPages,
  drawings,
  setDrawings,
  texts,
  setTexts,
  onApplyEdits,
  saving
}: PdfReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(false);

  // Editing mode: 'view' | 'pen' | 'highlight' | 'text' | 'erase'
  const [editorMode, setEditorMode] = useState<'view' | 'pen' | 'highlight' | 'text'>('view');
  const [brushColor, setBrushColor] = useState<string>('#ef4444'); // red-500 default
  const [brushWidth, setBrushWidth] = useState<number>(3);
  
  // Local drawing track state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPathPoints, setCurrentPathPoints] = useState<Position[]>([]);

  // Text spawning controls
  const [textInputPos, setTextInputPos] = useState<Position | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Render trigger
  useEffect(() => {
    renderPage(currentPage, scale);
  }, [currentPage, scale, arrayBuffer]);

  const renderPage = async (pageNum: number, pageScale: number) => {
    const pdfjs = getPdfjs();
    if (!pdfjs) return;

    setLoading(true);
    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const page = await doc.getPage(pageNum);
      
      const viewport = page.getViewport({ scale: pageScale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Update overlay size to match pages rendering size exactly 
      if (overlayRef.current) {
        overlayRef.current.style.width = `${viewport.width}px`;
        overlayRef.current.style.height = `${viewport.height}px`;
      }

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering PDF page: ', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert client coordinate relative to overlay box percentage
  const getCoordinates = (e: React.MouseEvent<HTMLDivElement>): Position => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    
    // Convert to percentage parameters for persistent scales mappings
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  // Pointer event managers for drawing & signing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorMode === 'view') return;

    const coords = getCoordinates(e);

    if (editorMode === 'text') {
      setTextInputPos(coords);
      setTextInputValue('');
      return;
    }

    // Start drawing
    setIsDrawing(true);
    setCurrentPathPoints([coords]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || editorMode === 'view' || editorMode === 'text') return;
    const coords = getCoordinates(e);
    setCurrentPathPoints(prev => [...prev, coords]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPathPoints.length > 1) {
      const newPath: DrawingPath = {
        id: Math.random().toString(),
        points: currentPathPoints,
        color: brushColor,
        width: editorMode === 'highlight' ? 12 : brushWidth,
        type: editorMode === 'highlight' ? 'highlight' : 'pen'
      };

      setDrawings(prev => {
        const pageDrawings = prev[currentPage] ? [...prev[currentPage], newPath] : [newPath];
        return { ...prev, [currentPage]: pageDrawings };
      });
    }

    setCurrentPathPoints([]);
  };

  // Add Text Annotation Submit
  const handleAddText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      return;
    }

    const newText: TextAnnotation = {
      id: Math.random().toString(),
      text: textInputValue,
      x: textInputPos.x,
      y: textInputPos.y,
      fontSize: 16,
      color: brushColor
    };

    setTexts(prev => {
      const pageTexts = prev[currentPage] ? [...prev[currentPage], newText] : [newText];
      return { ...prev, [currentPage]: pageTexts };
    });

    setTextInputPos(null);
    setTextInputValue('');
  };

  const handleClearPageAnnotations = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف جميع التعديلات الرسومية والنصوص المضافة لهذه الصفحة؟')) {
      setDrawings(prev => ({ ...prev, [currentPage]: [] }));
      setTexts(prev => ({ ...prev, [currentPage]: [] }));
    }
  };

  const handleRemoveText = (id: string) => {
    setTexts(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).filter(t => t.id !== id)
    }));
  };

  const pageDrawings = drawings[currentPage] || [];
  const pageTexts = texts[currentPage] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-7xl mx-auto p-4 min-h-[calc(100vh-140px)]">
      
      {/* Editor controls column */}
      <div className="lg:col-span-3 bg-[#121212] rounded-xl p-5 border border-white/10 shadow-2xl flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* Section banner */}
          <div className="flex items-center gap-2 border-b pb-3 border-white/5">
            <PenTool className="w-5 h-5 text-red-505" />
            <h2 className="font-bold text-white">أدوات التعديل والكتابة</h2>
          </div>

          {/* Scale controls */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase">مستوى التكبير والتصغير</label>
            <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-white/5 gap-1">
              <button
                onClick={() => setScale(prev => Math.max(0.6, prev - 0.2))}
                className="flex-1 py-1.5 rounded-md flex items-center justify-center hover:bg-white/5 text-gray-300 font-medium transition-colors cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-white self-center px-2">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(prev => Math.min(2.0, prev + 0.2))}
                className="flex-1 py-1.5 rounded-md flex items-center justify-center hover:bg-white/5 text-gray-300 font-medium transition-colors cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tool selectors */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase">اختر أداة التعديل</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'view', title: 'تصفح فقط', icon: Compass },
                { key: 'pen', title: 'قلم توقيع', icon: PenTool },
                { key: 'highlight', title: 'قلم التظليل', icon: Highlighter },
                { key: 'text', title: 'إضافة نص', icon: Type }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setEditorMode(mode.key as any)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    editorMode === mode.key
                      ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/40 scale-102'
                      : 'bg-[#1a1a1a] text-gray-300 border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <mode.icon className="w-4 h-4 shrink-0" />
                  <span>{mode.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color palette */}
          {editorMode !== 'view' && (
            <div className="space-y-2.5 p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">لوحة الألوان المفضلة</span>
              <div className="flex gap-2.5 flex-wrap">
                {[
                  '#ef4444', // Red-500
                  '#3b82f6', // Blue-500
                  '#10b981', // Emerald-500
                  '#f59e0b', // Amber-500
                  '#ffffff', // White
                  '#8b5cf6', // Violet-500
                ].map(color => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      brushColor === color ? 'ring-2 ring-red-500 ring-offset-2 scale-110 shadow-xs' : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                  />
                ))}
              </div>

              {/* Slider for pen size */}
              {editorMode === 'pen' && (
                <div className="mt-2.5">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                    <span>عرض الخط</span>
                    <span>{brushWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(Number(e.target.value))}
                    className="w-full accent-red-600 h-1 bg-white/10 rounded"
                  />
                </div>
              )}
            </div>
          )}

          {/* Quick Clear Page Action */}
          <button
            onClick={handleClearPageAnnotations}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-955/20 border border-red-900/40 hover:border-red-800 rounded-lg transition-colors cursor-pointer"
          >
            <Eraser className="w-4 h-4" />
            <span>مسح جميع تعديلات هذه الصفحة</span>
          </button>

        </div>

        {/* Compile apply edits button to synthesize permanent PDF */}
        <div className="pt-5 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-1.5 p-2 bg-red-650/10 text-red-350 rounded-lg text-[10px] border border-red-500/10 leading-relaxed font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>انقر على (تطبيق وحفظ التعديلات) ليتم دمج توقيعك ورسوماتك بالورقة والاحتفاظ بها كملف PDF دائم بالكامل محلياً.</span>
          </div>

          <button
            onClick={onApplyEdits}
            id="btn-reader-apply"
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all shadow-lg ${
              saving
                ? 'bg-neutral-800 text-neutral-550 cursor-not-allowed shadow-none'
                : 'bg-red-600 hover:bg-red-750 text-white shadow-red-950/40 cursor-pointer'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>جاري معالجة وتثبيت التعديلات...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>تحميل وتصدير التعديلات كملف PDF</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Main page view stages column */}
      <div className="lg:col-span-9 flex flex-col justify-between items-center bg-[#121212] rounded-2xl p-4 md:p-6 border border-white/10 relative shadow-2xl">
        
        {/* Render loader */}
        {loading && (
          <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-3 z-30 text-white">
            <div className="w-8 h-8 rounded-full border-2 border-[#121212] border-t-red-650 animate-spin"></div>
            <span className="text-xs font-medium font-sans">جاري رسم الصفحة بوضوح...</span>
          </div>
        )}

        {/* Sub toolbar */}
        <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-white/5 z-10">
          <div className="text-xs font-bold text-gray-400 font-mono">
            نظام تصفح ذكي - {currentPage} / {totalPages}
          </div>
          
          <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-white/5 select-none">
            {editorMode !== 'view' && (
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-sm font-bold animate-pulse self-center ml-2 shadow-md">
                جاهز {editorMode === 'pen' ? 'للتوقيع' : editorMode === 'highlight' ? 'للتظليل' : 'للكتابة'} بنقرة
              </span>
            )}
            <span className="text-[10px] text-gray-400 self-center">تعديل غير محدود</span>
          </div>
        </div>

        {/* Interactive Viewer Frame */}
        <div className="flex-1 flex items-center justify-center w-full overflow-auto max-h-[600px] p-2">
          
          <div className="relative pdf-page-container rounded-lg bg-white overflow-hidden origin-center select-none cursor-crosshair">
            
            <canvas ref={canvasRef} className="block" />

            {/* Drawing/Typing absolute overlays */}
            <div
              ref={overlayRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute inset-0 z-20 pointer-events-auto"
            >
              {/* Render Permanent Draw paths */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {pageDrawings.map((draw) => (
                  <polyline
                    key={draw.id}
                    fill="none"
                    stroke={draw.color}
                    strokeWidth={draw.width}
                    points={draw.points.map(p => `${(p.x / 100) * overlayRef.current!.clientWidth},${(p.y / 100) * overlayRef.current!.clientHeight}`).join(' ')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={draw.type === 'highlight' ? 0.45 : 1}
                  />
                ))}

                {/* Render active tracking trail */}
                {currentPathPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={brushColor}
                    strokeWidth={editorMode === 'highlight' ? 12 : brushWidth}
                    points={currentPathPoints.map(p => `${(p.x / 100) * overlayRef.current!.clientWidth},${(p.y / 100) * overlayRef.current!.clientHeight}`).join(' ')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={editorMode === 'highlight' ? 0.45 : 1}
                  />
                )}
              </svg>

              {/* Saved Text Annotation Render */}
              {pageTexts.map((text) => (
                <div
                  key={text.id}
                  style={{
                    left: `${text.x}%`,
                    top: `${text.y}%`,
                    color: text.color,
                    fontSize: `${text.fontSize}px`
                  }}
                  className="absolute pointer-events-auto group px-2 py-1 bg-[#121212]/95 hover:bg-[#121212] rounded border border-white/10 backdrop-blur-xs flex items-center gap-1.5 shadow-xl transform -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="font-bold text-white leading-tight select-all">{text.text}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveText(text.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/5 text-red-500 rounded cursor-pointer"
                    title="حذف هذا النص"
                  >
                    <Trash2 className="w-3" />
                  </button>
                </div>
              ))}

              {/* Inline input spawner spawn box */}
              {textInputPos && (
                <div
                  style={{
                    left: `${textInputPos.x}%`,
                    top: `${textInputPos.y}%`
                  }}
                  className="absolute z-30 bg-[#121212] border border-white/10 p-2.5 rounded-xl flex items-center gap-1.5 shadow-2xl transform -translate-x-1/2 -translate-y-1/2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddText();
                      if (e.key === 'Escape') setTextInputPos(null);
                    }}
                    autoFocus
                    placeholder="اكتب شيئاً واضغط Enter..."
                    className="border border-white/10 bg-[#0a0a0a] px-2 py-1 rounded text-xs text-white focus:outline-red-500 font-bold"
                  />
                  <button
                    onClick={handleAddText}
                    className="p-1.5 px-3 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                  >
                    موافق
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* Bottom controls panel */}
        <div className="w-full flex items-center justify-between border-t border-white/5 pt-4 mt-4 z-10 font-sans">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0a0a0a] text-gray-300 rounded-lg hover:bg-white/5 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>الصفحة السابقة</span>
          </button>

          <span className="text-xs font-bold text-gray-300 bg-[#0a0a0a] px-3 py-1.5 border border-white/10 rounded-full font-mono">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0a0a0a] text-gray-300 rounded-lg hover:bg-white/5 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span>الصفحة التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
