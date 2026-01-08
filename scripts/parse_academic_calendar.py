#!/usr/bin/env python3
"""Parse academic calendar PDF and extract events"""

import pdfplumber
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

def parse_date_from_text(text: str, month: int, year: int) -> Optional[datetime]:
    """Parse date from text like 'Aug 17' or '17'"""
    # Try patterns like "Aug 17", "17", "Aug 17 - 18"
    patterns = [
        (r'(\w{3})\s+(\d{1,2})', '%b %d'),  # Aug 17
        (r'(\d{1,2})', '%d'),  # 17
    ]
    
    for pattern, fmt in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                if fmt == '%b %d':
                    month_name, day = match.groups()
                    date_obj = datetime.strptime(f"{month_name} {day}", "%b %d")
                    date_obj = date_obj.replace(year=year, month=month)
                    return date_obj
                elif fmt == '%d':
                    day = int(match.group(1))
                    return datetime(year, month, day)
            except:
                continue
    return None

def extract_month_year(text: str) -> Optional[Tuple[int, int]]:
    """Extract month and year from text like 'August - 2025'"""
    patterns = [
        (r'(\w+)\s*-\s*(\d{4})', '%B %Y'),  # August - 2025
        (r'(\w+)\s+(\d{4})', '%B %Y'),  # August 2025
    ]
    
    for pattern, fmt in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                month_name, year_str = match.groups()
                date_obj = datetime.strptime(f"{month_name} {year_str}", "%B %Y")
                return (date_obj.month, date_obj.year)
            except:
                continue
    return None

def determine_event_type(name: str) -> str:
    """Determine event type from event name"""
    name_lower = name.lower()
    
    if any(word in name_lower for word in ['registration', 'register']):
        return 'REGISTRATION'
    elif any(word in name_lower for word in ['exam', 'examination', 'final']):
        return 'EXAM'
    elif any(word in name_lower for word in ['holiday', 'public holiday']):
        return 'HOLIDAY'
    elif any(word in name_lower for word in ['add', 'drop', 'add/drop']):
        return 'ADD_DROP'
    elif any(word in name_lower for word in ['class', 'make-up', 'makeup']):
        return 'CLASS_MAKEUP'
    elif any(word in name_lower for word in ['first day', 'last day', 'start', 'end', 'begin', 'commence']):
        return 'TERM_START_END'
    else:
        return 'OTHER'

def extract_term_info(text: str) -> Dict:
    """Extract term information from text"""
    term_info = {}
    
    # Look for term patterns like "First Term: September 1 - December 12"
    term_pattern = r'(First|Second|Third|Summer)\s+Term:\s*(\w+)\s+(\d{1,2})\s*-\s*(\w+)\s+(\d{1,2})'
    match = re.search(term_pattern, text, re.IGNORECASE)
    if match:
        term_name = match.group(1)
        start_month = match.group(2)
        start_day = int(match.group(3))
        end_month = match.group(4)
        end_day = int(match.group(5))
        
        # Parse dates
        try:
            start_date = datetime.strptime(f"{start_month} {start_day} 2025", "%B %d %Y")
            end_date = datetime.strptime(f"{end_month} {end_day} 2025", "%B %d %Y")
            term_info = {
                'name': f"{term_name} Term",
                'start_date': start_date.strftime("%Y-%m-%d"),
                'end_date': end_date.strftime("%Y-%m-%d"),
            }
        except:
            pass
    
    return term_info

