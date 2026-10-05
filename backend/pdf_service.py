import io
import os
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
import pymupdf  # fitz

# Supported standard base-14 and common PDF fonts
FONT_FAMILY_MAP = {
    # Helvetica / Sans
    "helvetica": {"normal": "helv", "bold": "hebo", "italic": "heit", "bolditalic": "hebi"},
    "arial": {"normal": "helv", "bold": "hebo", "italic": "heit", "bolditalic": "hebi"},
    "sans": {"normal": "helv", "bold": "hebo", "italic": "heit", "bolditalic": "hebi"},
    "system-ui": {"normal": "helv", "bold": "hebo", "italic": "heit", "bolditalic": "hebi"},

    # Times / Serif
    "times": {"normal": "times", "bold": "tibo", "italic": "tiit", "bolditalic": "tibi"},
    "times new roman": {"normal": "times", "bold": "tibo", "italic": "tiit", "bolditalic": "tibi"},
    "serif": {"normal": "times", "bold": "tibo", "italic": "tiit", "bolditalic": "tibi"},
    "georgia": {"normal": "times", "bold": "tibo", "italic": "tiit", "bolditalic": "tibi"},

    # Courier / Monospace
    "courier": {"normal": "couri", "bold": "cobo", "italic": "coit", "bolditalic": "cobi"},
    "courier new": {"normal": "couri", "bold": "cobo", "italic": "coit", "bolditalic": "cobi"},
    "monospace": {"normal": "couri", "bold": "cobo", "italic": "coit", "bolditalic": "cobi"},
    "consolas": {"normal": "couri", "bold": "cobo", "italic": "coit", "bolditalic": "cobi"},
}

def hex_to_rgb_float(hex_code: str) -> Tuple[float, float, float]:
    """Convert hex string (e.g. #1E293B) to RGB floats in [0, 1]."""
    if not hex_code:
        return (0.0, 0.0, 0.0)
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join(c * 2 for c in hex_code)
    if len(hex_code) != 6:
        return (0.0, 0.0, 0.0)
    r = int(hex_code[0:2], 16) / 255.0
    g = int(hex_code[2:4], 16) / 255.0
    b = int(hex_code[4:6], 16) / 255.0
    return (r, g, b)

def int_color_to_hex(color_int: int) -> str:
    """Convert integer sRGB color to hex string e.g. '#1e293b'."""
    r = (color_int >> 16) & 255
    g = (color_int >> 8) & 255
    b = color_int & 255
    return f"#{r:02x}{g:02x}{b:02x}"

