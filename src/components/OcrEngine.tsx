import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  Upload, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  FileImage, 
  RefreshCw, 
  HelpCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { getPdfjs, performOcr } from '../utils/pdfHelpers';

interface OcrEngineProps {
  arrayBuffer?: ArrayBuffer;
  totalPages?: number;
}

export default function OcrEngine({ arrayBuffer, totalPages = 0 }: OcrEngineProps) {
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<'ara' | 'eng' | 'ara+eng'>('ara+eng');
  
  // Scans source
  const [ocrSourceType, setOcrSourceType] = useState<'pdf-page' | 'external-image'>('pdf-page');
  const [externalImage, setExternalImage] = useState<string | null>(null);
  
  // OCR processing runner
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);
  const [extractedResult, setExtractedResult] = useState<string>('');
  
  // Copy state feedback
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Render selected page when selectedPage or source changes
  useEffect(() => {
    if (ocrSourceType === 'pdf-page' && arrayBuffer) {
      renderHighQualityPage(selectedPage);
    }
  }, [selectedPage, ocrSourceType, arrayBuffer]);

  // Render high quality page for solid OCR recognition
  const renderHighQualityPage = async (pageNum: number) => {
    const pdfjs = getPdfjs();
    if (!pdfjs || !arrayBuffer) return;

    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const page = await doc.getPage(pageNum);
      
      // Scale 2.0 to make text highly visible and readable for OCR engine!
      const viewport = page.getViewport({ scale: 2.0 });
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
      console.error('Error rendering page for OCR:', err);
    }
  };

  // Run the OCR process
  const startOcrProcessing = async () => {
    let sourceToScan: HTMLCanvasElement | string | null = null;

    if (ocrSourceType === 'pdf-page') {
      sourceToScan = canvasRef.current;
    } else {
      sourceToScan = externalImage;
    }

    if (!sourceToScan) {
      setStatusMessage('يرجى تحديد صفحة أو رفع صورة أولاً للتشغيل.');
      return;
    }

    setRunning(true);
    setExtractedResult('');
    setProgress(0);
    setStatusMessage('جاري تشغيل محرك التعرف على الحروف (Tesseract.js)...');

    try {
      const result = await performOcr(
        sourceToScan, 
        selectedLanguage, 
        (prog, msg) => {
          setProgress(Math.round(prog * 100));
          setStatusMessage(msg);
        }
      );
      
      setExtractedResult(result || 'لم نتمكن من العثور على أي نصوص واضحة في الصورة المحددة.');
      setStatusMessage('اكتمل التعرف على النصوص بنجاح!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`فشلت العملية: كود الخطأ أو الذاكرة ممتلئة.`);
    } finally {
      setRunning(false);
    }
  };

  // Upload custom file parser
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setExternalImage(event.target.result as string);
          setOcrSourceType('external-image');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = () => {
    if (!extractedResult) return;
    navigator.clipboard.writeText(extractedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = () => {
    if (!extractedResult) return;
    const blob = new Blob([extractedResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نصوص_مستخرجة_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/10 shadow-3xl max-w-7xl mx-auto min-h-[calc(100vh-140px)]">
      
      {/* Header section with Arab design guidelines */}
      <div className="bg-[#121212] rounded-xl p-5 border border-white/10 mb-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-650/10 flex items-center justify-center text-red-400 shadow-sm shrink-0">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white">التعرف على النصوص واستخراج الطوابع (OCR)</h2>
            <p className="text-xs text-gray-400">
              قم بتحويل الصور والصفحات الممسوحة ضوئياً إلى نصوص قابلة للنسخ والتعديل مباشرةً دون الحاجة لأدوات مدفوعة وبشكل مجاني بالكامل.
            </p>
          </div>
        </div>

        {/* Engine Config options */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-[#0a0a0a] p-1 rounded-lg border border-white/10">
            <button
              onClick={() => {
                if (arrayBuffer) setOcrSourceType('pdf-page');
              }}
              disabled={!arrayBuffer}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                ocrSourceType === 'pdf-page'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-400 disabled:opacity-50'
              }`}
            >
              صفحة من الـ PDF الحالي
            </button>
            <button
              onClick={() => setOcrSourceType('external-image')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                ocrSourceType === 'external-image'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-400'
              }`}
            >
              صورة خارجية (JPG/PNG)
            </button>
          </div>

          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as any)}
            className="text-xs border border-white/10 bg-[#121212] p-2 rounded-lg font-bold text-white focus:outline-red-500"
          >
            <option value="ara+eng" className="bg-[#121212] text-white">عربي + إنجليزي (تلقائي)</option>
            <option value="ara" className="bg-[#121212] text-white">اللغة العربية فقط</option>
            <option value="eng" className="bg-[#121212] text-white">اللغة الإنجليزية فقط</option>
          </select>
        </div>
      </div>

      {/* Main Two-column Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Viewer/Input Source */}
        <div className="lg:col-span-6 bg-[#121212] rounded-xl p-5 border border-white/10 shadow-2xl flex flex-col justify-between min-h-[480px]">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">مصدر الصورة للاستخراج</h3>

            {ocrSourceType === 'pdf-page' && arrayBuffer ? (
              <div className="flex items-center gap-3 mb-4 bg-[#0a0a0a] p-2.5 rounded-lg border border-white/5 font-sans">
                <span className="text-xs font-medium text-gray-300">اختر الصفحة المطلوب فحصها:</span>
                <select
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(Number(e.target.value))}
                  className="text-xs border border-white/10 bg-[#121212] text-white p-1 rounded-md font-mono focus:outline-red-500"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      الصفحة رقم {i + 1}
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-gray-500 font-medium">سريعة ومعاينة عالية الجودة</div>
              </div>
            ) : ocrSourceType === 'external-image' ? (
              <div className="mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-xl p-5 text-center cursor-pointer bg-red-650/10 hover:bg-red-655/15 transition-all text-white animate-pulse"
                >
                  <Upload className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-gray-200 block mb-1">انقر لرفع صورة من جهازك</span>
                  <span className="text-[10px] text-gray-500 block font-mono">يدعم ملفات PNG, JPG, JPEG, WEBP</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            ) : null}

            {/* Renderer Frame */}
            <div className="bg-[#0a0a0a] rounded-lg p-3 flex justify-center items-center min-h-[300px] overflow-hidden max-h-[400px] overflow-y-auto border border-white/10">
              {ocrSourceType === 'pdf-page' && arrayBuffer ? (
                <canvas ref={canvasRef} className="max-w-full h-auto rounded-md shadow-2xl" />
              ) : ocrSourceType === 'external-image' && externalImage ? (
                <img src={externalImage} className="max-w-full max-h-[350px] object-contain rounded-md" alt="Uploaded OCR source" />
              ) : (
                <div className="text-center p-6 text-gray-500">
                  <FileImage className="w-10 h-10 text-gray-655 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">لم يتم رفع أو اختيار أي مستند بعد للعرض الرقمي.</p>
                </div>
              )}
            </div>
          </div>

          {/* Trigger scan action */}
          <div className="mt-4 pt-4 border-t border-white/5 font-sans">
            <button
              onClick={startOcrProcessing}
              id="btn-ocr-run"
              disabled={running || (ocrSourceType === 'external-image' && !externalImage)}
              className={`w-full py-3 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                running
                  ? 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed border border-white/5 shadow-none'
                  : 'bg-red-600 hover:bg-red-750 text-white shadow-red-955/20'
              }`}
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري معالجة الفحص والاستخراج...</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>ابدأ استخراج النصوص الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Output Results and text corrector */}
        <div className="lg:col-span-6 bg-[#121212] rounded-xl p-5 border border-white/10 shadow-2xl flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">النصوص المستخرجة (تحرير ونسخ)</h3>
              
              <div className="flex gap-1">
                {extractedResult && (
                  <>
                    <button
                      onClick={handleCopy}
                      id="btn-ocr-copy"
                      className="p-2 text-gray-300 hover:text-red-400 hover:bg-white/5 rounded-lg border border-white/10 bg-[#0a0a0a] transition-colors cursor-pointer"
                      title="نسخ النص"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-red-500 font-bold" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={downloadTextFile}
                      id="btn-ocr-download"
                      className="p-2 text-gray-300 hover:text-red-400 hover:bg-white/5 rounded-lg border border-white/10 bg-[#0a0a0a] transition-colors cursor-pointer"
                      title="تحميل كملف نصي"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* OCR log bar or real-time progress runner */}
            {running && (
              <div className="mb-4 bg-red-650/10 border border-red-500/10 rounded-xl p-4 animate-pulse font-sans">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-red-355">{statusMessage}</span>
                  <span className="text-xs font-mono font-bold text-red-355">{progress}%</span>
                </div>
                <div className="w-full bg-red-950/40 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full transition-all duration-350" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-[10px] text-red-400 mt-1.5 text-right font-medium">التعرف على المستند يتم بالكامل على خادم المتصفح الفرعي دون رفع ملفاتك لأي خادم لضمان أمان خصوصيتك وخالٍ من الرسوم.</p>
              </div>
            )}

            {/* Textarea frame */}
            <textarea
              value={extractedResult}
              onChange={(e) => setExtractedResult(e.target.value)}
              placeholder="ستظهر النصوص المستخرجة التي تم التعرف عليها هنا. يمكنك التعديل عليها مباشرة بعد اكتمال التحليل أو كتابة نصوص إضافية."
              className="w-full h-[320px] p-4 text-sm text-white bg-[#0a0a0a] border border-white/10 rounded-lg focus:bg-[#070707] focus:outline-red-500 focus:ring-1 focus:ring-red-500 resize-none leading-relaxed transition-all"
            />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-sans">
            <div className="flex items-center gap-1 font-semibold text-red-400/80">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>خصوصية تامة - فحص محلي 100%</span>
            </div>
            <span>نقلة PDF - مجاني وبدون قيود</span>
          </div>
        </div>

      </div>

    </div>
  );
}
