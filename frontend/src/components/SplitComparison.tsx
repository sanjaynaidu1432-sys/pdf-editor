import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { EditOperation } from '../types';
import { Columns, CheckCircle2, Loader2 } from 'lucide-react';

interface SplitComparisonProps {
  originalPdfBase64: string;
  editedPdfBase64?: string;
  currentPage: number;
  zoom: number;
  rotation: number;
  appliedEdits: EditOperation[];
  onClose: () => void;
  isSaving?: boolean;
}

export const SplitComparison: React.FC<SplitComparisonProps> = ({
  originalPdfBase64,
  editedPdfBase64,
  currentPage,
  zoom,
  rotation,
  appliedEdits,
  onClose,
  isSaving,
}) => {
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  const renderSingle = async (
    base64Data: string,
    canvas: HTMLCanvasElement | null
  ) => {
    if (!base64Data || !canvas) return;
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: zoom * 0.9, rotation });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;
    } catch (e) {
      console.error('Error rendering comparison canvas:', e);
    }
  };

  useEffect(() => {
    renderSingle(originalPdfBase64, leftCanvasRef.current);
    renderSingle(editedPdfBase64 || originalPdfBase64, rightCanvasRef.current);
  }, [originalPdfBase64, editedPdfBase64, currentPage, zoom, rotation]);

  // Synchronized scrolling
  const handleScroll = (source: 'left' | 'right') => (e: React.UIEvent<HTMLDivElement>) => {
    const target = source === 'left' ? rightContainerRef.current : leftContainerRef.current;
    if (target) {
      target.scrollTop = e.currentTarget.scrollTop;
      target.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-900 overflow-hidden select-none">
      {/* Top Bar Banner */}
      <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <Columns className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-white">Side-by-Side Comparison</span>
          <span className="text-slate-400">|</span>
          <span>Page {currentPage}</span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-400 font-medium">
            {appliedEdits.length} modification{appliedEdits.length === 1 ? '' : 's'} verified
          </span>
          {isSaving && (
            <span className="flex items-center gap-1 text-amber-300 text-[11px] ml-2 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing vector changes...
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded transition"
        >
          Exit Split View
        </button>
      </div>

      {/* Synchronized Split Panels */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-slate-700 overflow-hidden">
        {/* Left Side: Original */}
        <div
          ref={leftContainerRef}
          onScroll={handleScroll('left')}
          className="overflow-auto p-6 flex flex-col items-center bg-slate-800/60 relative"
        >
          <div className="sticky top-0 z-20 mb-4 bg-slate-900/90 backdrop-blur-xs text-slate-200 border border-slate-700 text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Original Document (Untouched)
          </div>

          <div className="relative shadow-2xl bg-white rounded-sm">
            <canvas ref={leftCanvasRef} className="block" />
          </div>
        </div>

        {/* Right Side: Edited */}
        <div
          ref={rightContainerRef}
          onScroll={handleScroll('right')}
          className="overflow-auto p-6 flex flex-col items-center bg-slate-800/60 relative"
        >
          <div className="sticky top-0 z-20 mb-4 bg-emerald-950/90 backdrop-blur-xs text-emerald-300 border border-emerald-700 text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Edited Document (Surgically Modified)
          </div>

          <div className="relative shadow-2xl bg-white rounded-sm">
            <canvas ref={rightCanvasRef} className="block" />

            {/* Difference highlight markers */}
            {appliedEdits
              .filter((ed) => ed.page === currentPage - 1 && ed.bbox)
              .map((ed) => {
                const left = (ed.bbox![0] * zoom * 0.9);
                const top = (ed.bbox![1] * zoom * 0.9);
                const width = ((ed.bbox![2] - ed.bbox![0]) * zoom * 0.9);
                const height = ((ed.bbox![3] - ed.bbox![1]) * zoom * 0.9);

                return (
                  <div
                    key={ed.id}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${Math.max(width, 16)}px`,
                      height: `${Math.max(height, 12)}px`,
                    }}
                    title={`Changed: "${ed.original_text}" → "${ed.new_text}"`}
                    className="absolute ring-2 ring-emerald-500 bg-emerald-400/20 rounded pointer-events-none animate-pulse"
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