def sample_bg_color(pix: pymupdf.Pixmap, bbox: List[float], text_hex: str) -> str:
    """
    Robustly samples the background color behind/around a text span bounding box.
    Filters out pixels that match the text color, returning the dominant background hex.
    """
    x0, y0, x1, y1 = [int(v) for v in bbox]
    w, h = pix.width, pix.height
    candidates = [
        (max(0, x0 - 2), min(h - 1, max(0, (y0 + y1) // 2))),
        (min(w - 1, x1 + 2), min(h - 1, max(0, (y0 + y1) // 2))),
        (min(w - 1, max(0, x0 + 1)), max(0, y0 - 2)),
        (min(w - 1, max(0, x0 + 1)), min(h - 1, max(0, y0 + 1))),
        (min(w - 1, max(0, (x0 + x1) // 2)), max(0, y0 - 2)),
        (max(0, min(w - 1, x0)), max(0, min(h - 1, y0))),
    ]
    colors = []
    text_hex_lower = text_hex.lower()
    for px, py in candidates:
        r, g, b = pix.pixel(px, py)[:3]
        hex_c = f"#{r:02x}{g:02x}{b:02x}"
        if hex_c.lower() != text_hex_lower:
            colors.append(hex_c)
    if colors:
        return Counter(colors).most_common(1)[0][0]
    r, g, b = pix.pixel(max(0, min(w - 1, x0)), max(0, min(h - 1, y0)))[:3]
    return f"#{r:02x}{g:02x}{b:02x}"

def resolve_font_name(font_name: str, bold: bool = False, italic: bool = False) -> str:
    """
    Resolve requested font name and flags to a standard PyMuPDF font name.
    """
    font_lower = font_name.lower().replace("-", " ").replace("_", " ")

    # Check font flags in string if not already flagged
    if "bold" in font_lower or "black" in font_lower or "heavy" in font_lower:
        bold = True
    if "italic" in font_lower or "oblique" in font_lower:
        italic = True

    # Determine family group
    group = "helvetica"
    if any(k in font_lower for k in ["times", "serif", "georgia", "roman", "palatino", "cambria"]):
        group = "times"
    elif any(k in font_lower for k in ["courier", "mono", "consolas", "code", "menlo"]):
        group = "courier"

    family_dict = FONT_FAMILY_MAP[group]
    if bold and italic:
        return family_dict["bolditalic"]
    elif bold:
        return family_dict["bold"]
    elif italic:
        return family_dict["italic"]
    else:
        return family_dict["normal"]

class PDFService:
    @staticmethod
    def inspect_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract document metadata, page dimensions, scanned status,
        and all text blocks with exact bounding boxes, fonts, sizes, and colors.
        """
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        total_text_length = 0
        total_image_count = 0
        pages_data = []

        for page_idx in range(page_count):
            page = doc[page_idx]
            rect = page.rect
            width = rect.width
            height = rect.height
            rotation = page.rotation

            # Extract text blocks, lines, and spans
            raw = page.get_text("dict", flags=pymupdf.TEXT_DEHYPHENATE)
            blocks_data = []
            page_text = ""
            images = page.get_images()
            total_image_count += len(images)

            # Render page pixmap to sample exact background colors
            pix = page.get_pixmap()

            span_counter = 0
            for block in raw.get("blocks", []):
                # Text blocks
                if block.get("type") == 0 and "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"].strip()
                            if not text:
                                continue

                            page_text += span["text"] + " "
                            span_counter += 1

                            flags = span.get("flags", 0)
                            font_name = span.get("font", "Helvetica")
                            font_size = round(span.get("size", 12.0), 2)
                            color_int = span.get("color", 0)
                            color_hex = int_color_to_hex(color_int)

                            is_bold = bool(flags & 16) or ("bold" in font_name.lower())
                            is_italic = bool(flags & 2) or ("italic" in font_name.lower() or "oblique" in font_name.lower())

                            bbox = [round(v, 2) for v in span.get("bbox", [0, 0, 0, 0])]
                            origin = [round(v, 2) for v in span.get("origin", [bbox[0], bbox[3]])]

                            # Sample background color behind/around the bbox
                            bg_hex = sample_bg_color(pix, bbox, color_hex)

                            blocks_data.append({
                                "id": f"p{page_idx}_{int(bbox[0])}_{int(bbox[1])}_{span_counter}",
                                "page": page_idx,
                                "text": span["text"],
                                "bbox": bbox,
                                "origin": origin,
                                "width": round(bbox[2] - bbox[0], 2),
                                "height": round(bbox[3] - bbox[1], 2),
                                "font": font_name,
                                "size": font_size,
                                "color": color_hex,
                                "bg_color": bg_hex,
                                "bold": is_bold,
                                "italic": is_italic,
                                "ascender": round(span.get("ascender", 1.0), 2),
                                "descender": round(span.get("descender", -0.3), 2),
                            })

            total_text_length += len(page_text.strip())

            # Detect whether this specific page appears scanned/image-only
            is_page_scanned = len(page_text.strip()) == 0 and len(images) > 0

            pages_data.append({
                "pageNumber": page_idx + 1,
                "width": round(width, 2),
                "height": round(height, 2),
                "rotation": rotation,
                "isScanned": is_page_scanned,
                "imageCount": len(images),
                "elements": blocks_data
            })

        # Document-wide scanned detection
        is_scanned_doc = total_text_length < 20 and total_image_count > 0

        doc.close()

        return {
            "pageCount": page_count,
            "isScanned": is_scanned_doc,
            "scannedMessage": "This PDF appears to contain scanned/image-based pages. Text editing requires OCR." if is_scanned_doc else None,
            "pages": pages_data
        }

    @staticmethod
    def apply_edits(
        original_pdf_bytes: bytes,
        edits: List[Dict[str, Any]]
    ) -> bytes:
        """
        Surgically edit existing text without re-rasterizing the document.
        Uses PyMuPDF redaction annotations to clear the exact text bbox tokens
        while leaving all surrounding text, vector graphics, and images untouched.
        Then inserts the replacement text with matched font, size, color, and baseline.
        """
        doc = pymupdf.open(stream=original_pdf_bytes, filetype="pdf")

        # Group edits by page
        edits_by_page: Dict[int, List[Dict[str, Any]]] = {}
        for edit in edits:
            p = edit.get("page", 0)
            if p not in edits_by_page:
                edits_by_page[p] = []
            edits_by_page[p].append(edit)

        for page_idx, page_edits in edits_by_page.items():
            if page_idx < 0 or page_idx >= len(doc):
                continue
            page = doc[page_idx]

            # Phase 1: Add all redaction annotations for this page
            has_redactions = False
            for edit in page_edits:
                is_new_text_box = edit.get("isNew", False)
                bbox = edit.get("bbox")
                fill_hex = edit.get("fill_color") or edit.get("bg_color") or "#ffffff"

                if not is_new_text_box and bbox:
                    # Expand rect slightly (0.5 pt) to prevent anti-aliasing ghost fringes
                    rect = pymupdf.Rect(bbox[0] - 0.5, bbox[1] - 0.5, bbox[2] + 0.5, bbox[3] + 0.5)
                    if str(fill_hex).lower() == "transparent":
                        page.add_redact_annot(rect, fill=False)
                    else:
                        fill_rgb = hex_to_rgb_float(str(fill_hex))
                        page.add_redact_annot(rect, fill=fill_rgb)
                    has_redactions = True

            # Phase 2: Apply all redactions together on the page
            if has_redactions:
                page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)

            # Phase 3: Insert replacement and new text elements
            for edit in page_edits:
                is_new_text_box = edit.get("isNew", False)
                bbox = edit.get("bbox")
                new_text = edit.get("new_text", "")
                font_name = edit.get("font", "Helvetica")
                font_size = float(edit.get("size", 12.0))
                color_hex = edit.get("color", "#000000")
                is_bold = bool(edit.get("bold", False))
                is_italic = bool(edit.get("italic", False))
                is_underline = bool(edit.get("underline", False))
                align_str = edit.get("align", "left").lower()
                origin = edit.get("origin")

                color_rgb = hex_to_rgb_float(color_hex)
                resolved_font = resolve_font_name(font_name, bold=is_bold, italic=is_italic)

                if not new_text or new_text.strip() == "":
                    # If user deleted text, redaction is complete
                    continue

                if is_new_text_box:
                    insert_rect = pymupdf.Rect(bbox[0], bbox[1], bbox[2], bbox[3]) if bbox else pymupdf.Rect(72, 72, 250, 100)
                    align_code = pymupdf.TEXT_ALIGN_LEFT
                    if align_str == "center":
                        align_code = pymupdf.TEXT_ALIGN_CENTER
                    elif align_str == "right":
                        align_code = pymupdf.TEXT_ALIGN_RIGHT

                    try:
                        page.insert_textbox(
                            insert_rect,
                            new_text,
                            fontname=resolved_font,
                            fontsize=font_size,
                            color=color_rgb,
                            align=align_code
                        )
                    except Exception:
                        page.insert_textbox(
                            insert_rect,
                            new_text,
                            fontname="helv",
                            fontsize=font_size,
                            color=color_rgb,
                            align=align_code
                        )

                    if is_underline and bbox:
                        page.draw_line(
                            pymupdf.Point(insert_rect.x0, insert_rect.y1 - 2),
                            pymupdf.Point(insert_rect.x1, insert_rect.y1 - 2),
                            color=color_rgb,
                            width=max(0.75, font_size * 0.05)
                        )
                else:
                    # In-place text replacement at exact baseline
                    char_width = font_size * 0.55
                    text_width = len(new_text) * char_width

                    if origin and len(origin) >= 2:
                        pt_x = origin[0]
                        pt_y = origin[1]
                    elif bbox:
                        pt_x = bbox[0]
                        pt_y = bbox[3] - 1.5
                    else:
                        pt_x, pt_y = 72, 72

                    # Handle alignment adjustments if width changed
                    if bbox and align_str == "center":
                        original_center = (bbox[0] + bbox[2]) / 2.0
                        pt_x = max(bbox[0], original_center - (text_width / 2.0))
                    elif bbox and align_str == "right":
                        original_right = bbox[2]
                        pt_x = max(bbox[0], original_right - text_width)

                    try:
                        page.insert_text(
                            pymupdf.Point(pt_x, pt_y),
                            new_text,
                            fontname=resolved_font,
                            fontsize=font_size,
                            color=color_rgb
                        )
                    except Exception:
                        # Fallback to standard Helvetica if specific font identifier fails
                        page.insert_text(
                            pymupdf.Point(pt_x, pt_y),
                            new_text,
                            fontname="helv",
                            fontsize=font_size,
                            color=color_rgb
                        )

                    if is_underline:
                        underline_y = pt_y + 1.5
                        page.draw_line(
                            pymupdf.Point(pt_x, underline_y),
                            pymupdf.Point(pt_x + text_width, underline_y),
                            color=color_rgb,
                            width=max(0.75, font_size * 0.05)
                        )

        # Output modified PDF stream
        output_stream = io.BytesIO()
        doc.save(output_stream, garbage=3, deflate=True)
        doc.close()
        return output_stream.getvalue()
