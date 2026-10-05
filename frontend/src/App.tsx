import { useState, useEffect, useCallback } from 'react';
import type {
  DocumentData,
  TextElement,
  EditOperation,
  ToolMode,
  ViewMode,
  PreviewVersion,
  SampleItem,
} from './types';
import {
  fetchSamples,
  loadSample,
  uploadPdfFile,
  applyDocumentEdits,
  deleteDocumentSession,
} from './services/api';
import { Navbar } from './components/Navbar';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { PdfViewer } from './components/PdfViewer';
import { SplitComparison } from './components/SplitComparison';
import { UploadDropzone } from './components/UploadDropzone';
import { ScannedAlert } from './components/ScannedAlert';

export function App() {
  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [previewVersion, setPreviewVersion] = useState<PreviewVersion>('edited');
  const [selectedElement, setSelectedElement] = useState<TextElement | null>(null);

  // Edits & Undo/Redo stacks
  const [appliedEdits, setAppliedEdits] = useState<EditOperation[]>([]);
  const [undoStack, setUndoStack] = useState<EditOperation[][]>([]);
  const [redoStack, setRedoStack] = useState<EditOperation[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedDismissed, setScannedDismissed] = useState<boolean>(false);

  // Fetch samples on initial mount
  useEffect(() => {
    fetchSamples()
      .then(setSamples)
      .catch((err) => console.error('Failed to load sample list:', err));
  }, []);

  // Sync edits to backend PDF engine and update editedPdfBase64
  const syncEditsToBackend = async (
    editsToSync: EditOperation[],
    currentDocData?: DocumentData | null
  ): Promise<string | null> => {
    const doc = currentDocData !== undefined ? currentDocData : docData;
    if (!doc) return null;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await applyDocumentEdits(doc.sessionId, editsToSync);
      setDocData((prev) =>
        prev
          ? {
              ...prev,
              editedPdfBase64: res.editedPdfBase64,
            }
          : null
      );
      setHasUnsavedChanges(false);
      return res.editedPdfBase64;
    } catch (err: any) {
      console.error('Failed to sync edits to backend:', err);
      setErrorMessage(err.message || 'Failed to update document edits');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sample selection
  const handleSelectSample = async (sampleId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await loadSample(sampleId);
      setDocData(data);
      setCurrentPage(1);
      setAppliedEdits([]);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedElement(null);
      setHasUnsavedChanges(false);
      setViewMode('single');
      setPreviewVersion('edited');
      setScannedDismissed(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open sample PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user file upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await uploadPdfFile(file);
      setDocData(data);
      setCurrentPage(1);
      setAppliedEdits([]);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedElement(null);
      setHasUnsavedChanges(false);
      setViewMode('single');
      setPreviewVersion('edited');
      setScannedDismissed(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload PDF file');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply an edit operation with immediate auto-sync
  const handleApplyEdit = (edit: EditOperation) => {
    setUndoStack((prev) => [...prev, appliedEdits]);
    setRedoStack([]);

    const updated = [...appliedEdits.filter((e) => e.id !== edit.id), edit];
    setAppliedEdits(updated);
    setHasUnsavedChanges(true);

    // Auto-sync immediately to backend
    syncEditsToBackend(updated);
  };

  // Revert a specific edit with immediate auto-sync
  const handleRevertEdit = (editId: string) => {
    setUndoStack((prev) => [...prev, appliedEdits]);
    setRedoStack([]);

    const updated = appliedEdits.filter((e) => e.id !== editId);
    setAppliedEdits(updated);
    setHasUnsavedChanges(true);

    syncEditsToBackend(updated);
  };

  // Undo with auto-sync
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, appliedEdits]);
    setAppliedEdits(previous);
    setHasUnsavedChanges(true);

    syncEditsToBackend(previous);
  }, [undoStack, appliedEdits, docData]);

  // Redo with auto-sync
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, appliedEdits]);
    setAppliedEdits(next);
    setHasUnsavedChanges(true);

    syncEditsToBackend(next);
  }, [redoStack, appliedEdits, docData]);

  // Manual save trigger
  const handleSave = async () => {
    await syncEditsToBackend(appliedEdits);
  };

  // Download edited PDF (100% cache-free blob download)
  const handleDownload = async () => {
    if (!docData) return;
    setIsSaving(true);
    try {
      let base64Data = docData.editedPdfBase64;

      // If edits exist, ensure they are synced to backend first
      if (appliedEdits.length > 0) {
        const freshBase64 = await syncEditsToBackend(appliedEdits);
        if (freshBase64) {
          base64Data = freshBase64;
        }
      } else {
        base64Data = docData.pdfBase64;
      }

      const finalBase64 = base64Data || docData.pdfBase64;

      // Client-side Blob download: ensures exact downloaded bytes in memory
      const binaryString = atob(finalBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const baseName = docData.filename.replace(/\.pdf$/i, '');
      a.download = appliedEdits.length > 0 ? `${baseName}_edited.pdf` : docData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(err.message || 'Failed to download document');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset / Delete file for privacy
  const handleReset = async () => {
    if (docData) {
      try {
        await deleteDocumentSession(docData.sessionId);
      } catch {
        // ignore
      }
    }
    setDocData(null);
    setAppliedEdits([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedElement(null);
    setHasUnsavedChanges(false);
  };

  // Add new text box at point
  const handleAddTextAtPoint = (point: { x: number; y: number; page: number }) => {
    const newId = `new_${Date.now()}`;
    const newEl: TextElement = {
      id: newId,
      page: point.page,
      text: 'New Text',
      bbox: [point.x, point.y, point.x + 100, point.y + 20],
      origin: [point.x, point.y + 16],
      width: 100,
      height: 20,
      font: 'Helvetica',
      size: 12,
      color: '#000000',
      bold: false,
      italic: false,
    };

    if (docData) {
      const updatedPages = [...docData.pages];
      if (updatedPages[point.page]) {
        updatedPages[point.page] = {
          ...updatedPages[point.page],
          elements: [...updatedPages[point.page].elements, newEl],
        };
        setDocData({ ...docData, pages: updatedPages });
      }
    }

    setSelectedElement(newEl);
    setToolMode('select');

    const newOp: EditOperation = {
      id: newId,
      page: point.page,
      original_text: '',
      new_text: 'New Text',
      bbox: newEl.bbox,
      origin: newEl.origin,
      font: 'Helvetica',
      size: 12,
      color: '#000000',
      fill_color: '#ffffff',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      isNew: true,
      appliedAt: new Date().toLocaleTimeString(),
    };
    handleApplyEdit(newOp);
  };

  // Switch to split comparison view and ensure edits are synced
  const handleToggleSplitView = () => {
    if (viewMode === 'split-compare') {
      setViewMode('single');
    } else {
      if (appliedEdits.length > 0 && (!docData?.editedPdfBase64 || hasUnsavedChanges)) {
        syncEditsToBackend(appliedEdits);
      }
      setViewMode('split-compare');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving) {
          handleSave();
        }
      }
      // Escape
      if (e.key === 'Escape') {
        setSelectedElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isSaving]);

  // Fit to width
  const handleFitWidth = () => {
    setZoom(1.4);
  };

  // Fit to page
  const handleFitPage = () => {
    setZoom(0.95);
  };

  // Rotate clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // If no document is open, show the initial upload dashboard
  if (!docData) {
    return (
      <div className="h-screen w-screen flex flex-col bg-slate-100">
        <UploadDropzone
          onFileUpload={handleFileUpload}
          samples={samples}
          onSelectSample={handleSelectSample}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      </div>
    );
  }

  const activePageData = docData.pages[currentPage - 1] || docData.pages[0];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Navigation & Toolbar */}
      <Navbar
        filename={docData.filename}
        currentPage={currentPage}
        totalPages={docData.pageCount}
        toolMode={toolMode}
        setToolMode={setToolMode}
        viewMode={viewMode}
        setViewMode={(vm) => {
          if (vm === 'split-compare') {
            handleToggleSplitView();
          } else {
            setViewMode(vm);
          }
        }}
        previewVersion={previewVersion}
        setPreviewVersion={setPreviewVersion}
        zoom={zoom}
        setZoom={setZoom}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onRotate={handleRotate}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSave}
        onDownload={handleDownload}
        onReset={handleReset}
        editsCount={appliedEdits.length}
      />

      {/* Scanned Document Alert Banner */}
      {docData.isScanned && !scannedDismissed && (
        <ScannedAlert
          message={docData.scannedMessage}
          onDismiss={() => setScannedDismissed(true)}
        />
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Thumbnails & Page Navigation */}
        <SidebarLeft
          pages={docData.pages}
          currentPage={currentPage}
          setCurrentPage={(p) => {
            setCurrentPage(p);
            setSelectedElement(null);
          }}
          fileSize={docData.fileSize}
          editsCount={appliedEdits.length}
          samples={samples}
          onSelectSample={handleSelectSample}
          onOpenUpload={handleReset}
        />

        {/* Center Canvas / Editor or Split View */}
        {viewMode === 'split-compare' ? (
          <SplitComparison
            originalPdfBase64={docData.pdfBase64}
            editedPdfBase64={docData.editedPdfBase64 || docData.pdfBase64}
            currentPage={currentPage}
            zoom={zoom}
            rotation={rotation}
            appliedEdits={appliedEdits}
            onClose={() => setViewMode('single')}
            isSaving={isSaving}
          />
        ) : (
          <PdfViewer
            pdfBase64={docData.pdfBase64}
            editedPdfBase64={docData.editedPdfBase64}
            pageData={activePageData}
            currentPage={currentPage}
            zoom={zoom}
            rotation={rotation}
            toolMode={toolMode}
            previewVersion={previewVersion}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
            appliedEdits={appliedEdits}
            onApplyEdit={handleApplyEdit}
            onAddTextAtPoint={handleAddTextAtPoint}
          />
        )}

        {/* Right Sidebar: Typography Inspector & Applied Edits History */}
        {viewMode !== 'split-compare' && (
          <SidebarRight
            selectedElement={selectedElement}
            onClearSelection={() => setSelectedElement(null)}
            onApplyEdit={handleApplyEdit}
            appliedEdits={appliedEdits}
            onRevertEdit={handleRevertEdit}
          />
        )}
      </div>
    </div>
  );
}

export default App;
