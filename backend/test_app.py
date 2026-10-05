import os
import io
import fitz
from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_full_workflow():
    print("=== TEST 1: Health Check ===")
    res = client.get("/api/health")
    assert res.status_code == 200
    print("Health response:", res.json())

    print("\n=== TEST 2: List Samples ===")
    res = client.get("/api/samples")
    assert res.status_code == 200
    samples = res.json()["samples"]
    print(f"Loaded {len(samples)} samples:", [s["title"] for s in samples])
    assert len(samples) >= 3

    print("\n=== TEST 3: Load Offer Letter Sample ===")
    res = client.get("/api/sample/offer_letter")
    assert res.status_code == 200
    data = res.json()
    session_id = data["sessionId"]
    print(f"Session ID: {session_id}, Filename: {data['filename']}, Page Count: {data['pageCount']}")
    print(f"Is scanned: {data['isScanned']}")
    assert not data["isScanned"]
    assert data["pageCount"] == 1

    elements = data["pages"][0]["elements"]
    print(f"Extracted {len(elements)} text elements on Page 1")

    # Locate 'John Smith'
    john_element = None
    for el in elements:
        if "John Smith" in el["text"]:
            john_element = el
            break
    assert john_element is not None, "Target 'John Smith' not found in offer letter"
    print("Found target element:", john_element)

    print("\n=== TEST 4: Apply In-Place Surgical Text Edit ===")
    print(f"Original text: '{john_element['text']}' -> Changing to 'John Kumar'")
    edit_op = {
        "id": john_element["id"],
        "page": john_element["page"],
        "original_text": john_element["text"],
        "new_text": john_element["text"].replace("John Smith", "John Kumar"),
        "bbox": john_element["bbox"],
        "origin": john_element["origin"],
        "font": john_element["font"],
        "size": john_element["size"],
        "color": john_element["color"],
        "fill_color": "#ffffff",
        "bold": john_element["bold"],
        "italic": john_element["italic"],
        "underline": False,
        "align": "left",
        "isNew": False
    }

    res = client.post("/api/apply-edits", json={
        "sessionId": session_id,
        "edits": [edit_op]
    })
    assert res.status_code == 200
    edit_result = res.json()
    assert edit_result["success"] is True

    import base64
    from backend.pdf_service import PDFService
    inspection = PDFService.inspect_pdf(base64.b64decode(edit_result["editedPdfBase64"]))
    edited_elements = inspection["pages"][0]["elements"]
    has_kumar = any("John Kumar" in el["text"] for el in edited_elements)
    print("Verified: Edited PDF contains 'John Kumar':", has_kumar)
    assert has_kumar

    # Also verify surrounding text 'Age: 21' and salary still exists
    has_age = any("Age:" in el["text"] for el in edited_elements)
    has_salary = any("145,000" in el["text"] for el in edited_elements)
    print(f"Verified surrounding elements: 'Age: 21' -> {has_age}, '$145,000' -> {has_salary}")
    assert has_age
    assert has_salary

    print("\n=== TEST 5: Download Edited PDF ===")
    res = client.get(f"/api/download/{session_id}?type=edited")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    edited_pdf_bytes = res.content

    # Open with PyMuPDF to verify exact vector structure
    doc = fitz.open(stream=edited_pdf_bytes, filetype="pdf")
    page_text = doc[0].get_text()
    assert "John Kumar" in page_text
    assert "Age: 21" in page_text
    print("PyMuPDF verification of downloaded PDF succeeded! Text stream contains:")
    for line in page_text.splitlines():
        if "Kumar" in line or "Age" in line or "Salary" in line:
            print("  ", line)

    print("\n=== TEST 6: Upload Custom PDF ===")
    # Create a small custom test PDF
    custom_doc = fitz.open()
    c_page = custom_doc.new_page()
    c_page.insert_text((72, 72), "Client: Jane Doe", fontsize=12)
    c_bytes = custom_doc.tobytes()
    custom_doc.close()

    res = client.post(
        "/api/upload",
        files={"file": ("client_test.pdf", io.BytesIO(c_bytes), "application/pdf")}
    )
    assert res.status_code == 200
    upload_data = res.json()
    print("Uploaded custom PDF successfully, extracted elements:", len(upload_data["pages"][0]["elements"]))
    assert "Jane Doe" in upload_data["pages"][0]["elements"][0]["text"]

    print("\n=== TEST 7: Scanned PDF Detection ===")
    # Create an image-only PDF
    scanned_doc = fitz.open()
    s_page = scanned_doc.new_page()
    # Insert a dummy pixmap image without text
    pix = fitz.Pixmap(fitz.csRGB, (0, 0, 100, 100), False)
    pix.clear_with(255)
    s_page.insert_image(fitz.Rect(50, 50, 200, 200), pixmap=pix)
    scanned_bytes = scanned_doc.tobytes()
    scanned_doc.close()

    res = client.post(
        "/api/upload",
        files={"file": ("scanned_test.pdf", io.BytesIO(scanned_bytes), "application/pdf")}
    )
    assert res.status_code == 200
    scanned_data = res.json()
    print("Scanned detection status:", scanned_data["isScanned"], "-", scanned_data["scannedMessage"])
    assert scanned_data["isScanned"] is True
    assert "Text editing requires OCR" in scanned_data["scannedMessage"]

    print("\n=== TEST 8: Data Privacy / Session Cleanup ===")
    res = client.delete(f"/api/session/{session_id}")
    assert res.status_code == 200
    # Trying to download deleted session should now return 404
    res_after = client.get(f"/api/download/{session_id}?type=edited")
    assert res_after.status_code == 404
    print("Session cleanly wiped from memory, privacy compliance verified.")

    print("\n=== TEST 9: Frontend Static Asset Serving ===")
    res = client.get("/")
    assert res.status_code == 200
    assert "<!doctype html>" in res.text.lower()
    print("Frontend index.html served successfully via FastAPI!")

    print("\nALL 9 AUTOMATED TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_full_workflow()
