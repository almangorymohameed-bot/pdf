import React, { useState, useRef } from 'react';
import { 
  FileDown, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Trash2, 
  Check, 
  RefreshCw, 
  Download, 
  FileUp, 
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { convertImagesToPdf, convertTextToPdf, getPdfjs } from '../utils/pdfHelpers';

export default function PdfConverter() {
  const [activeTool, setActiveTool] = useState<'img2pdf' | 'text2pdf' | 'pdf2img' | 'pdf2txt'>('img2pdf');
  const [copiedTxt, setCopiedTxt] = useState(false);
  
  // 1. Images to PDF State
  const [uploadedImages, setUploadedImages] = useState<{ id: string; dataUrl: string; name: string; size: string }[]>([]);
  const [isGeneratingImgPdf, setIsGeneratingImgPdf] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 2. Text to PDF State
  const [txtTitle, setTxtTitle] = useState('مستند جديد مصمم عبر نقلة PDF');
  const [txtContent, setTxtContent] = useState('');
  const [isGeneratingTxtPdf, setIsGeneratingTxtPdf] = useState(false);

  // 3. PDF to Images State
  const [pdfForImages, setPdfForImages] = useState<ArrayBuffer | null>(null);
  const [pdfForImagesName, setPdfForImagesName] = useState('');
  const [renderedPages, setRenderedPages] = useState<string[]>([]);
  const [isRenderingPdfImages, setIsRenderingPdfImages] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // 4. PDF to Text State
  const [pdfForText, setPdfForText] = useState<ArrayBuffer | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState('');
  const [isExtractingText, setIsExtractingText] = useState(false);
  const pdfTextInputRef = useRef<HTMLInputElement>(null);

  // Global action handlers
  
  // Img2Pdf upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [
            ...prev,
            {
              id: Math.random().toString(),
              dataUrl: event.target!.result as string,
              name: file.name,
              size: (file.size / 1024).toFixed(1) + ' KB'
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleImgToPdfSubmit = async () => {
    if (uploadedImages.length === 0) return;
    setIsGeneratingImgPdf(true);
    try {
      const pdfBytes = await convertImagesToPdf(uploadedImages);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `صور_محولة_${new Date().getTime()}.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImgPdf(false);
    }
  };

  // Text2Pdf submit
  const handleTextToPdfSubmit = async () => {
    if (!txtContent.trim()) return;
    setIsGeneratingTxtPdf(true);
    try {
      const pdfBytes = await convertTextToPdf(txtTitle, txtContent);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${txtTitle}.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingTxtPdf(false);
    }
  };

  // PDF to Images conversion
  const handlePdfForImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfForImagesName(file.name);
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          setPdfForImages(event.target.result as ArrayBuffer);
          setRenderedPages([]);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const executePdfToImages = async () => {
    const pdfjs = getPdfjs();
    if (!pdfjs || !pdfForImages) return;

    setIsRenderingPdfImages(true);
    setRenderedPages([]);

    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfForImages) }).promise;
      const imagesList: string[] = [];

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          imagesList.push(canvas.toDataURL('image/jpeg', 0.9));
        }
      }
      setRenderedPages(imagesList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenderingPdfImages(false);
    }
  };

  // PDF to Text extraction
  const handlePdfForTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          setPdfForText(event.target.result as ArrayBuffer);
          setExtractedPdfText('');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const executePdfToText = async () => {
    const pdfjs = getPdfjs();
    if (!pdfjs || !pdfForText) return;

    setIsExtractingText(true);
    setExtractedPdfText('');

    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfForText) }).promise;
      let outputText = '';

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const tokens = await page.getTextContent();
        const pageStr = tokens.items.map((token: any) => token.str).join(' ');
        outputText += `\n--- الصفحة ${pageNum} ---\n${pageStr}\n`;
      }
      setExtractedPdfText(outputText.trim() || 'لم نتمكن من استخراج أي طبقة نصية مباشرة من هذا الملف.');
    } catch (err) {
      console.error(err);
      setExtractedPdfText('حدث خطأ أثناء تنزيل أو معالجة الطبقة النصية.');
    } finally {
      setIsExtractingText(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/10 shadow-3xl max-w-7xl mx-auto min-h-[calc(100vh-140px)]">
      
      {/* Visual Navigation Tabs for Different Tools */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 font-sans">
        {[
          { key: 'img2pdf', title: 'من صور إلى PDF', desc: 'تحويل الصور لملف PDF واحد' },
          { key: 'text2pdf', title: 'من نصوص إلى PDF', desc: 'تنسيق فقرات عربية لملف PDF' },
          { key: 'pdf2img', title: 'من PDF إلى صور', desc: 'تفريغ صفحات PDF كصور منفردة' },
          { key: 'pdf2txt', title: 'فك نصوص الـ PDF', desc: 'استخراج نصوص المستند الرقمية' }
        ].map(tool => (
          <button
            key={tool.key}
            onClick={() => setActiveTool(tool.key as any)}
            className={`flex flex-col items-center justify-center text-center p-4 rounded-xl border transition-all cursor-pointer ${
              activeTool === tool.key
                ? 'bg-red-600 border-red-500 text-white shadow-xl scale-102 font-bold'
                : 'bg-[#121212] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span className={`text-xs font-bold ${activeTool === tool.key ? 'text-white' : 'text-gray-300'}`}>{tool.title}</span>
            <span className={`text-[10px] mt-1 ${activeTool === tool.key ? 'text-white/85' : 'text-gray-500'}`}>{tool.desc}</span>
          </button>
        ))}
      </div>

      {/* Main Tool Render Context */}
      <div className="bg-[#121212] rounded-xl border border-white/10 shadow-2xl p-6 min-h-[400px] flex flex-col justify-between">
        
        {/* 1. Images to PDF Tool */}
        {activeTool === 'img2pdf' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-sm">تحويل الصور إلى ملف PDF مدمج</h3>
              <p className="text-xs text-gray-400">ارفع مجموعة من الصور (سكانر، تقارير، واجبات عمل) لدمجها في ملف PDF مرتب ونظيف.</p>
            </div>

            <div className="flex gap-4 items-stretch flex-col md:flex-row">
              <div 
                onClick={() => imageInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-xl p-8 text-center cursor-pointer transition-all bg-red-650/10 hover:bg-red-650/15 flex flex-col items-center justify-center min-h-[220px] text-white animate-pulse"
              >
                <Upload className="w-8 h-8 text-red-400 mb-2" />
                <span className="text-xs font-bold text-gray-200">اضغط لرفع واختيار صور التقرير (JPG/PNG)</span>
                <span className="text-[10px] text-gray-500 mt-1 uppercase font-mono">يدعم رفع ملفات متعددة دفعة واحدة</span>
                <input
                  type="file"
                  multiple
                  ref={imageInputRef}
                  onChange={handleImageSelect}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />
              </div>

              {uploadedImages.length > 0 && (
                <div className="w-full md:w-80 border border-white/10 bg-[#0a0a0a] rounded-xl p-4 max-h-[300px] overflow-y-auto">
                  <span className="text-[11px] font-bold text-gray-500 block mb-2 uppercase tracking-wider">الملفات الجاهزة للدمج ({uploadedImages.length})</span>
                  <div className="space-y-2">
                    {uploadedImages.map(img => (
                      <div key={img.id} className="flex items-center justify-between bg-[#121212] border border-white/5 p-2 rounded-lg text-xs text-white">
                        <div className="flex items-center gap-2 max-w-[70%]">
                          <ImageIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="truncate block font-medium font-mono text-[11px]">{img.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-500 font-mono italic">{img.size}</span>
                          <button
                            onClick={() => removeImage(img.id)}
                            className="p-1 text-red-500 hover:bg-red-505/10 rounded-sm cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between font-sans">
              <span className="text-[11px] text-gray-500">التنزيل يتم بالكامل محلياً ومجاناً.</span>
              <button
                onClick={handleImgToPdfSubmit}
                id="btn-convert-img2pdf"
                disabled={uploadedImages.length === 0 || isGeneratingImgPdf}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-750 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-lg"
              >
                {isGeneratingImgPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري معالجة وربط الكتل...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>توليد وتنزيل ملف الـ PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 2. Text to PDF Tool */}
        {activeTool === 'text2pdf' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-sm">تحويل النصوص المنسقة إلى مستند PDF احترافي</h3>
              <p className="text-xs text-gray-400">اكتب أو الصق نصوصك وملاحظاتك العربية هنا، وسنقوم بتوليد ملف PDF عالي الدقة يدعم خط Cairo الأنيق.</p>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">عنوان المستند</label>
                <input
                  type="text"
                  value={txtTitle}
                  onChange={(e) => setTxtTitle(e.target.value)}
                  placeholder="مثال: محضر الاجتماع الأسبوعي لشركة نقلة"
                  className="w-full p-2.5 border border-white/10 rounded-lg text-sm bg-[#0a0a0a] text-white focus:bg-[#070707] focus:outline-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">محتوى المستند والفقرات التفصيلية</label>
                <textarea
                  value={txtContent}
                  onChange={(e) => setTxtContent(e.target.value)}
                  placeholder="ابدأ بكتابة النصوص والمحتوى وسيقوم المحول بترتيب الهوامش والخط والتباعد تلقائياً لتظهر بأبهى مظهر مطبوع..."
                  className="w-full h-44 p-3.5 border border-white/10 rounded-lg text-sm bg-[#0a0a0a] text-white focus:bg-[#070707] focus:outline-red-500 focus:ring-1 focus:ring-red-500 resize-none leading-relaxed transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between font-sans">
              <span className="text-[11px] text-gray-500">يدعم تنسيق تباعد الأسطر التلقائي للمتن والمقالات.</span>
              <button
                onClick={handleTextToPdfSubmit}
                id="btn-convert-txt2pdf"
                disabled={!txtContent.trim() || isGeneratingTxtPdf}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-750 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-lg"
              >
                {isGeneratingTxtPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري صياغة قوالب المستند...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>صناعة المستند وتنزيله الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 3. PDF to Images Tool */}
        {activeTool === 'pdf2img' && (
          <div className="space-y-4 font-sans">
            <div>
              <h3 className="font-bold text-white text-sm">تفكيك مستند PDF إلى صور مستقلة</h3>
              <p className="text-xs text-gray-400">قم برفع أي ملف PDF لمشاهدة صفحاته مع إمكانية تنزيل كل صفحة كصورة بجودة عالية.</p>
            </div>

            <div className="flex gap-4 flex-col md:flex-row items-stretch">
              <div 
                onClick={() => pdfInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-xl p-8 text-center cursor-pointer transition-all bg-red-650/10 hover:bg-red-650/15 flex flex-col items-center justify-center min-h-[160px] text-white animate-pulse"
              >
                <FileUp className="w-8 h-8 text-red-500 mb-2" />
                <span className="text-xs font-bold text-gray-200">
                  {pdfForImagesName ? `مستعد: ${pdfForImagesName}` : 'انقر لرفع ملف الـ PDF للتفريغ'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1">تجهيز وتجزئة الصفحات بالكامل على جهازك</span>
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfForImagesUpload}
                  accept="application/pdf"
                  className="hidden"
                />
              </div>

              {pdfForImages && (
                <div className="self-center">
                  <button
                    onClick={executePdfToImages}
                    id="btn-convert-pdf2img-run"
                    disabled={isRenderingPdfImages}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-750 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg cursor-pointer transition-colors"
                  >
                    {isRenderingPdfImages ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري التقاط لقطات الصفحات...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>بدء تفريغ الصفحات</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {renderedPages.length > 0 && (
              <div className="mt-4 p-4 bg-[#0a0a0a] rounded-xl border border-white/10">
                <span className="text-xs font-bold text-gray-400 block mb-3">الصفحات المفككة بنجاح ({renderedPages.length}):</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {renderedPages.map((src, pageIdx) => (
                    <div key={pageIdx} className="bg-[#121212] p-3 border border-white/5 rounded-lg flex flex-col justify-between items-center relative group shadow-xl">
                      <img src={src} className="w-full aspect-[3/4] object-contain rounded border border-white/10 mb-2 shadow-2xl" alt={`صفحة ${pageIdx+1}`} />
                      <span className="text-[10px] font-bold text-gray-400 block mb-2">الصفحة {pageIdx + 1}</span>
                      <a 
                        href={src} 
                        download={`صفحة_${pageIdx+1}.jpg`}
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-[#0a0a0a] hover:bg-red-600 border border-white/10 text-gray-300 hover:text-white text-[10px] font-bold rounded-md transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل الصورة</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PDF to Text Tool */}
        {activeTool === 'pdf2txt' && (
          <div className="space-y-4 text-white">
            <div>
              <h3 className="font-bold text-white text-sm font-sans">استخلاص وتصفية الطبقات النصية من ملف الـ PDF</h3>
              <p className="text-xs text-gray-400 font-sans font-medium">قم برفع أي مستند PDF رقمي لاستخراج جميع الكتل والنصوص المكتوبة بداخله بطريقة فائقة السرعة.</p>
            </div>

            <div className="flex gap-4 flex-col lg:flex-row items-stretch">
              <div className="flex-1 flex flex-col justify-between bg-[#0a0a0a] border border-white/10 p-5 rounded-xl font-sans">
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-3 uppercase">ملف المدخلات الرئيسي</span>
                  <div 
                    onClick={() => pdfTextInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-xl p-8 text-center cursor-pointer transition-all bg-[#121212] hover:bg-red-650/10 text-white animate-pulse"
                  >
                    <Upload className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-gray-250 block">انقر لتحديد ملف الـ PDF</span>
                    <input
                      type="file"
                      ref={pdfTextInputRef}
                      onChange={handlePdfForTextUpload}
                      accept="application/pdf"
                      className="hidden"
                    />
                  </div>
                </div>

                {pdfForText && (
                  <button
                    onClick={executePdfToText}
                    id="btn-convert-pdf2txt-run"
                    disabled={isExtractingText}
                    className="w-full mt-4 py-3 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                  >
                    {isExtractingText ? 'جاري فك الترميز الهيكلي...' : 'فك وتحليل النص كاملاً'}
                  </button>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-2 uppercase font-sans">مخرجات مصفاة النصوص</span>
                  <textarea
                    value={extractedPdfText}
                    readOnly
                    placeholder="ستظهر الكتل النصية المنقحة هنا فور انتهائك من الفحص..."
                    className="w-full h-52 p-3 border border-white/10 rounded-lg text-xs text-white bg-[#0a0a0a] resize-none font-mono focus:outline-none"
                  />
                </div>

                {extractedPdfText && (
                  <div className="relative font-sans">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(extractedPdfText);
                        setCopiedTxt(true);
                        setTimeout(() => setCopiedTxt(false), 2000);
                      }}
                      className="w-full py-2.5 mt-2 bg-[#0a0a0a] hover:bg-red-600 border border-white/10 hover:border-red-500/30 text-white hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedTxt ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>تم نسخ النص بالكامل!</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>نسخ النص كاملاً للحافظة</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
