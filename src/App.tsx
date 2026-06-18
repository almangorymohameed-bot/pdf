import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  ShieldCheck, 
  Cpu, 
  Eye, 
  Settings, 
  BookOpen, 
  CornerDownLeft, 
  HelpCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { AppDocument, PageState, DrawingPath, TextAnnotation } from './types';
import { getPdfjs, applyPdfEdits, convertTextToPdf, initPdfWorker } from './utils/pdfHelpers';
import Toolbar from './components/Toolbar';
import PdfReader from './components/PdfReader';
import ReadingMode from './components/ReadingMode';
import PageOrganizer from './components/PageOrganizer';
import OcrEngine from './components/OcrEngine';
import PdfConverter from './components/PdfConverter';

export default function App() {
  const [loadedDoc, setLoadedDoc] = useState<AppDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'read' | 'edit-layout' | 'ocr' | 'convert'>('read');
  
  // Custom document annotations & modifications states
  const [pagesState, setPagesState] = useState<PageState[]>([]);
  const [drawings, setDrawings] = useState<Record<number, DrawingPath[]>>({});
  const [texts, setTexts] = useState<Record<number, TextAnnotation[]>>({});
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize PDF.js globally on load
  useEffect(() => {
    getPdfjs();
    initPdfWorker();
  }, []);

  // Process standard PDF uploaded file
  const handlePdfUpload = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const pdfjs = getPdfjs();
      if (!pdfjs) {
        alert('أداة قراءة الـ PDF غير متوفرة حالياً، يرجى إعادة المحاولة.');
        setLoading(false);
        return;
      }

      try {
        const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const total = doc.numPages;

        // Initialize state mappings
        const initialPages: PageState[] = Array.from({ length: total }, (_, i) => ({
          pageNumber: i + 1,
          rotation: 0,
          isDeleted: false,
          originalIndex: i
        }));

        setLoadedDoc({
          name: file.name,
          size: file.size,
          fileData: file,
          arrayBuffer,
          totalPages: total
        });
        setPagesState(initialPages);
        setDrawings({});
        setTexts({});
        setActiveTab('read');
      } catch (err) {
        console.error(err);
        alert('فشل قراءة الملف. يرجى التأكد من أنه ملف PDF سليم وغير محمي بكلمة مرور.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfUpload(file);
  };

  // Pre-load a demo document for user playground testing
  const loadDemoDoc = async () => {
    setLoading(true);
    try {
      const title = 'عقد شراكة واستخدام - منصة نقلة الرقمية التجريبية';
      const content = `مرحباً بك في المستند التجريبي المدمج لمنصة نقلة PDF! \n\nهذا الملف تم توليده وتشكيله بالكامل محلياً داخل متصفحك ليتيح لك تجربة وتدريب جميع الأدوات المتاحة مجاناً وبسهولة. \n\nتفاصيل المستند والشروط: \n١. تتيح لك منصة نقلة التعديل ومسح الصفحات وتدويرها في الحال. \n٢. يمكنك استخدام قلم التوقيع الذكي في لوحة التعديل من أجل توقيع هذا المستند يدوياً باللون والسمك الذي تفضله. \n٣. تتيح لك لوحة وضع القراءة المحترف تشغيل القراءة الصوتية باللغة التي تختارها لتستمع لنصوص صفحات هذا الملف بطلاقة وبدون تكاليف ذكاء اصطناعي مدفوعة. \n٤. جميع النصوص والمستندات يتم فحصها بشكل خاص بالكامل على جهازك الشخصي ولا يتم إرسالها لأي جهة خارجية للحفاظ على أمان وخصوصية بياناتك وسريتها المطلقة.\n\nنتمنى لك تجربة ممتعة ومثمرة في تصفح وتعديل مستنداتك اليوم مع منصة نقلة PDF الرقمية!`;

      const demoBytes = await convertTextToPdf(title, content);
      const pdfjs = getPdfjs();
      if (!pdfjs) throw new Error('PDF.js loading failed');

      const doc = await pdfjs.getDocument({ data: demoBytes }).promise;
      const total = doc.numPages;

      const initialPages: PageState[] = Array.from({ length: total }, (_, i) => ({
        pageNumber: i + 1,
        rotation: 0,
        isDeleted: false,
        originalIndex: i
      }));

      setLoadedDoc({
        name: 'نقلة_مستند_تجريبي.pdf',
        size: demoBytes.byteLength,
        arrayBuffer: demoBytes.buffer,
        totalPages: total
      });
      setPagesState(initialPages);
      setDrawings({});
      setTexts({});
      setActiveTab('read');
    } catch (err) {
      console.error(err);
      alert('تعذر تحميل الملف التجريبي في الوقت الحالي.');
    } finally {
      setLoading(false);
    }
  };

  // Compile and download document with local user edits
  const handleCompileAndDownload = async () => {
    if (!loadedDoc) return;
    setSaving(true);
    try {
      const editedBytes = await applyPdfEdits(
        loadedDoc.arrayBuffer,
        pagesState,
        texts,
        drawings
      );

      const blob = new Blob([editedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `نقلة_معدل_${loadedDoc.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('تعذر تطبيق التعديلات على بنية هذا الملف. يرجى مراجعة الصلاحيات.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إغلاق المستند الحالي والبدء بمستند جديد؟ ستفقد التعديلات غير المحفوظة.')) {
      setLoadedDoc(null);
      setPagesState([]);
      setDrawings({});
      setTexts({});
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col font-sans transition-all">
      
      {/* Dynamic Toolbar */}
      <Toolbar 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
        hasDocument={!!loadedDoc}
        onDownload={handleCompileAndDownload}
        onReset={handleReset}
        documentName={loadedDoc?.name}
      />

      {/* Main Container Stage */}
      <main className="flex-1 py-8 px-4">
        {loading ? (
          <div className="max-w-md mx-auto text-center bg-[#121212] p-8 rounded-2xl border border-white/10 shadow-2xl mt-12 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-red-650 animate-spin"></div>
            <div>
              <h3 className="font-bold text-white text-base">جاري قراءة وتحليل المستند...</h3>
              <p className="text-xs text-gray-400 mt-1">يتم الفحص والتحليل محلياً 100% لضمان أمان خصوصيتك.</p>
            </div>
          </div>
        ) : !loadedDoc ? (
          
          /* Visual Landing and Welcome Dashboard (RTL & elegant Arabic layout) */
          <div className="max-w-4xl mx-auto space-y-10">
            
            {/* Main Welcome Hero Panel */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">
                <Sparkles className="w-3.5 h-3.5 text-red-550" />
                <span>القارئ والمحرر الرقمي الذكي والمجاني بالكامل</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                اقرأ وعدّل مستنداتك باحترافية مع <span className="text-red-500 font-black">منصة نقلة</span>
              </h2>
              <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">
                حلول رقمية متكاملة لملفات PDF دون الحاجة لرفع مستنداتك الهامة لخوادم خارجية، أو استخدام كروت بنكية أو أدوات ذكاء اصطناعي مدفوعة.
              </p>
            </div>

            {/* Drop Container Zone */}
            <div className="bg-[#121212] rounded-2xl border border-white/10 shadow-2xl p-8 sm:p-12 relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-red-600"></div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-red-500 rounded-xl p-8 sm:p-12 text-center cursor-pointer bg-[#0e0e0e]/50 hover:bg-red-500/5 hover:scale-[1.01] transition-all duration-300 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-550 flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform duration-300 border border-red-500/10">
                  <Upload className="w-7 h-7" />
                </div>
                
                <h3 className="text-base font-bold text-white">اسحب وأفلت ملف PDF الخاص بك هنا</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">أو انقر لتصفح ملفات جهازك الشخصي للبدء في القراءة والتعديل</p>
                <span className="text-[10px] text-gray-500 mt-4 uppercase tracking-wider font-mono">يدعم ملفات PDF لغاية 100 ميجابايت</span>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="application/pdf"
                  className="hidden"
                />
              </div>

              {/* Instant sandbox demo doc option */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-right text-xs text-gray-400 font-medium font-sans">
                  لا تملك ملفاً حالياً؟ يمكنك تجربة جميع الخصائص فوراً عبر مستندنا التجريبي.
                </div>
                <button
                  onClick={loadDemoDoc}
                  id="btn-sandbox-demo"
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#1e1e1e] hover:bg-red-600 hover:text-white border border-white/10 text-gray-300 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <span>تصفح مستند تجريبي مبني مسبقاً</span>
                  <CornerDownLeft className="w-3.5 h-3.5 transform -scale-x-100" />
                </button>
              </div>
            </div>

            {/* Standalone conversion capabilities panel */}
            <div className="bg-[#121212] p-6 rounded-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-white text-sm">أدوات تحويل وصناعة المستندات المستقلة</h3>
                  <p className="text-[11px] text-gray-400">لا تتطلب رفع مستند PDF مسبق للتشغيل والتحويل.</p>
                </div>
                <button
                  onClick={() => {
                    // Create an empty dummy document context
                    setLoadedDoc({
                      name: 'محول_مستقل.pdf',
                      size: 0,
                      arrayBuffer: new ArrayBuffer(0),
                      totalPages: 0
                    });
                    setActiveTab('convert');
                  }}
                  id="btn-direct-converter"
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold transition-all cursor-pointer"
                >
                  <span>الدخول لجميع أدوات التحويل مباشرة</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Benefit pillars explaining strict privacy and zero-cost structure */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              
              <div className="bg-[#121212] p-5 rounded-xl border border-white/10 shadow-xl space-y-3">
                <div className="w-10 h-10 rounded-lg bg-red-650/10 text-red-400 flex items-center justify-center border border-red-500/10">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">خصوصية مشفرة محلياً 100%</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  تتم جميع أعمال قراءة وتوقيع وتعديل واستخراج ملفاتك داخل متصفحك الفرعي دون إرسالها لأي جهة تضمن سرية بياناتك.
                </p>
              </div>

              <div className="bg-[#121212] p-5 rounded-xl border border-white/10 shadow-xl space-y-3">
                <div className="w-10 h-10 rounded-lg bg-red-650/10 text-red-400 flex items-center justify-center border border-red-500/10">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">محرك OCR مجاني بالكامل</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  تفعيل خاصية التعرف على الحروف واستخراج النصوص الرقمية بدون قيود أو حدود وبطريقة معززة للملفات الممسوحة ضوئياً.
                </p>
              </div>

              <div className="bg-[#121212] p-5 rounded-xl border border-white/10 shadow-xl space-y-3">
                <div className="w-10 h-10 rounded-lg bg-red-650/10 text-red-400 flex items-center justify-center border border-red-500/10">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">أدوات تحويل وتوقيع مدمجة</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  إمكانية دمج الصور لـ PDF، كتابة وتنسيق المقالات وحفظها، وتوقيع العقود رقمياً ومسح الصفحات بضغطة زر.
                </p>
              </div>

            </div>

          </div>

        ) : (
          
          /* Active Document Tab Selector Stages */
          <div className="animate-fade-in duration-200">
            {activeTab === 'read' && (
              <div className="space-y-6">
                {/* Visual Mode selector */}
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
                  <div className="flex bg-[#121212] p-1 rounded-lg border border-white/10 gap-1 select-none">
                    <span className="text-[11px] font-bold text-gray-300 self-center px-3">مستكشف الوضع الحالي</span>
                  </div>
                  <div className="text-xs text-gray-400">تصفح بوضع الشاشة الكاملة ومكّن القلم من القائمة الجانبية للتوقيع الفوري.</div>
                </div>

                <PdfReader
                  arrayBuffer={loadedDoc.arrayBuffer}
                  totalPages={loadedDoc.totalPages}
                  drawings={drawings}
                  setDrawings={setDrawings}
                  texts={texts}
                  setTexts={setTexts}
                  onApplyEdits={handleCompileAndDownload}
                  saving={saving}
                />

                {/* Separater section for gorgeous continuous reading mode */}
                <div className="border-t border-white/10 py-6">
                  <div className="max-w-7xl mx-auto px-4 mb-4">
                    <h3 className="font-bold text-white text-lg">وضع القراءة المشتت للنصوص (تلقائي وصوت)</h3>
                    <p className="text-xs text-gray-400">مخصص لقرّاء المقالات والكتب لزيادة الإنتاجية وسهولة القراءة ليلاً.</p>
                  </div>
                  
                  <ReadingMode 
                    arrayBuffer={loadedDoc.arrayBuffer} 
                    totalPages={loadedDoc.totalPages} 
                  />
                </div>
              </div>
            )}

            {activeTab === 'edit-layout' && (
              <PageOrganizer
                arrayBuffer={loadedDoc.arrayBuffer}
                totalPages={loadedDoc.totalPages}
                pagesState={pagesState}
                setPagesState={setPagesState}
                onSaveEdits={handleCompileAndDownload}
                saving={saving}
              />
            )}

            {activeTab === 'ocr' && (
              <OcrEngine
                arrayBuffer={loadedDoc.arrayBuffer}
                totalPages={loadedDoc.totalPages}
              />
            )}

            {activeTab === 'convert' && (
              <PdfConverter />
            )}
          </div>

        )}
      </main>

      {/* Global Brand Footer */}
      <footer className="bg-[#0a0a0a] border-t border-white/10 py-6 mt-12 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-col gap-1.5 text-right sm:text-right">
            <div>© 2026 منصة نقلةPDF الرقمية. محمي بموجب شروط الخصوصية المحلية المشفرة.</div>
            <div className="text-[11px] text-gray-500 font-medium">تم تصميمة بواسطة عثمان المنقوري</div>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <span>مجاني للأبد %100</span>
            <span>-</span>
            <span>يدعم اللغة العربية والإنجليزية</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
