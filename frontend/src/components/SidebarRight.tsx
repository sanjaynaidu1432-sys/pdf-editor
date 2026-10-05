import React, { useState, useEffect } from 'react';
import {
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Check,
  Trash2,
  HelpCircle,
  History
} from 'lucide-react';
import type { TextElement, EditOperation } from '../types';

interface SidebarRightProps {
  selectedElement: TextElement | null;
  onClearSelection: () => void;
  onApplyEdit: (edit: EditOperation) => void;
  appliedEdits: EditOperation[];
  onRevertEdit: (editId: string) => void;
}

const COMMON_FONTS = [
  { label: 'Helvetica / Sans-Serif', value: 'Helvetica' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman / Serif', value: 'Times New Roman' },
  { label: 'Courier / Monospace', value: 'Courier' },
  { label: 'Georgia', value: 'Georgia' },
];

const PRESET_COLORS = [
  '#000000', // Black
  '#1e293b', // Slate Dark
  '#2563eb', // Blue
  '#059669', // Emerald
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#475569', // Muted Gray
];

export const SidebarRight: React.FC<SidebarRightProps> = ({
  selectedElement,
  onClearSelection,
  onApplyEdit,
  appliedEdits,
  onRevertEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'history'>('inspector');
  const [justSaved, setJustSaved] = useState(false);

  // Inspector form states
  const [textValue, setTextValue] = useState('');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [fontSize, setFontSize] = useState(12);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');

  // Sync state when selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      const existing = appliedEdits.find((e) => e.id === selectedElement.id);
      if (existing) {
        setTextValue(existing.new_text);
        setFontFamily(existing.font || selectedElement.font || 'Helvetica');
        setFontSize(existing.size || selectedElement.size || 12);
        setIsBold(existing.bold !== undefined ? existing.bold : selectedElement.bold);
        setIsItalic(existing.italic !== undefined ? existing.italic : selectedElement.italic);
        setIsUnderline(!!existing.underline);
        setTextColor(existing.color || selectedElement.color || '#000000');
        setFillColor(existing.fill_color || selectedElement.bg_color || '#ffffff');
        setAlignment(existing.align || 'left');
      } else {
        setTextValue(selectedElement.text);
        setFontFamily(selectedElement.font || 'Helvetica');
        setFontSize(selectedElement.size || 12);
        setIsBold(selectedElement.bold || false);
        setIsItalic(selectedElement.italic || false);
        setIsUnderline(false);
        setTextColor(selectedElement.color || '#000000');
        setFillColor(selectedElement.bg_color || '#ffffff');
        setAlignment('left');
      }
      setActiveTab('inspector');
    }
  }, [selectedElement, appliedEdits]);

  const handleApply = () => {
    if (!selectedElement) return;

    const editOp: EditOperation = {
      id: selectedElement.id,
      page: selectedElement.page,
      original_text: selectedElement.text,
      new_text: textValue,
      bbox: selectedElement.bbox,
      origin: selectedElement.origin,
      font: fontFamily,
      size: Number(fontSize),
      color: textColor,
      fill_color: fillColor || selectedElement.bg_color || '#ffffff',
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      align: alignment,
      isNew: false,
      appliedAt: new Date().toLocaleTimeString(),
    };

    onApplyEdit(editOp);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const currentEdit = selectedElement
    ? appliedEdits.find((e) => e.id === selectedElement.id)
    : null;

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 p-1">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
            activeTab === 'inspector'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Text Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
            activeTab === 'history'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Edits ({appliedEdits.length})</span>
        </button>
      </div>

      {activeTab === 'inspector' ? (
        selectedElement ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                Page {selectedElement.page + 1} Element
              </span>
              <button
                onClick={onClearSelection}
                className="text-xs text-slate-600 hover:text-slate-700"
              >
                Deselect
              </button>
            </div>

            {/* Original Text Box */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Original Text
              </label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-mono break-all leading-relaxed">
                "{selectedElement.text}"
              </div>
            </div>

            {/* Replacement Text Box */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                  Replacement Text
                </label>
                <span className="text-[10px] text-slate-600">Ctrl+Enter to apply</span>
              </div>
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Enter new text..."
                className="w-full p-2.5 text-xs font-medium border border-blue-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 leading-relaxed resize-y"
                autoFocus
              />
            </div>

            {/* Typography Formatting Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Font & Typography
              </span>

              {/* Font Family */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Font Family
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value={selectedElement.font}>
                    Detected: {selectedElement.font}
                  </option>
                  {COMMON_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size & Weight row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Size (pt)
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      step="0.5"
                      min="4"
                      max="120"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full p-1.5 text-xs border border-slate-200 rounded-md text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Style
                  </label>
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsBold(!isBold)}
                      title="Bold"
                      className={`p-1.5 rounded transition flex-1 flex items-center justify-center ${
                        isBold ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsItalic(!isItalic)}
                      title="Italic"
                      className={`p-1.5 rounded transition flex-1 flex items-center justify-center ${
                        isItalic ? 'bg-white text-blue-700 shadow-xs italic' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUnderline(!isUnderline)}
                      title="Underline"
                      className={`p-1.5 rounded transition flex-1 flex items-center justify-center ${
                        isUnderline ? 'bg-white text-blue-700 shadow-xs underline' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Text Color Picker & Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Text Color
                </label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 p-1 text-xs border border-slate-200 rounded font-mono uppercase text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTextColor(c)}
                      className={`w-5 h-5 rounded-full border border-slate-200 transition-transform ${
                        textColor.toLowerCase() === c.toLowerCase() ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Background Fill Color (Table Cells & Colored Boxes) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Background Fill Color
                  </label>
                  {selectedElement.bg_color && selectedElement.bg_color.toLowerCase() !== '#ffffff' && (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Auto-matched Box
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="color"
                    value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="flex-1 p-1 text-xs border border-slate-200 rounded font-mono uppercase text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedElement.bg_color && (
                    <button
                      type="button"
                      onClick={() => setFillColor(selectedElement.bg_color!)}
                      className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 transition ${
                        fillColor.toLowerCase() === (selectedElement.bg_color || '').toLowerCase()
                          ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold ring-1 ring-blue-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Match detected cell background color"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block shrink-0"
                        style={{ backgroundColor: selectedElement.bg_color }}
                      />
                      <span>Auto Match ({selectedElement.bg_color})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFillColor('#ffffff')}
                    className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 transition ${
                      fillColor.toLowerCase() === '#ffffff'
                        ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-white inline-block shrink-0" />
                    <span>White (#ffffff)</span>
                  </button>
                </div>
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alignment
                </label>
                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAlignment('left')}
                    className={`p-1.5 rounded transition flex-1 flex items-center justify-center ${
                      alignment === 'left' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignment('center')}
                    className={`p-1.5 rounded transition flex-1 flex items-center justify-center ${
                      alignment === 'center' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignment('right')}
                    className={`p-1.5 rounded transition flex-1 flex items-center justify-center ${
                      alignment === 'right' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Coordinates & Geometry */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Exact Geometry (PDF Points)
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 tabular-nums">
                  <div>X: {selectedElement.bbox[0]} pt</div>
                  <div>Y: {selectedElement.bbox[1]} pt</div>
                  <div>W: {selectedElement.width} pt</div>
                  <div>H: {selectedElement.height} pt</div>
                </div>
              </div>
            </div>

            {/* Actions Buttons */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                onClick={handleApply}
                className={`w-full py-2 px-3 ${
                  justSaved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98`}
              >
                <Check className="w-4 h-4" />
                <span>{justSaved ? 'Applied & Saved!' : 'Apply Text Edit'}</span>
              </button>

              {currentEdit && (
                <button
                  onClick={() => onRevertEdit(selectedElement.id)}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Original</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-slate-600 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Type className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">No Text Selected</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
                Click any existing text on the document to edit its contents, font, size, and styling.
              </p>
            </div>
            <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs space-y-1.5 text-slate-600">
              <div className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                <HelpCircle className="w-3 h-3 text-blue-500" />
                Quick Tips:
              </div>
              <p className="text-[11px] leading-tight">
                • Hover over text to see bounding box highlights.
              </p>
              <p className="text-[11px] leading-tight">
                • Double-click text to quick edit.
              </p>
              <p className="text-[11px] leading-tight">
                • Original fonts and formatting are automatically preserved.
              </p>
            </div>
          </div>
        )
      ) : (
        /* History Tab */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {appliedEdits.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-600 space-y-2">
              <History className="w-8 h-8 text-slate-300" />
              <p className="text-xs">No edits made yet.</p>
              <p className="text-[11px] text-slate-600">
                Any modifications you make will appear here for easy undo and review.
              </p>
            </div>
          ) : (
            appliedEdits.map((edit) => (
              <div
                key={edit.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 relative group hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-700 text-[11px]">
                    Page {edit.page + 1}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-600">
                      {edit.appliedAt}
                    </span>
                    <button
                      onClick={() => onRevertEdit(edit.id)}
                      title="Revert this change"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-600 text-[11px] line-through truncate">
                    Original: "{edit.original_text}"
                  </div>
                  <div className="font-medium text-emerald-700 text-[11px] truncate">
                    New: "{edit.new_text}"
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200/60 flex items-center gap-2">
                  <span>Font: {edit.font}</span>
                  <span>•</span>
                  <span>{edit.size} pt</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: edit.color }}
                    />
                    {edit.color}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};
