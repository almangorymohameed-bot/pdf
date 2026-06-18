import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Type, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft, 
  Settings, 
  ArrowDown, 
  Columns, 
  Infinity as InfiniteIcon,
  Languages,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { getPdfjs } from '../utils/pdfHelpers';
import { ReadingSettings } from '../types';

interface ReadingModeProps {
  arrayBuffer: ArrayBuffer;
  totalPages: number;
}

export default function ReadingMode({ arrayBuffer, totalPages }: ReadingModeProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageText, setPageText] = useState<string>('');
  
  // Custom states for reading layout
  const [settings, setSettings] = useState<ReadingSettings>({
    theme: 'sepia',
    fontSize: 20,
    autoScrollSpeed: 0,
    isAutoScrolling: false,
    isTtsReading: false,
    ttsVoice: null,
    ttsRate: 1.0
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollInterval = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        // Default to Arabic or English voice
        const arabicVoice = availableVoices.find(v => v.lang.includes('ar'));
        if (arabicVoice) {
          setSettings(prev => ({ ...prev, ttsVoice: arabicVoice }));
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      stopTts();
    };
  }, []);

  // Update Page Rendering & Text Extraction
  useEffect(() => {
    renderPage(currentPage);
    extractPageText(currentPage);
  }, [currentPage, arrayBuffer]);

  // Handle Auto Scroll Trigger
  useEffect(() => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
    }

    if (settings.isAutoScrolling && settings.autoScrollSpeed > 0) {
      const speedMap = [15, 30, 45, 60, 80, 100, 140, 180, 220, 260, 300]; // milliseconds
      const currentIntervalSpeed = 100 - (settings.autoScrollSpeed * 8); 
      
      autoScrollInterval.current = setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          container.scrollTop += 1;
          
          // Reached bottom - stop or go next
          if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
            if (currentPage < totalPages) {
              setCurrentPage(prev => prev + 1);
              container.scrollTop = 0;
            } else {
              setSettings(prev => ({ ...prev, isAutoScrolling: false }));
            }
          }
        }
      }, Math.max(10, currentIntervalSpeed));
    }

    return () => {
      if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    };
  }, [settings.isAutoScrolling, settings.autoScrollSpeed, currentPage, totalPages]);

  // Render Page to Canvas
  const renderPage = async (pageNum: number) => {
    const pdfjs = getPdfjs();
    if (!pdfjs) return;

    setLoading(true);
    try {
      // Load document copy
      const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const page = await doc.getPage(pageNum);

      // Determine responsive scale
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract raw text for TTS and Clean Reading panel
  const extractPageText = async (pageNum: number) => {
    const pdfjs = getPdfjs();
    if (!pdfjs) return;

    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const extracted = textContent.items.map((item: any) => item.str).join(' ');
      setPageText(extracted.trim() || 'لا يوجد نص قابل للقراءة المباشرة في هذه الصفحة. يمكنك استخدام تبويب "مستخرج النصوص OCR" للتعرف على محتويات هذه الصفحة عبر الذكاء الاصطناعي المجاني.');
    } catch (err) {
      setPageText('تعذر استخراج النص مباشرة من هذا المستند.');
    }
  };

  // Text To Speech synthesizers
  const startTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Stop any ongoing reading
    window.speechSynthesis.cancel();

    if (!pageText) return;

    const utterance = new SpeechSynthesisUtterance(pageText);
    utteranceRef.current = utterance;

    if (settings.ttsVoice) {
      utterance.voice = settings.ttsVoice;
    }
    
    utterance.rate = settings.ttsRate;

    // Detect if reading Arabic
    const isArabic = /[\u0600-\u06FF]/.test(pageText);
    utterance.lang = isArabic ? 'ar-SA' : 'en-US';

    utterance.onend = () => {
      setSettings(prev => ({ ...prev, isTtsReading: false }));
    };

    utterance.onerror = () => {
      setSettings(prev => ({ ...prev, isTtsReading: false }));
    };

    setSettings(prev => ({ ...prev, isTtsReading: true }));
    window.speechSynthesis.speak(utterance);
  };

  const pauseTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setSettings(prev => ({ ...prev, isTtsReading: true }));
      } else {
        window.speechSynthesis.pause();
        setSettings(prev => ({ ...prev, isTtsReading: false }));
      }
    }
  };

  const stopTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSettings(prev => ({ ...prev, isTtsReading: false }));
  };

  // Color theme class names
  const getThemeClass = () => {
    switch (settings.theme) {
      case 'dark':
        return 'bg-neutral-900 text-gray-100 border-white/10';
      case 'sepia':
        return 'bg-amber-500/10 text-amber-200 border-amber-900/40';
      case 'emerald':
        return 'bg-emerald-600/10 text-emerald-250 border-emerald-900/40';
      default:
        return 'bg-[#121212] text-gray-100 border-white/10';
    }
  };

  const getPageContainerBg = () => {
    return 'bg-[#0a0a0a]';
  };

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto ${getPageContainerBg()} rounded-2xl min-h-[calc(100vh-140px)]`}>
      
      {/* Sidebar Controls Column */}
      <div className="xl:col-span-4 bg-[#121212] rounded-xl p-5 border border-white/10 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-white/5">
            <Settings className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-white">تخصيص وضع القراءة المحترف</h2>
          </div>

          {/* Theme customizer */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-400 mb-2">سمة الألوان المفضلة</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'light', name: 'افتراضي', class: 'bg-[#0a0a0a] text-white border-white/10' },
                { key: 'sepia', name: 'وراقي', class: 'bg-amber-950/20 text-amber-200 border-amber-900/30' },
                { key: 'emerald', name: 'مريح للنظر', class: 'bg-emerald-950/20 text-emerald-200 border-emerald-900/30' },
                { key: 'dark', name: 'ليلي', class: 'bg-[#1e1e1e] text-white border-white/10' }
              ].map(themeItem => (
                <button
                  key={themeItem.key}
                  onClick={() => setSettings(prev => ({ ...prev, theme: themeItem.key as any }))}
                  className={`border text-[11px] font-medium py-2 rounded-lg transition-all cursor-pointer ${themeItem.class} ${
                    settings.theme === themeItem.key ? 'ring-2 ring-red-500 scale-102 font-bold shadow-sm' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {themeItem.name}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Customizer */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-gray-400">حجم الخط المستخرج</label>
              <span className="text-xs font-mono text-gray-200 font-bold">{settings.fontSize}px</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 2) }))}
                className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center font-bold hover:bg-white/5 cursor-pointer bg-[#0a0a0a] text-white"
              >
                ﺃ-
              </button>
              <input 
                type="range" 
                min={14} 
                max={32} 
                value={settings.fontSize} 
                onChange={(e) => setSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                className="flex-1 accent-red-600 h-1.5 self-center bg-white/10 rounded-lg"
              />
              <button
                onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.min(32, prev.fontSize + 2) }))}
                className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center font-bold hover:bg-white/5 cursor-pointer bg-[#0a0a0a] text-white"
              >
                ﺃ+
              </button>
            </div>
          </div>

          {/* Auto Scroll */}
          <div className="mb-5 p-4 bg-[#0a0a0a] rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5">
                <InfiniteIcon className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-gray-300">التمرير التلقائي المستمر</span>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, isAutoScrolling: !prev.isAutoScrolling }))}
                className={`text-xs px-2.5 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  settings.isAutoScrolling
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                }`}
              >
                {settings.isAutoScrolling ? 'إيقاف مؤقت' : 'تفعيل'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">بطيء</span>
              <input
                type="range"
                min={1}
                max={10}
                value={settings.autoScrollSpeed}
                onChange={(e) => setSettings(prev => ({ ...prev, autoScrollSpeed: Number(e.target.value) }))}
                className="flex-1 accent-red-600 h-1 bg-white/10 rounded-lg"
              />
              <span className="text-xs text-gray-300 font-bold">{settings.autoScrollSpeed}</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-right">يتيح لك التمرير التلقائي تصفح المستند وقراءته بدون استخدام يديك نهائياً.</p>
          </div>

          {/* Hands Free voice Reading */}
          <div className="p-4 bg-[#0a0a0a]/60 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5 mb-3">
              <Volume2 className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-gray-350">خاصية القراءة الصوتية (TTS)</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Voice selectors */}
              {voices.length > 0 && (
                <div>
                  <label className="block text-[10px] text-red-400 font-bold mb-1">اختر صوت القارئ</label>
                  <select
                    value={settings.ttsVoice?.name || ''}
                    onChange={(e) => {
                      const selected = voices.find(v => v.name === e.target.value);
                      if (selected) setSettings(prev => ({ ...prev, ttsVoice: selected }));
                    }}
                    className="w-full text-xs border border-white/10 rounded-lg p-1.5 bg-[#121212] text-white focus:outline-red-500"
                  >
                    {voices.map(voice => (
                      <option key={voice.name} value={voice.name} className="bg-[#121212] text-white">
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Speech rate controller */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-red-400 font-bold font-sans">سرعة الصوت</span>
                <div className="flex gap-1.5 items-center">
                  {[0.8, 1.0, 1.25, 1.5, 1.8].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setSettings(prev => ({ ...prev, ttsRate: rate }))}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-sm font-semibold transition-all cursor-pointer ${
                        settings.ttsRate === rate ? 'bg-red-600 text-white font-bold' : 'bg-[#121212] text-gray-300 border border-white/10'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Play buttons */}
              <div className="grid grid-cols-3 gap-1.5 mt-1 font-sans">
                <button
                  onClick={startTts}
                  className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-md shadow-red-955/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>بدء</span>
                </button>
                <button
                  onClick={pauseTts}
                  className="flex items-center justify-center gap-1 bg-[#1a1a1a] hover:bg-[#252525] text-white py-2 rounded-lg text-xs font-medium border border-white/5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>استئناف</span>
                </button>
                <button
                  onClick={stopTts}
                  className="flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>إطفاء</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Book Pagination */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between font-sans">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0a0a0a] border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-all cursor-pointer text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-sm font-bold text-white font-mono">
            الصفحة <span className="text-red-500">{currentPage}</span> من {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0a0a0a] border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-all cursor-pointer text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Main Dual Ebook Stage Column */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        
        {/* Toggle View Options */}
        <div className="bg-[#121212] rounded-xl border border-white/10 p-2.5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-gray-300">قارئ نقلة المزدوج (رسومي مدمج + نص مريح)</span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium">قم بالاختيار من القائمة الجانبية لقراءة صوتية وتلقائية مذهلة.</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          {/* Visual PDF page render */}
          <div className="bg-[#0a0a0a] rounded-xl p-4 flex flex-col items-center justify-center border border-white/10 relative shadow-xl min-h-[450px]">
            {loading && (
              <div className="absolute inset-0 bg-[#0a0a0a]/90 rounded-xl flex flex-col items-center justify-center gap-3 z-25 text-white">
                <div className="w-8 h-8 rounded-full border-2 border-white/5 border-t-red-650 animate-spin"></div>
                <span className="text-xs font-medium">جاري معالجة الصفحة وتجهيزها...</span>
              </div>
            )}
            
            <div className="w-full max-h-[600px] overflow-y-auto flex justify-center p-2">
              <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-2xl" />
            </div>

            <div className="mt-3 text-center text-xs text-red-400 font-semibold bg-red-650/10 px-3 py-1 rounded-full border border-red-500/15">
              الصفحة الرسومية {currentPage}
            </div>
          </div>

          {/* Simplified Text Reader (Adjustable font size, themes) */}
          <div className={`rounded-xl p-6 border flex flex-col h-full min-h-[450px] relative shadow-sm ${getThemeClass()}`}>
            
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-inherit/40">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                <h3 className="text-sm font-bold">بنية النص المعززة</h3>
              </div>
              <span className="text-[11px] font-mono opacity-70">
                {pageText.length > 0 ? `${pageText.length} حرف` : '0 حرف'}
              </span>
            </div>

            {/* Read Content Window */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto leading-relaxed max-h-[500px]"
              style={{ fontSize: `${settings.fontSize}px` }}
            >
              {pageText}
            </div>

            <div className="mt-4 pt-3 border-t border-inherit/40 flex justify-between items-center text-[11px] opacity-75">
              <span>وضع القراءة المريح</span>
              <span className="font-bold">استخدم القراءة الصوتية للأجهزة</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
