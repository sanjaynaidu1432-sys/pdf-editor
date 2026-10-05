import React from 'react';
import {
  FileText,
  MousePointer,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Save,
  Columns,
  Eye,
  Trash2,
  Loader2,
  RotateCw
} from 'lucide-react';
import type { ToolMode, ViewMode, PreviewVersion } from '../types';

interface NavbarProps {
  filename: string;
  currentPage: number;
  totalPages: number;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  previewVersion: PreviewVersion;
  setPreviewVersion: (ver: PreviewVersion) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onRotate: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDownload: () => void;
  onReset: () => void;
  editsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  filename,
  currentPage,
  totalPages,
  toolMode,
  setToolMode,
  viewMode,
  setViewMode,
  previewVersion,
  setPreviewVersion,
  zoom,
  setZoom,
  onFitWidth,
  onFitPage,
  onRotate,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onDownload,
  onReset,
  editsCount,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 select-none shadow-xs">
      {/* Left: Branding & Document Info */}
      <div className="flex items-center space-x-3 min-w-[240px]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              AuraPDF
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                Precision
              </span>
            </span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-200" />

        <div className="flex items-center space-x-2 max-w-[200px]">
          <span className="text-xs font-medium text-slate-700 truncate" title={filename}>
            {filename}
          </span>
          <span className="text-[11px] text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {currentPage}/{totalPages}
          </span>
          {editsCount > 0 && (
            <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
              {editsCount} edit{editsCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Center: Tools, Undo/Redo & Zoom */}
      <div className="flex items-center space-x-2">
        {/* Tool Mode Buttons */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-slate-700">
          <button
            onClick={() => setToolMode('select')}
            title="Select & Edit Existing Text (Click any text on the page)"
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              toolMode === 'select'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select Text</span>
          </button>
          <button
            onClick={() => setToolMode('addText')}
            title="Add New Text Box"
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              toolMode === 'addText'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Text</span>
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 mx-1" />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent text-slate-700 transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent text-slate-700 transition"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">
          <button
            onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
            title="Zoom Out"
            className="p-1 rounded hover:bg-white text-slate-700"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-medium text-slate-700 w-12 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom((prev) => Math.min(3.0, Number((prev + 0.15).toFixed(2))))}
            title="Zoom In"
            className="p-1 rounded hover:bg-white text-slate-700"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitWidth}
            title="Fit to Width"
            className="px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded"
          >
            Fit W
          </button>

          <button
            onClick={onFitPage}
            title="Fit to Page"
            className="p-1 rounded hover:bg-white text-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRotate}
            title="Rotate 90° Clockwise"
            className="p-1 rounded hover:bg-white text-slate-700"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 mx-1" />

        {/* Comparison Modes */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-slate-700">
          <button
            onClick={() => {
              setViewMode('single');
              setPreviewVersion('edited');
            }}
            title="Standard Editor View"
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'single'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Editor
          </button>

          <button
            onClick={() => {
              setViewMode('compare-toggle');
              setPreviewVersion(previewVersion === 'original' ? 'edited' : 'original');
            }}
            title="Quick Toggle: Original vs Edited"
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'compare-toggle'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>{previewVersion === 'original' ? 'Original' : 'Edited'}</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'split-compare' ? 'single' : 'split-compare')}
            title="Split-Screen Comparison: Side-by-side view"
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'split-compare'
                ? 'bg-purple-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* Right: Save, Download & Document Reset */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          title="Apply and Save Edits to Document"
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition ${
            hasUnsavedChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-98'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{isSaving ? 'Applying...' : 'Save Edits'}</span>
        </button>

        <button
          onClick={onDownload}
          title="Download the Edited PDF Document"
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98 shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-200" />

        <button
          onClick={onReset}
          title="Close Document & Clear Session Data (Privacy Compliant)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
