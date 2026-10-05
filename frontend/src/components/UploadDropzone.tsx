import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import type { SampleItem } from '../types';

interface UploadDropzoneProps {
  onFileUpload: (file: File) => void;
  samples: SampleItem[];
  onSelectSample: (id: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileUpload,
  samples,
  onSelectSample,
  isLoading,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        onFileUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-slate-100 overflow-y-auto select-none">
      <div className="max-w-3xl w-full space-y-8 py-6">
        {/* App Title & Intro */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Fidelity PDF In-Place Editor</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Edit Existing PDF Text Directly
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Modify text in any PDF document without re-rasterizing pages. Original fonts,
            colors, layout, vectors, and tables are preserved with surgical accuracy.
          </p>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Dropzone Card */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50 shadow-sm'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-800">
                {isLoading ? 'Processing document...' : 'Drop your PDF here, or browse files'}
              </p>
              <p className="text-xs text-slate-600">
                Supports all standard PDF documents up to 50MB
              </p>
            </div>

            <button
              type="button"
              disabled={isLoading}
              className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              {isLoading ? 'Loading PDF...' : 'Select PDF File'}
            </button>
          </div>
        </div>

        {/* Built-in Sample Test PDFs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Or Try A Sample Test Document
            </span>
            <span className="text-[11px] text-slate-600">
              Instant 1-click test with preconfigured text elements
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {samples.map((sample) => (
              <div
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      {sample.badge}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {sample.pages} {sample.pages === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition">
                    {sample.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {sample.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
                  <span>Open & Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Highlights / Trust Badges */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center">
          <div className="flex flex-col items-center space-y-1">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h4 className="text-xs font-semibold text-slate-800">100% Privacy & Local Processing</h4>
            <p className="text-[11px] text-slate-600">No persistent storage; instant session cleanup</p>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <Zap className="w-5 h-5 text-amber-500" />
            <h4 className="text-xs font-semibold text-slate-800">Surgical Text Replacement</h4>
            <p className="text-[11px] text-slate-600">Modifies only target text without page rasterization</p>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            <h4 className="text-xs font-semibold text-slate-800">Font & Layout Preserved</h4>
            <p className="text-[11px] text-slate-600">Retains baseline, color, size, and weight</p>
          </div>
        </div>
      </div>
    </div>
  );
};
