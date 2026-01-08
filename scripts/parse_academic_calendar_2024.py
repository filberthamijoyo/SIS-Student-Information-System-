#!/usr/bin/env python3
"""Parse academic calendar PDF for 2024-2025 and extract events"""

import pdfplumber
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

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
    elif any(word in name_lower for word in ['first day', 'last day', 'start', 'end', 'begin', 'commence', 'teaching day']):
        return 'TERM_START_END'
    else:
        return 'OTHER'

def extract_calendar_events(pdf_path: str) -> List[Dict]:
    """Extract academic calendar events from PDF for 2024-2025"""
    events = []
    full_text = ""
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        # Extract all text
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                full_text += text + "\n"
        
        print("\n=== Full Text (first 3000 chars) ===")
        print(full_text[:3000])
        print("\n" + "="*80 + "\n")
        
        # Parse events from text
        # Look for patterns like "* Aug 17 - 18: Y2-4 Ug Course Registration for T1 (Tentative)"
        # Also handle "Aug 31 - Sep 12: Add/Drop for T1"
        event_patterns = [
            r'\*\s*(\w{3})\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?:\s*(.+?)(?=\n|\*|$)',
            r'(\w{3})\s+(\d{1,2})(?:\s*-\s*(\w{3})\s+(\d{1,2}))?:\s*(.+?)(?=\n|$)',
            r'(\w{3})\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?:\s*(.+?)(?=\n|$)',
        ]
        
        # Parse events
        for pattern in event_patterns:
            matches = re.finditer(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                try:
                    # Handle different pattern formats
                    if len(match.groups()) == 5 and match.group(3) and match.group(3)[0].isalpha():
                        # Format: "Aug 31 - Sep 12: ..."
                        start_month_name = match.group(1)
                        start_day = int(match.group(2))
                        end_month_name = match.group(3)
                        end_day = int(match.group(4))
                        event_desc = match.group(5).strip()
                        
                        start_month = datetime.strptime(start_month_name, "%b").month
                        end_month = datetime.strptime(end_month_name, "%b").month
                        
                        # Determine year based on month (Aug-Dec 2024, Jan-Jul 2025)
                        start_year = 2024 if start_month >= 8 else 2025
                        end_year = 2024 if end_month >= 8 else 2025
                        
                        start_date = datetime(start_year, start_month, start_day)
                        end_date = datetime(end_year, end_month, end_day)
                    else:
                        # Format: "Aug 17 - 18: ..." or "Aug 17: ..."
                        month_name = match.group(1)
                        start_day = int(match.group(2))
                        end_day = int(match.group(3)) if match.group(3) and match.group(3).isdigit() else None
                        event_desc = match.group(4).strip()
                        
                        month_num = datetime.strptime(month_name, "%b").month
                        
                        # Determine year based on month (Aug-Dec 2024, Jan-Jul 2025)
                        year = 2024 if month_num >= 8 else 2025
                        
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
    
    return events

if __name__ == '__main__':
    pdf_path = 'Calendar View of Academic Calendar 2024-25 -Final (1).pdf'
    
    print("Extracting calendar events from 2024-2025 PDF...")
    events = extract_calendar_events(pdf_path)
    
    print(f"\nExtracted {len(events)} events")
    
    # Save to JSON for inspection
    with open('academic_calendar_events_2024.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    
    print("\nEvents saved to academic_calendar_events_2024.json")
    print("\nSample events:")
    for event in events[:10]:
        print(f"  - {event['name']} ({event['start_date']})")







