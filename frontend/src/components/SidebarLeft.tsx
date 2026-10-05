import React from 'react';
import {
  Layers,
  AlertTriangle,
  FolderOpen,
  Info,
  ChevronRight
} from 'lucide-react';
import type { PageData, SampleItem } from '../types';

interface SidebarLeftProps {
  pages: PageData[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  fileSize: number;
  editsCount: number;
  samples: SampleItem[];
  onSelectSample: (id: string) => void;
  onOpenUpload: () => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  pages,
  currentPage,
  setCurrentPage,
  fileSize,
  editsCount,
  samples,
  onSelectSample,
  onOpenUpload,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Pages ({pages.length})</span>
          </div>
          <button
            onClick={onOpenUpload}
            title="Open or Upload Another PDF"
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
          >
            <FolderOpen className="w-3 h-3" />
            <span>Change</span>
          </button>
        </div>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((p) => {
          const isActive = currentPage === p.pageNumber;

          return (
            <div
              key={p.pageNumber}
              onClick={() => setCurrentPage(p.pageNumber)}
              className={`group cursor-pointer rounded-lg p-2.5 transition-all border ${
                isActive
                  ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-400'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  Page {p.pageNumber}
                  {p.isScanned && (
                    <span
                      title="Scanned Page"
                      className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded flex items-center gap-0.5"
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Image
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-600 tabular-nums">
                  {Math.round(p.width)} × {Math.round(p.height)} pt
                </span>
              </div>

              {/* Page Thumbnail Simulation */}
              <div className="relative aspect-[1/1.3] w-full bg-white rounded border border-slate-200 shadow-xs flex flex-col p-2 overflow-hidden pointer-events-none group-hover:border-slate-300">
                <div className="w-full h-1 bg-slate-300 rounded mb-1.5 opacity-70" />
                <div className="space-y-1 opacity-50">
                  <div className="w-3/4 h-1 bg-slate-200 rounded" />
                  <div className="w-full h-1 bg-slate-200 rounded" />
                  <div className="w-5/6 h-1 bg-slate-200 rounded" />
                </div>
                <div className="mt-2 pt-1 border-t border-slate-100 opacity-60">
                  <div className="w-1/2 h-1 bg-blue-300 rounded" />
                </div>

                <div className="mt-auto flex items-center justify-between text-[9px] text-slate-600">
                  <span>{p.elements.length} text items</span>
                  <span>{p.imageCount} imgs</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Sample Selector */}
      {samples.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Sample Test Documents</span>
          </div>
          <div className="space-y-1.5">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSample(s.id)}
                className="w-full text-left p-1.5 rounded-md hover:bg-slate-50 border border-slate-200/60 hover:border-blue-300 text-xs text-slate-700 transition flex items-center justify-between group"
              >
                <div className="truncate pr-1">
                  <div className="font-medium text-slate-800 text-[11px] truncate">
                    {s.title}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">
                    {s.badge}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Stats Footer */}
      <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
        <span>Size: {formatSize(fileSize)}</span>
        <span className="font-medium text-slate-700">
          {editsCount} total edit{editsCount === 1 ? '' : 's'}
        </span>
      </div>
    </aside>
  );
};
