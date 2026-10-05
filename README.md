# AuraPDF Precision Editor

A desktop-class **PDF Editor web application** engineered for **surgical, in-place text editing** while preserving original fonts, sizes, colors, positions, and document layout without re-rasterizing pages.

---

## Key Highlights & Core Capabilities

- **Surgical In-Place Modification**: Replaces only the user-selected text tokens. Surrounding paragraphs, vector borders, images, and tables remain completely pristine.
- **Font & Style Preservation**: Automatically extracts font family, font size, bold/italic style, sRGB color, baseline origin `(x, y)`, and bounding box coordinates `[x0, y0, x1, y1]`.
- **No Page Re-Rasterization**: Unlike primitive editors that convert pages to lossy bitmap images and place text layers over them, AuraPDF maintains 100% vector fidelity and original PDF stream operators.
- **Side-by-Side Comparison**: Switch between Original and Edited versions or use the synchronized **Split-Screen View** to verify that only target text changed.
- **Scanned PDF Detection**: Automatically analyzes vector text density and image operators to detect scanned documents, alerting users: *"This PDF appears to contain scanned/image-based pages. Text editing requires OCR."*
- **Local & Privacy Compliant**: In-memory session handling with a 1-click **"Delete File"** button to immediately wipe uploaded documents from memory.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (PDF.js)                         │
│  - Interactive text layer with bounding box overlays                   │
│  - Double-click inline quick edit & right sidebar typography inspector │
│  - Synchronized split-screen comparison mode                           │
│  - Responsive modern desktop UI (Tailwind CSS, Lucide icons)           │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ JSON / Base64 REST API
┌─────────────────────────────────▼──────────────────────────────────────┐
│                     FastAPI + PyMuPDF Engine                           │
│  - PDF inspection & text block extraction (exact origin & metrics)     │
│  - Surgical redaction: removes vector text drawing operators in bbox   │
│  - Text insertion: renders replacement at exact baseline & matched font│
│  - Vector integrity: keeps all images, lines, and other pages untouched│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart Guide

### 1. Start the Application

To launch the full-stack server (FastAPI backend + React frontend):

```bash
./start.sh
```

Or run via the virtual environment directly:

```bash
PYTHONPATH=. ./venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open your browser to:
**[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## User Flow & Testing Walkthrough

1. **Open Dashboard**:
   - Launch `http://127.0.0.1:8000`.
   - You can upload any existing PDF file via drag-and-drop or file picker.
   - Alternatively, click any of the 3 built-in **Sample Test Documents**:
     - **Employment Offer Letter**: Features `Name: John Smith`, `Age: 21`, salary table, header/footer.
     - **Consulting Services Invoice**: Features itemized hourly rates, bold totals, client details.
     - **Quarterly Operations Report**: 2-page document with multi-column tables and executive summaries.

2. **Select & Edit Text**:
   - Hover over text to see bounding box highlights.
   - Click on `"John Smith"`.
   - In the Right Sidebar or via double-click, change `"John Smith"` to `"John Kumar"`.
   - The live preview instantly updates the text with the exact detected font, color, and size.

3. **Verify Surrounding Content**:
   - Surrounding labels like `Age: 21` and table compensation rows remain 100% untouched.

4. **Compare Original vs Edited**:
   - Click **"Split View"** in the top toolbar to view a synchronized side-by-side comparison of the Original vs Edited document.
   - Or click **"Original / Edited"** toggle to flick between views.

5. **Download PDF**:
   - Click **"Save Edits"** (or press `Ctrl+S`), then click **"Download PDF"**.
   - Inspect the downloaded PDF in any external PDF viewer (Preview, Acrobat, Chrome); notice the crisp vector text and font fidelity.

6. **Session Privacy / Reset**:
   - Click the red trash icon in the toolbar to close the document and wipe the session from memory.

---

## Automated Test Suite

A complete test suite is included in `backend/test_app.py` covering all 9 required verification steps:

```bash
PYTHONPATH=. ./venv/bin/python backend/test_app.py
```

### Verified Test Cases:
1. **Health check**: API status and service availability.
2. **Sample catalog**: Verification of built-in sample test PDFs.
3. **Offer letter inspection**: Extraction of exact bbox, baseline, font, size, and color.
4. **Surgical text edit**: Replacement of `"John Smith"` with `"John Kumar"`; verification that `"Age: 21"` and compensation remain intact.
5. **Download verification**: PyMuPDF inspection of downloaded binary stream.
6. **Custom PDF upload**: Upload and extraction of user documents.
7. **Scanned PDF detection**: Automatic detection of image-only pages and OCR banner display.
8. **Session privacy**: Verification of session deletion and 404 response on wiped data.
9. **Frontend static delivery**: Verification of unified single-port HTTP delivery.
