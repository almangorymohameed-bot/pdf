import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { createWorker } from 'tesseract.js';

// Access the global pdf.js which is loaded via CDN in index.html
declare const window: any;

let workerBlobUrl: string | null = null;

export function initPdfWorker() {
  if (typeof window === 'undefined') return null;
  if (workerBlobUrl) return workerBlobUrl;

  try {
    const cdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const code = `importScripts("${cdnUrl}");`;
    const blob = new Blob([code], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;
    }
    return workerBlobUrl;
  } catch (err) {
    console.error('Failed to initialize inline PDFJS worker:', err);
    return null;
  }
}

export function getPdfjs() {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const bUrl = initPdfWorker();
      pdfjs.GlobalWorkerOptions.workerSrc = bUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return pdfjs;
  }
  return null;
}

/**
 * Utility to process OCR on an image URL or canvas element.
 * Supports progress updates.
 */
export async function performOcr(
  imageSource: string | HTMLCanvasElement,
  language: 'ara' | 'eng' | 'ara+eng' = 'ara+eng',
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  const worker = await createWorker('ara+eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress?.(m.progress, 'جاري التعرف على النصوص...');
      } else {
        onProgress?.(m.progress * 0.1, 'جاري تهيئة محرك القراءة للملف...');
      }
    }
  });

  try {
    const res = await worker.recognize(imageSource);
    return res.data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Converts multiple images to a single PDF using pdf-lib.
 */
export async function convertImagesToPdf(
  images: { dataUrl: string; name: string }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    const page = pdfDoc.addPage();
    const { width: pWidth, height: pHeight } = page.getSize();

    // Load image
    const imageBytes = await fetch(img.dataUrl).then((r) => r.arrayBuffer());
    let embeddedImg;

    if (img.dataUrl.includes('image/png')) {
      embeddedImg = await pdfDoc.embedPng(imageBytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imageBytes);
    }

    // Scale image to fit page maintaining aspect ratio
    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;
    const ratio = Math.min(pWidth / imgWidth, pHeight / imgHeight);

    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    const x = (pWidth - scaledWidth) / 2;
    const y = (pHeight - scaledHeight) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Converts a text content to a clean, readable PDF using Canvas snapshot path,
 * which perfectly supports any language (including gorgeous Cairo Arabic fonts) 
 * without needing extremely complex custom TTF glyph mappings.
 */
export async function convertTextToPdf(
  title: string,
  content: string
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Set highly detailed canvas for print quality (A4 aspect-ratio: 595 x 842 pt -> 1190 x 1684 px)
  canvas.width = 1200;
  canvas.height = 1600;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative header
  ctx.fillStyle = '#2563eb'; // blue-600
  ctx.fillRect(0, 0, canvas.width, 30);

  // Header Typography (Cairo style fallback)
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'right';
  ctx.font = 'bold 36px "Cairo", sans-serif';
  ctx.fillText(title, canvas.width - 80, 100);

  // Subtitle/date
  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Cairo", sans-serif';
  const today = new Date().toLocaleDateString('ar-EG');
  ctx.fillText(`تاريخ التصدير: ${today}`, canvas.width - 80, 150);

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 180);
  ctx.lineTo(canvas.width - 80, 180);
  ctx.stroke();

  // Content rendering with word-wrapping
  ctx.fillStyle = '#334155';
  ctx.font = '24px "Cairo", sans-serif';
  ctx.textAlign = 'right';

  const words = content.split(' ');
  let line = '';
  const x = canvas.width - 80;
  let y = 240;
  const maxWidth = canvas.width - 160;
  const lineHeight = 42;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? words[i] + ' ' + line : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }

    // Handle newlines
    if (words[i].includes('\n')) {
      ctx.fillText(line, x, y);
      line = '';
      y += lineHeight * 1.5;
    }
  }
  // Fill remainders
  if (line) {
    ctx.fillText(line, x, y);
  }

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '16px "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('تم التصدير بواسطة منصة نقلة PDF الرقمية', canvas.width / 2, canvas.height - 80);

  // Convert canvas to image bytes and embed into pdf-lib
  const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const pdfBytes = await convertImagesToPdf([{ dataUrl: imgDataUrl, name: 'document.pdf' }]);
  return pdfBytes;
}

/**
 * Applies professional editing operations (Rotations, deletions, order shifts) on a PDF
 * and appends additions like handwritten signatures, highlights and dynamic annotations.
 * All processed fully key-safe, offline and client-side.
 */
export async function applyPdfEdits(
  originalBuffer: ArrayBuffer,
  pagesState: { pageNumber: number; rotation: number; isDeleted: boolean }[],
  texts: Record<number, { text: string; x: number; y: number; fontSize: number; color: string }[]>,
  drawings: Record<number, { points: { x: number; y: number }[]; color: string; width: number; type: string }[]>
): Promise<Uint8Array> {
  // Load original PDF
  const pdfDoc = await PDFDocument.load(originalBuffer);
  const finalPdf = await PDFDocument.create();

  // Process pages that are not deleted
  for (let i = 0; i < pagesState.length; i++) {
    const state = pagesState[i];
    if (state.isDeleted) continue;

    // Copy original page
    const [copiedPage] = await finalPdf.copyPages(pdfDoc, [state.pageNumber - 1]);
    const { width, height } = copiedPage.getSize();

    // Apply rotation increment
    if (state.rotation !== 0) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + state.rotation) % 360));
    }

    // Embed local annotations to this copy
    const pageTexts = texts[state.pageNumber] || [];
    for (const txt of pageTexts) {
      // Direct relative placement
      // Translate percentages to PDF size
      const pdfX = (txt.x / 100) * width;
      // Note: PDF coordinate system starts at bottom-left, so we invert Y percent
      const pdfY = ((100 - txt.y) / 100) * height;

      // Hex to RGB conversion helper
      const r = parseInt(txt.color.substring(1, 3), 16) / 255 || 0;
      const g = parseInt(txt.color.substring(3, 5), 16) / 255 || 0;
      const b = parseInt(txt.color.substring(5, 7), 16) / 255 || 0;

      // For standard Latin/numbers, drawText directly. 
      // If we contain Arabic, we'll draw it on the client canvas anyway and export.
      // But to support plain standard text additions directly on the PDF node:
      try {
        copiedPage.drawText(txt.text, {
          x: pdfX,
          y: pdfY,
          size: txt.fontSize || 16,
          color: rgb(r, g, b),
        });
      } catch (err) {
        console.warn('Fallback drawing text: ', err);
      }
    }

    // Embed handwritten strokes
    const pageDrawings = drawings[state.pageNumber] || [];
    for (const draw of pageDrawings) {
      if (draw.points.length < 2) continue;

      const r = parseInt(draw.color.substring(1, 3), 16) / 255 || 0;
      const g = parseInt(draw.color.substring(3, 5), 16) / 255 || 0;
      const b = parseInt(draw.color.substring(5, 7), 16) / 255 || 0;

      for (let pIdx = 1; pIdx < draw.points.length; pIdx++) {
        const start = draw.points[pIdx - 1];
        const end = draw.points[pIdx];

        // Draw line segments
        const startX = (start.x / 100) * width;
        const startY = ((100 - start.y) / 100) * height;
        const endX = (end.x / 100) * width;
        const endY = ((100 - end.y) / 100) * height;

        copiedPage.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness: draw.width,
          color: rgb(r, g, b),
          opacity: draw.type === 'highlight' ? 0.4 : 1.0,
        });
      }
    }

    finalPdf.addPage(copiedPage);
  }

  return await finalPdf.save();
}
