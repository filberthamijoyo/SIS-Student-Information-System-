#!/usr/bin/env python3
"""Inspect PDF structure to understand the format"""

import pdfplumber

pdf_path = 'Formal Course Registration Course Offering Information_AY2025-26 Term 1(Updated on August 15)[68] copy.pdf'

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}\n")
    
    # Check first page
    page = pdf.pages[0]
    print("=== PAGE 1 TEXT (first 3000 chars) ===")
    text = page.extract_text()
    print(text[:3000])
    print("\n" + "="*80 + "\n")
    
    # Check tables
    print("=== PAGE 1 TABLES ===")
    tables = page.extract_tables()
    print(f"Found {len(tables)} table(s)\n")
    
    if tables:
        table = tables[0]
        print(f"Table dimensions: {len(table)} rows x {len(table[0]) if table else 0} columns\n")
        print("First 10 rows:")
        for i, row in enumerate(table[:10]):
            print(f"Row {i}: {row}")







