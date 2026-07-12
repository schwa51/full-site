#!/usr/bin/env python3
"""Normalize the fillable Paranoia character sheet for browser-side population."""

from pathlib import Path
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    ByteStringObject,
    BooleanObject,
    DictionaryObject,
    FloatObject,
    NameObject,
    NumberObject,
    TextStringObject,
)


CLEARANCE_CODES = {
    "Infrared": "IR",
    "Red": "R",
    "Orange": "O",
    "Yellow": "Y",
    "Green": "G",
    "Blue": "B",
    "Indigo": "I",
    "Violet": "V",
    "Ultraviolet": "UV",
}


def field_name(widget):
    if widget.get("/T"):
        return str(widget["/T"])
    parent = widget.get("/Parent")
    if parent and parent.get_object().get("/T"):
        return str(parent.get_object()["/T"])
    return ""


def normalize_rectangles(writer):
    for page in writer.pages:
        for reference in page.get("/Annots", []):
            annotation = reference.get_object()
            rectangle = annotation.get("/Rect")
            if rectangle:
                annotation[NameObject("/Rect")] = ArrayObject(FloatObject(float(value)) for value in rectangle)


def remove_overlapping_autocar(writer):
    page = writer.pages[1]
    annotations = page["/Annots"]
    for reference in list(annotations):
        widget = reference.get_object()
        rectangle = [float(value) for value in widget.get("/Rect", [])]
        if field_name(widget) != "Autocar Op  Maint" or not rectangle or rectangle[1] < 300:
            continue
        annotations.remove(reference)
        parent_reference = widget.get("/Parent")
        if parent_reference:
            kids = parent_reference.get_object().get("/Kids", [])
            if reference in kids:
                kids.remove(reference)
        return
    raise RuntimeError("The overlapping Autocar widget was not found.")


def set_notes_multiline(writer):
    for field_reference in writer.root_object["/AcroForm"].get_object()["/Fields"]:
        field = field_reference.get_object()
        if str(field.get("/T", "")) == "Notes":
            field[NameObject("/Ff")] = NumberObject(int(field.get("/Ff", 0)) | 4096)
            field[NameObject("/DA")] = ByteStringObject(b"/Helv 10 Tf 0 g")
            return
    raise RuntimeError("The Notes field was not found.")


def add_text_field(writer, name, rectangle):
    page = writer.pages[1]
    field = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Annot"),
            NameObject("/Subtype"): NameObject("/Widget"),
            NameObject("/FT"): NameObject("/Tx"),
            NameObject("/T"): TextStringObject(name),
            NameObject("/TU"): TextStringObject(name),
            NameObject("/F"): NumberObject(4),
            NameObject("/Ff"): NumberObject(0),
            NameObject("/Rect"): ArrayObject(FloatObject(value) for value in rectangle),
            NameObject("/DA"): TextStringObject("/Helv 0 Tf 0 g"),
            NameObject("/MK"): DictionaryObject(
                {
                    NameObject("/BC"): ArrayObject(),
                    NameObject("/BG"): ArrayObject(),
                }
            ),
            NameObject("/BS"): DictionaryObject(
                {
                    NameObject("/W"): NumberObject(0),
                    NameObject("/S"): NameObject("/S"),
                }
            ),
            NameObject("/P"): page.indirect_reference,
        }
    )
    reference = writer._add_object(field)
    page["/Annots"].append(reference)
    writer.root_object["/AcroForm"].get_object()["/Fields"].append(reference)


def group_clearance_buttons(writer):
    page = writer.pages[1]
    acroform = writer.root_object["/AcroForm"].get_object()
    top_fields = acroform["/Fields"]
    widgets = []
    old_field_references = []

    for reference in list(page["/Annots"]):
        widget = reference.get_object()
        name = field_name(widget)
        if name not in CLEARANCE_CODES:
            continue
        code = CLEARANCE_CODES[name]
        widgets.append((reference, widget, code))
        direct_parent = widget.get("/Parent")
        old_field_references.append(direct_parent if direct_parent else reference)

    if len(widgets) != len(CLEARANCE_CODES):
        raise RuntimeError(f"Expected nine clearance buttons; found {len(widgets)}.")

    parent = DictionaryObject(
        {
            NameObject("/FT"): NameObject("/Btn"),
            NameObject("/Ff"): NumberObject(49152),
            NameObject("/T"): TextStringObject("Security Clearance"),
            NameObject("/TU"): TextStringObject("Security Clearance"),
            NameObject("/V"): NameObject("/Off"),
            NameObject("/Kids"): ArrayObject(reference for reference, _, _ in widgets),
        }
    )
    parent_reference = writer._add_object(parent)

    for reference, widget, code in widgets:
        normal = widget["/AP"]["/N"].get_object()
        on_reference = normal.get("/Choice1")
        if on_reference is None:
            on_reference = next(value for key, value in normal.items() if str(key) != "/Off")
        for key in list(normal.keys()):
            if str(key) != "/Off":
                del normal[key]
        normal[NameObject(f"/{code}")] = on_reference
        widget[NameObject("/AS")] = NameObject("/Off")
        widget[NameObject("/Parent")] = parent_reference
        for key in ("/T", "/TU", "/FT", "/Ff", "/V"):
            if key in widget:
                del widget[key]

    for reference in old_field_references:
        if reference in top_fields:
            top_fields.remove(reference)
    top_fields.append(parent_reference)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: normalize-paranoia-character-pdf.py SOURCE.pdf DESTINATION.pdf")
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    destination.parent.mkdir(parents=True, exist_ok=True)

    writer = PdfWriter()
    writer.clone_document_from_reader(PdfReader(source))
    normalize_rectangles(writer)
    remove_overlapping_autocar(writer)
    set_notes_multiline(writer)
    add_text_field(writer, "Carrying Capacity", [191.5, 615.4, 224.0, 629.6])
    add_text_field(writer, "Force Sword", [84.0, 414.9, 184.3, 428.2])
    group_clearance_buttons(writer)
    writer.root_object["/AcroForm"].get_object()[NameObject("/NeedAppearances")] = BooleanObject(False)

    with destination.open("wb") as output:
        writer.write(output)


if __name__ == "__main__":
    main()
