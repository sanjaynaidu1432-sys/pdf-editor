import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PageData, TextElement, EditOperation, ToolMode, PreviewVersion } from '../types';
import { Edit3, Check, X } from 'lucide-react';

// Configure local worker from public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PdfViewerProps {
  pdfBase64: string;
  editedPdfBase64?: string;
  pageData: PageData;
  currentPage: number;
  zoom: number;
  rotation: number;
  toolMode: ToolMode;
  previewVersion: PreviewVersion;
  selectedElement: TextElement | null;
  onSelectElement: (el: TextElement | null) => void;
  appliedEdits: EditOperation[];
  onApplyEdit: (edit: EditOperation) => void;
  onAddTextAtPoint: (point: { x: number; y: number; page: number }) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfBase64,
  editedPdfBase64,
  pageData,
  currentPage,
  zoom,
  rotation,
  toolMode,
  previewVersion,
  selectedElement,
  onSelectElement,
  appliedEdits,
  onApplyEdit,
  onAddTextAtPoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineText, setInlineText] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);

  // Determine which PDF source to render based on previewVersion
  const currentBase64 = previewVersion === 'edited' && editedPdfBase64 ? editedPdfBase64 : pdfBase64;

  // Render PDF page to canvas via PDF.js
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!currentBase64 || !canvasRef.current) return;

      try {
        setRenderError(null);
        const binaryString = atob(currentBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) return;

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        // Viewport scale
        const viewport = page.getViewport({ scale: zoom, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        setViewportSize({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (!isCancelled) {
          console.error('PDF render error:', err);
          setRenderError(err.message || 'Failed to render PDF page');
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [currentBase64, currentPage, zoom, rotation]);

  // Click on background in Add Text tool mode
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode !== 'addText' || !containerRef.current) return;

    // Check if clicked directly on overlay (not on existing element)
    if ((e.target as HTMLElement).dataset.elementBox) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    onAddTextAtPoint({
      x: Math.round(clickX),
      y: Math.round(clickY),
      page: currentPage - 1,
    });
  };

  const startInlineEdit = (el: TextElement, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = appliedEdits.find((ed) => ed.id === el.id);
    setInlineText(existing ? existing.new_text : el.text);
    setInlineEditingId(el.id);
    onSelectElement(el);
  };

  const commitInlineEdit = (el: TextElement) => {
    const editOp: EditOperation = {
      id: el.id,
      page: el.page,
      original_text: el.text,
      new_text: inlineText,
      bbox: el.bbox,
      origin: el.origin,
      font: el.font,
      size: el.size,
      color: el.color,
      fill_color: el.bg_color || '#ffffff',
      bold: el.bold,
      italic: el.italic,
      underline: false,
      align: 'left',
      isNew: false,
      appliedAt: new Date().toLocaleTimeString(),
    };
    onApplyEdit(editOp);
    setInlineEditingId(null);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-200/80 p-8 flex items-start justify-center relative select-none">
      <div
        ref={containerRef}
        onClick={handleOverlayClick}
        style={{
          width: viewportSize.width || 'auto',
          height: viewportSize.height || 'auto',
        }}
        className={`relative bg-white shadow-xl rounded-sm transition-all ${
          toolMode === 'addText' ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* PDF.js Render Canvas */}
        <canvas ref={canvasRef} className="block pointer-events-none" />

        {renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-rose-600 text-sm p-4">
            {renderError}
          </div>
        )}

        {/* Interactive Text Overlay Layer */}
        {previewVersion !== 'original' && (
          <div
            className="absolute inset-0 pointer-events-auto"
            data-overlay="true"
          >
            {pageData.elements.map((el) => {
              const isSelected = selectedElement?.id === el.id;
              const isHovered = hoveredElementId === el.id;
              const existingEdit = appliedEdits.find((e) => e.id === el.id);
              const isEdited = !!existingEdit;
              const isInlineEditing = inlineEditingId === el.id;

              // Convert coordinates to scaled pixels
              const left = el.bbox[0] * zoom;
              const top = el.bbox[1] * zoom;
              const width = Math.max((el.bbox[2] - el.bbox[0]) * zoom, 12);
              const height = Math.max((el.bbox[3] - el.bbox[1]) * zoom, 10);

              const overlayBgColor =
                existingEdit?.fill_color && existingEdit.fill_color !== 'transparent'
                  ? existingEdit.fill_color
                  : el.bg_color || '#ffffff';

              return (
                <div
                  key={el.id}
                  data-element-box="true"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: isEdited ? 'auto' : `${width}px`,
                    minWidth: `${width}px`,
                    height: `${height}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement(el);
                  }}
                  onDoubleClick={(e) => startInlineEdit(el, e)}
                  onMouseEnter={() => setHoveredElementId(el.id)}
                  onMouseLeave={() => setHoveredElementId(null)}
                  title={`${el.text} (${el.font}, ${el.size}pt)`}
                  className={`absolute group cursor-pointer transition-all ${
                    isInlineEditing
                      ? 'z-30'
                      : isSelected
                      ? 'z-20 ring-2 ring-blue-600 bg-blue-100/30'
                      : isEdited
                      ? 'z-10 ring-1.5 ring-emerald-600 bg-emerald-50/40'
                      : isHovered
                      ? 'z-10 ring-1 ring-blue-400 bg-blue-50/30'
                      : 'hover:ring-1 hover:ring-blue-300'
                  }`}
                >
                  {/* If text was edited, show live preview layer directly over the original with matching background */}
                  {isEdited && !isInlineEditing && (
                    <div
                      className="absolute inset-0 flex items-center px-0.5 rounded-xs"
                      style={{
                        backgroundColor: overlayBgColor,
                        color: existingEdit.color || el.color,
                        fontFamily: existingEdit.font || el.font,
                        fontSize: `${(existingEdit.size || el.size) * zoom}px`,
                        fontWeight: existingEdit.bold ? 'bold' : 'normal',
                        fontStyle: existingEdit.italic ? 'italic' : 'normal',
                        textDecoration: existingEdit.underline ? 'underline' : 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {existingEdit.new_text}
                    </div>
                  )}

                  {/* Inline text edit input if active */}
                  {isInlineEditing && (
                    <div
                      className="absolute left-0 top-0 bg-white shadow-xl rounded-md border-2 border-blue-600 p-1 flex items-center gap-1 z-40 min-w-[220px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={inlineText}
                        onChange={(e) => setInlineText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitInlineEdit(el);
                          if (e.key === 'Escape') setInlineEditingId(null);
                        }}
                        autoFocus
                        className="p-1 text-xs border border-slate-200 rounded text-slate-900 focus:outline-hidden flex-1 font-medium"
                      />
                      <button
                        onClick={() => commitInlineEdit(el)}
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="Commit Edit"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setInlineEditingId(null)}
                        className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Selection Badge */}
                  {isSelected && !isInlineEditing && (
                    <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 pointer-events-none whitespace-nowrap">
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>{el.font} • {el.size}pt</span>
                    </div>
                  )}

                  {/* Edited Badge */}
                  {isEdited && !isSelected && !isInlineEditing && (
                    <div className="absolute -top-2.5 -right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