def extract_calendar_events(pdf_path: str) -> List[Dict]:
    """Extract academic calendar events from PDF"""
    events = []
    full_text = ""
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        # Extract all text
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                full_text += text + "\n"
        
        print("\n=== Full Text (first 2000 chars) ===")
        print(full_text[:2000])
        print("\n" + "="*80 + "\n")
        
        # Extract term information
        term_info = extract_term_info(full_text)
        if term_info:
            print(f"Found term: {term_info}")
        
        # Parse events from text
        # Look for patterns like "* Aug 17 - 18: Y2-4 Ug Course Registration for T1 (Tentative)"
        # Also handle "Aug 31 - Sep 12: Add/Drop for T1"
        event_patterns = [
            r'\*\s*(\w{3})\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?:\s*(.+?)(?=\n|\*|$)',
            r'(\w{3})\s+(\d{1,2})(?:\s*-\s*(\w{3})\s+(\d{1,2}))?:\s*(.+?)(?=\n|$)',
            r'(\w{3})\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?:\s*(.+?)(?=\n|$)',
        ]
        
        # Track current context (month/year) as we parse
        context_month = 8  # August 2025
        context_year = 2025
        
        # Parse events
        for pattern in event_patterns:
            matches = re.finditer(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                try:
                    # Handle different pattern formats
                    if len(match.groups()) == 4 and match.group(3) and match.group(3)[0].isalpha():
                        # Format: "Aug 31 - Sep 12: ..."
                        start_month_name = match.group(1)
                        start_day = int(match.group(2))
                        end_month_name = match.group(3)
                        end_day = int(match.group(4))
                        event_desc = match.group(5).strip()
                        
                        start_month = datetime.strptime(start_month_name, "%b").month
                        end_month = datetime.strptime(end_month_name, "%b").month
                        
                        # Determine year based on month
                        start_year = 2025 if start_month >= 8 else 2026
                        end_year = 2025 if end_month >= 8 else 2026
                        
                        start_date = datetime(start_year, start_month, start_day)
                        end_date = datetime(end_year, end_month, end_day)
                    else:
                        # Format: "Aug 17 - 18: ..." or "Aug 17: ..."
                        month_name = match.group(1)
                        start_day = int(match.group(2))
                        end_day = int(match.group(3)) if match.group(3) and match.group(3).isdigit() else None
                        event_desc = match.group(4).strip()
                        
                        month_num = datetime.strptime(month_name, "%b").month
                        
                        # Determine year based on month (Aug-Dec 2025, Jan-Jul 2026)
                        year = 2025 if month_num >= 8 else 2026
                        
                        start_date = datetime(year, month_num, start_day)
                        
                        if end_day:
                            end_date = datetime(year, month_num, end_day)
                        else:
                            end_date = start_date
                    
                    event_type = determine_event_type(event_desc)
                    
                    # Determine term
                    term = "T1"
                    if "T2" in event_desc or "Term 2" in event_desc or "Second Term" in event_desc:
                        term = "T2"
                    elif "T3" in event_desc or "Term 3" in event_desc:
                        term = "T3"
                    elif "Summer" in event_desc or "SS" in event_desc:
                        term = "SUMMER"
                    elif "T1" in event_desc or "Term 1" in event_desc or "First Term" in event_desc:
                        term = "T1"
                    
                    # Fix specific event types
                    if "National Day" in event_desc or "Mid-Autumn" in event_desc:
                        event_type = "HOLIDAY"
                        term = "T1"
                    if "Chinese New Year" in event_desc or "Qingming" in event_desc or "Labor Day" in event_desc:
                        event_type = "HOLIDAY"
                    if "Class Make-up" in event_desc:
                        event_type = "CLASS_MAKEUP"
                        term = "T1"  # Fix term
                    
                    event = {
                        'event_type': event_type,
                        'term': term,
                        'year': start_date.year,
                        'start_date': start_date.strftime("%Y-%m-%d"),
                        'end_date': end_date.strftime("%Y-%m-%d") if end_date != start_date else None,
                        'name': event_desc,
                        'description': None,
                    }
                    
                    events.append(event)
                    print(f"Extracted: {event['name']} on {event['start_date']}" + (f" to {event['end_date']}" if event['end_date'] else ""))
                    
                except Exception as e:
                    print(f"Error parsing event: {match.group(0)} - {e}")
        
        # Also extract from tables
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        # Look for month header
                        header = table[0] if table else []
                        if 'Month' in str(header):
                            # Process calendar grid
                            for row_idx, row in enumerate(table[1:], 1):
                                if not row:
                                    continue
                                
                                # First cell might contain month name
                                month_cell = row[0] if row[0] else None
                                if month_cell and extract_month_year(month_cell):
                                    current_month, current_year = extract_month_year(month_cell)
                                
                                # Process date cells (columns 1-7 for days of week)
                                for col_idx in range(1, min(8, len(row))):
                                    cell = row[col_idx]
                                    if not cell:
                                        continue
                                    
                                    # Check if cell has asterisk (indicates event)
                                    if '*' in str(cell):
                                        # Try to extract date
                                        day_match = re.search(r'(\d{1,2})', str(cell))
                                        if day_match and current_month:
                                            day = int(day_match.group(1))
                                            try:
                                                date_obj = datetime(current_year, current_month, day)
                                                # Look for corresponding event description in text
                                                date_str = date_obj.strftime("%b %d")
                                                # This is a simplified approach - in reality, we'd need
                                                # to map the calendar grid to event descriptions
                                            except:
                                                pass
    
    return events

if __name__ == '__main__':
    pdf_path = 'Annex 2 Calendar View of Academic Calendar 2025-26 (Tentative)-Revised to Website -Updated Version-FINAL-PDF_1.pdf'
    
    print("Extracting calendar events from PDF...")
    events = extract_calendar_events(pdf_path)
    
    print(f"\nExtracted {len(events)} events")
    
    # Save to JSON for inspection
    with open('academic_calendar_events.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    
    print("\nEvents saved to academic_calendar_events.json")
    print("\nSample events:")
    for event in events[:5]:
        print(f"  - {event['name']} ({event['start_date']})")
