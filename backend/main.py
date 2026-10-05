import os
import uuid
import base64
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.pdf_service import PDFService

app = FastAPI(
    title="AuraPDF Precision Editor API",
    description="Backend service for surgical in-place PDF editing and font preservation",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (wiped on reset or server restart)
# Maps session_id -> { "original_bytes": bytes, "edited_bytes": bytes, "filename": str, "edits": list }
SESSIONS: Dict[str, Dict[str, Any]] = {}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

class EditItem(BaseModel):
    id: str
    page: int
    original_text: Optional[str] = ""
    new_text: str
    bbox: Optional[List[float]] = None
    origin: Optional[List[float]] = None
    font: Optional[str] = "Helvetica"
    size: Optional[float] = 12.0
    color: Optional[str] = "#000000"
    fill_color: Optional[str] = "#ffffff"
    bold: Optional[bool] = False
    italic: Optional[bool] = False
    underline: Optional[bool] = False
    align: Optional[str] = "left"
    isNew: Optional[bool] = False

class ApplyEditsRequest(BaseModel):
    sessionId: str
    edits: List[EditItem]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "AuraPDF Editor"}

@app.get("/api/samples")
def list_samples():
    """List built-in sample test PDFs."""
    samples = [
        {
            "id": "offer_letter",
            "name": "offer_letter.pdf",
            "title": "Employment Offer Letter",
            "description": "Standard corporate letter featuring 'Name: John Smith', 'Age: 21', salary breakdown table, headers and footers.",
            "pages": 1,
            "badge": "Perfect for Name/Salary edits"
        },
        {
            "id": "invoice",
            "name": "invoice.pdf",
            "title": "Consulting Services Invoice",
            "description": "Professional invoice with itemized table, rates, bold totals, client info, and green accents.",
            "pages": 1,
            "badge": "Table & Currency format"
        },
        {
            "id": "multi_page_report",
            "name": "multi_page_report.pdf",
            "title": "Quarterly Operations Report",
            "description": "2-page executive document with multi-column tables, colored section headers, bullet lists, and sign-offs.",
            "pages": 2,
            "badge": "Multi-page layout"
        }
    ]
    return {"samples": samples}

@app.get("/api/sample/{sample_id}")
def load_sample(sample_id: str):
    """Load a sample PDF into a new session."""
    filename_map = {
        "offer_letter": "samples/offer_letter.pdf",
        "invoice": "samples/invoice.pdf",
        "multi_page_report": "samples/multi_page_report.pdf"
    }

    if sample_id not in filename_map:
        raise HTTPException(status_code=404, detail="Sample not found")

    file_path = filename_map[sample_id]
    if not os.path.exists(file_path):
        from backend.samples import generate_offer_letter, generate_invoice, generate_multi_page_report
        os.makedirs("samples", exist_ok=True)
        generate_offer_letter("samples/offer_letter.pdf")
        generate_invoice("samples/invoice.pdf")
        generate_multi_page_report("samples/multi_page_report.pdf")

    with open(file_path, "rb") as f:
        pdf_bytes = f.read()

    session_id = str(uuid.uuid4())
    filename = f"{sample_id}.pdf"

    inspection = PDFService.inspect_pdf(pdf_bytes)

    SESSIONS[session_id] = {
        "original_bytes": pdf_bytes,
        "edited_bytes": pdf_bytes,
        "filename": filename,
        "edits": []
    }

    return {
        "sessionId": session_id,
        "filename": filename,
        "fileSize": len(pdf_bytes),
        "pageCount": inspection["pageCount"],
        "isScanned": inspection["isScanned"],
        "scannedMessage": inspection["scannedMessage"],
        "pages": inspection["pages"],
        "pdfBase64": base64.b64encode(pdf_bytes).decode("utf-8")
    }

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload user PDF, validate structure, and extract elements."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a valid PDF document.")

    pdf_bytes = await file.read()

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB.")

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Corrupted or invalid PDF header. Please check the file.")

    try:
        inspection = PDFService.inspect_pdf(pdf_bytes)
    except Exception as e:
        err_msg = str(e).lower()
        if "password" in err_msg or "encrypt" in err_msg:
            raise HTTPException(status_code=400, detail="This PDF is password-protected. Please remove the password and try again.")
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}")

    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "original_bytes": pdf_bytes,
        "edited_bytes": pdf_bytes,
        "filename": file.filename,
        "edits": []
    }

    return {
        "sessionId": session_id,
        "filename": file.filename,
        "fileSize": len(pdf_bytes),
        "pageCount": inspection["pageCount"],
        "isScanned": inspection["isScanned"],
        "scannedMessage": inspection["scannedMessage"],
        "pages": inspection["pages"],
        "pdfBase64": base64.b64encode(pdf_bytes).decode("utf-8")
    }

@app.post("/api/apply-edits")
def apply_edits(req: ApplyEditsRequest):
    """Surgically apply edits to original PDF."""
    if req.sessionId not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session expired or not found. Please re-upload the document.")

    session = SESSIONS[req.sessionId]
    original_bytes = session["original_bytes"]

    # Convert pydantic list to dicts
    edits_dict = [e.dict() for e in req.edits]

    try:
        edited_bytes = PDFService.apply_edits(original_bytes, edits_dict)
        session["edited_bytes"] = edited_bytes
        session["edits"] = edits_dict

        return {
            "success": True,
            "editedPdfBase64": base64.b64encode(edited_bytes).decode("utf-8")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply edits: {str(e)}")

@app.get("/api/download/{session_id}")
def download_pdf(session_id: str, type: str = "edited"):
    """Download edited or original PDF."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    session = SESSIONS[session_id]
    pdf_bytes = session["edited_bytes"] if type == "edited" else session["original_bytes"]

    base_name, ext = os.path.splitext(session["filename"])
    download_filename = f"{base_name}_edited.pdf" if type == "edited" else session["filename"]

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.delete("/api/session/{session_id}")
def delete_session(session_id: str):
    """Data privacy compliance: wipe file and session data immediately."""
    if session_id in SESSIONS:
        del SESSIONS[session_id]
    return {"success": True, "message": "Document and session data completely removed from memory."}

# Serve frontend build if available
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
