#!/usr/bin/env python3
"""
PDF Parser for Exam Schedules
Extracts exam information from the PDF file and creates a JSON file for database import.
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber is not installed.")
    print("Please install it using: pip install pdfplumber")
    sys.exit(1)


def parse_date(date_str: str, year: int = 2025) -> Optional[datetime]:
    """Parse date string like 'Dec 15' or '15 Dec' to datetime"""
    months = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    
    date_str = date_str.strip().lower()
    
    # Try patterns like "Dec 15", "15 Dec", "December 15"
    patterns = [
        r'(\w{3,9})\s+(\d{1,2})',  # "Dec 15" or "December 15"
        r'(\d{1,2})\s+(\w{3,9})',  # "15 Dec"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, date_str)
        if match:
            if match.group(1).isdigit():
                day = int(match.group(1))
                month_str = match.group(2)[:3]
            else:
                month_str = match.group(1)[:3]
                day = int(match.group(2))
            
            if month_str in months:
                try:
                    return datetime(year, months[month_str], day)
                except ValueError:
                    pass
    
    return None


def parse_time(time_str: str) -> tuple[Optional[str], Optional[str]]:
    """Parse time string like '09:00-11:00' or '9:00 AM - 11:00 AM'"""
    if not time_str:
        return None, None
    
    time_str = time_str.strip()
    
    # Pattern for "09:00-11:00" or "9:00-11:00"
    pattern1 = r'(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})'
    match = re.search(pattern1, time_str)
    if match:
        start_hour = int(match.group(1))
        start_min = match.group(2)
        end_hour = int(match.group(3))
        end_min = match.group(4)
        return f"{start_hour:02d}:{start_min}", f"{end_hour:02d}:{end_min}"
    
    # Pattern for "9:00 AM - 11:00 AM"
    pattern2 = r'(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)'
    match = re.search(pattern2, time_str, re.IGNORECASE)
    if match:
        start_hour = int(match.group(1))
        start_ampm = match.group(3).upper()
        end_hour = int(match.group(4))
        end_ampm = match.group(6).upper()
        
        if start_ampm == 'PM' and start_hour != 12:
            start_hour += 12
        if start_ampm == 'AM' and start_hour == 12:
            start_hour = 0
        
        if end_ampm == 'PM' and end_hour != 12:
            end_hour += 12
        if end_ampm == 'AM' and end_hour == 12:
            end_hour = 0
        
        return f"{start_hour:02d}:{match.group(2)}", f"{end_hour:02d}:{match.group(5)}"
    
    return None, None


def extract_exam_data(text: str, term: str = "Term 1", year: int = 2025) -> List[Dict]:
    """Extract exam information from text"""
    exams = []
    lines = text.split('\n')
    
    # Course code pattern (e.g., "CSCI 1001", "MATH 2003")
    course_code_pattern = r'([A-Z]{2,6}\s*\d{4}[A-Z]?)'
    
    current_exam = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Look for course code
        course_match = re.search(course_code_pattern, line)
        if course_match:
            # Save previous exam if exists
            if current_exam and current_exam.get('courseCode'):
                exams.append(current_exam)
            
            # Start new exam
            course_code = course_match.group(1).replace(' ', '')
            current_exam = {
                'courseCode': course_code,
                'courseName': '',
                'examDate': None,
                'startTime': None,
                'endTime': None,
                'location': None,
                'term': term,
                'year': year
            }
            
            # Try to extract course name (usually after course code)
            name_part = line[course_match.end():].strip()
            if name_part and len(name_part) > 3:
                current_exam['courseName'] = name_part[:200]  # Limit length
        
        # Look for date patterns
        if current_exam and not current_exam.get('examDate'):
            date_match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}', line, re.IGNORECASE)
            if date_match:
                parsed_date = parse_date(date_match.group(0), year)
                if parsed_date:
                    current_exam['examDate'] = parsed_date.isoformat()
        
        # Look for time patterns
        if current_exam and not current_exam.get('startTime'):
            start_time, end_time = parse_time(line)
            if start_time and end_time:
                current_exam['startTime'] = start_time
                current_exam['endTime'] = end_time
        
        # Look for location (usually contains room numbers or building names)
        if current_exam and not current_exam.get('location'):
            location_patterns = [
                r'([A-Z]+\s*\d+[A-Z]?)',  # "LT1", "ERB 101"
                r'(Room\s+\d+)',  # "Room 101"
                r'(Lecture\s+Theatre\s+\d+)',  # "Lecture Theatre 1"
            ]
            for pattern in location_patterns:
                loc_match = re.search(pattern, line, re.IGNORECASE)
                if loc_match:
                    current_exam['location'] = loc_match.group(1)
                    break
    
    # Add last exam
    if current_exam and current_exam.get('courseCode'):
        exams.append(current_exam)
    
    return exams


def extract_from_tables(pdf_path: str, term: str = "Term 1", year: int = 2025) -> List[Dict]:
    """Extract exam data from PDF tables"""
    exams = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processing page {page_num}...")
            
            # Extract tables
            tables = page.extract_tables()
            if tables:
                print(f"  Found {len(tables)} table(s) on page {page_num}")
                
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Assume first row is header, skip it
                    for row in table[1:]:
                        if not row or len(row) < 16:
                            continue
                        
                        # Based on the table structure:
                        # Index 3: Course Code
                        # Index 6: Course Title
                        # Index 9: Exam Date
                        # Index 12: Start Time
                        # Index 15: End Time
                        
                        course_code = None
                        course_name = None
                        exam_date = None
                        start_time = None
                        end_time = None
                        location = None
                        
                        # Extract course code (index 3)
                        if len(row) > 3 and row[3]:
                            course_code = str(row[3]).strip()
                            # Clean up course code
                            course_code = re.sub(r'\s+', '', course_code)
                        
                        # Extract course name (index 6)
                        if len(row) > 6 and row[6]:
                            course_name = str(row[6]).strip()
                        
                        # Extract exam date (index 9)
                        if len(row) > 9 and row[9]:
                            date_str = str(row[9]).strip()
                            # Parse date like "December 14 2025 (Sunday)"
                            date_match = re.search(r'(\w+)\s+(\d{1,2})\s+(\d{4})', date_str)
                            if date_match:
                                month_str = date_match.group(1)
                                day = int(date_match.group(2))
                                date_year = int(date_match.group(3))
                                parsed_date = parse_date(f"{month_str} {day}", date_year)
                                if parsed_date:
                                    exam_date = parsed_date.isoformat()
                        
                        # Extract start time (index 12)
                        if len(row) > 12 and row[12]:
                            time_str = str(row[12]).strip()
                            # Format: "08:30:00" -> "08:30"
                            time_match = re.search(r'(\d{1,2}):(\d{2})', time_str)
                            if time_match:
                                start_time = f"{int(time_match.group(1)):02d}:{time_match.group(2)}"
                        
                        # Extract end time (index 15)
                        if len(row) > 15 and row[15]:
                            time_str = str(row[15]).strip()
                            # Format: "10:00:00" -> "10:00"
                            time_match = re.search(r'(\d{1,2}):(\d{2})', time_str)
                            if time_match:
                                end_time = f"{int(time_match.group(1)):02d}:{time_match.group(2)}"
                        
                        if course_code:
                            exam = {
                                'courseCode': course_code,
                                'courseName': course_name or '',
                                'examDate': exam_date,
                                'startTime': start_time,
                                'endTime': end_time,
                                'location': location,
                                'term': term,
                                'year': year
                            }
                            exams.append(exam)
            
            # Also extract text for fallback
            text = page.extract_text()
            if text:
                text_exams = extract_exam_data(text, term, year)
                # Merge with table exams, avoiding duplicates
                for text_exam in text_exams:
                    if not any(e.get('courseCode') == text_exam.get('courseCode') and 
                              e.get('examDate') == text_exam.get('examDate') 
                              for e in exams):
                        exams.append(text_exam)
    
    return exams


def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_exam_schedules.py <pdf_path> [term] [year]")
        print("Example: python parse_exam_schedules.py 'exam_schedule.pdf' 'Term 1' 2025")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    term = sys.argv[2] if len(sys.argv) > 2 else "Term 1"
    year = int(sys.argv[3]) if len(sys.argv) > 3 else 2025
    
    if not Path(pdf_path).exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Parsing exam schedule PDF: {pdf_path}")
    print(f"Term: {term}, Year: {year}\n")
    
    exams = extract_from_tables(pdf_path, term, year)
    
    print(f"\nExtracted {len(exams)} exam entries")
    
    # Save to JSON
    output_path = Path(pdf_path).stem + '_exams.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(exams, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {output_path}")
    
    # Print sample
    if exams:
        print("\nSample entries (first 5):")
        for exam in exams[:5]:
            print(f"  {exam.get('courseCode')}: {exam.get('courseName')[:50]}...")
            print(f"    Date: {exam.get('examDate')}, Time: {exam.get('startTime')}-{exam.get('endTime')}")
            print(f"    Location: {exam.get('location') or 'N/A'}")


if __name__ == '__main__':
    main()

