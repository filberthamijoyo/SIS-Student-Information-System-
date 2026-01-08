#!/usr/bin/env python3
"""
PDF Parser for Course Registration Data
Extracts courses and instructors from the PDF file and creates a JSON file.
"""

import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber is not installed.")
    print("Please install it using: pip install pdfplumber")
    sys.exit(1)


def extract_course_data(text):
    """
    Extract course information from text.
    This function needs to be customized based on the PDF structure.
    """
    courses = []
    
    # Common patterns for course data
    # Course code pattern (e.g., "CSCI 1001", "MATH 2003")
    course_code_pattern = r'([A-Z]{2,6}\s+\d{4})'
    
    # Try to find course entries
    lines = text.split('\n')
    
    current_course = None
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Look for course code
        course_code_match = re.search(course_code_pattern, line)
        if course_code_match:
            # Save previous course if exists
            if current_course:
                courses.append(current_course)
            
            # Start new course
            course_code = course_code_match.group(1)
            current_course = {
                'course_code': course_code,
                'course_name': '',
                'department': course_code.split()[0] if ' ' in course_code else '',
                'instructor_name': '',
                'instructor_email': '',
                'credits': 3,  # Default, will try to extract
                'semester': 'FALL',  # Based on filename
                'year': 2025,  # Based on filename AY2025-26
            }
            
            # Try to extract course name (usually on same line or next)
            remaining = line[course_code_match.end():].strip()
            if remaining:
                current_course['course_name'] = remaining.split('  ')[0].strip()
        
        # Look for instructor information
        if current_course:
            # Common patterns for instructor names
            if 'instructor' in line.lower() or 'prof' in line.lower() or 'dr.' in line.lower():
                # Extract name
                name_match = re.search(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', line)
                if name_match:
                    current_course['instructor_name'] = name_match.group(1)
            
            # Look for email
            email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', line)
            if email_match:
                current_course['instructor_email'] = email_match.group(1)
            
            # Look for credits
            credits_match = re.search(r'(\d+)\s*(?:credit|unit)', line, re.IGNORECASE)
            if credits_match:
                current_course['credits'] = int(credits_match.group(1))
    
    # Add last course
    if current_course:
        courses.append(current_course)
    
    return courses


def parse_pdf(pdf_path):
    """Parse PDF and extract all text."""
    all_text = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processing page {page_num}...")
            text = page.extract_text()
            if text:
                all_text.append(text)
            
            # Also try to extract tables if present
            tables = page.extract_tables()
            if tables:
                print(f"  Found {len(tables)} table(s) on page {page_num}")
                for table in tables:
                    # Convert table to text representation
                    table_text = '\n'.join([' | '.join([str(cell) if cell else '' for cell in row]) for row in table])
                    all_text.append(table_text)
    
    return '\n\n'.join(all_text)


def extract_from_tables(pdf_path):
    """Extract data from PDF tables if they exist."""
    courses = []
    instructors_map = {}  # Map instructor names to their data
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            
            for table in tables:
                if not table or len(table) < 2:
                    continue
                
                # Find header row (usually row 1, but row 0 might be notes)
                header_row_idx = None
                for i, row in enumerate(table[:3]):  # Check first 3 rows
                    if row and len(row) > 5:
                        row_str = ' '.join([str(cell) if cell else '' for cell in row]).lower()
                        if 'course code' in row_str and 'instructor' in row_str:
                            header_row_idx = i
                            break
                
                if header_row_idx is None:
                    # Try to identify by column content
                    for i, row in enumerate(table[:3]):
                        if row and len(row) >= 5:
                            # Check if this looks like a header row
                            if any('department' in str(cell).lower() if cell else '' for cell in row):
                                header_row_idx = i
                                break
                
                if header_row_idx is None:
                    continue
                
                # Get headers
                headers = [str(cell).strip() if cell else '' for cell in table[header_row_idx]]
                
                # Map column indices
                dept_idx = None
                code_idx = None
                title_idx = None
                units_idx = None
                instructor_idx = None
                
                for i, header in enumerate(headers):
                    header_lower = header.lower()
                    if 'department' in header_lower:
                        dept_idx = i
                    elif 'course code' in header_lower or 'code' in header_lower:
                        code_idx = i
                    elif 'course title' in header_lower or 'title' in header_lower:
                        title_idx = i
                    elif 'unit' in header_lower:
                        units_idx = i
                    elif 'instructor' in header_lower:
                        instructor_idx = i
                
                # Process data rows (start after header)
                for row_idx in range(header_row_idx + 1, len(table)):
                    row = table[row_idx]
                    if not row or len(row) < 3:
                        continue
                    
                    # Extract department
                    department = ''
                    if dept_idx is not None and dept_idx < len(row) and row[dept_idx]:
                        department = str(row[dept_idx]).strip()
                    
                    # Extract course code
                    course_code = ''
                    if code_idx is not None and code_idx < len(row) and row[code_idx]:
                        course_code = str(row[code_idx]).strip()
                    
                    # Skip if no course code
                    if not course_code or not re.match(r'^[A-Z]{2,6}\s*\d{4}', course_code):
                        continue
                    
                    # Normalize course code (remove extra spaces)
                    course_code = re.sub(r'\s+', ' ', course_code)
                    
                    # Extract course title
                    course_name = ''
                    if title_idx is not None and title_idx < len(row) and row[title_idx]:
                        course_name = str(row[title_idx]).strip().replace('\n', ' ')
                    
                    # Extract units/credits
                    credits = 3  # Default
                    if units_idx is not None and units_idx < len(row) and row[units_idx]:
                        units_str = str(row[units_idx]).strip()
                        credits_match = re.search(r'(\d+)', units_str)
                        if credits_match:
                            credits = int(credits_match.group(1))
                    
                    # Extract instructor(s)
                    instructor_names = []
                    if instructor_idx is not None and instructor_idx < len(row) and row[instructor_idx]:
                        instructor_str = str(row[instructor_idx]).strip()
                        # Split by semicolon or newline
                        instructor_names = [name.strip() for name in re.split(r'[;\n]', instructor_str) if name.strip()]
                    
                    # Create course entry
                    course = {
                        'course_code': course_code,
                        'course_name': course_name,
                        'department': department,
                        'instructor_names': instructor_names,  # List of instructor names
                        'credits': credits,
                        'semester': 'FALL',
                        'year': 2025,
                    }
                    
                    courses.append(course)
                    
                    # Track instructors
                    for instructor_name in instructor_names:
                        if instructor_name and instructor_name not in instructors_map:
                            instructors_map[instructor_name] = {
                                'name': instructor_name,
                                'email': '',  # Will need to be filled
                                'department': department,
                            }
    
    return courses, instructors_map


def main():
    pdf_path = Path('Formal Course Registration Course Offering Information_AY2025-26 Term 1(Updated on August 15)[68] copy.pdf')
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Parsing PDF: {pdf_path}")
    
    # Try extracting from tables first (more structured)
    print("\nAttempting to extract data from tables...")
    courses, instructors_map = extract_from_tables(pdf_path)
    
    # If no courses found from tables, try text extraction
    if not courses:
        print("\nNo table data found. Attempting text extraction...")
        text = parse_pdf(pdf_path)
        courses = extract_course_data(text)
        instructors_map = {}
        
        # Build instructors map from courses
        for course in courses:
            if course['instructor_name']:
                if course['instructor_name'] not in instructors_map:
                    instructors_map[course['instructor_name']] = {
                        'name': course['instructor_name'],
                        'email': course['instructor_email'],
                        'department': course['department'],
                    }
    
    # Remove duplicates based on course_code
    seen_codes = set()
    unique_courses = []
    for course in courses:
        if course['course_code'] not in seen_codes:
            seen_codes.add(course['course_code'])
            unique_courses.append(course)
    
    courses = unique_courses
    
    print(f"\nExtracted {len(courses)} unique courses")
    print(f"Extracted {len(instructors_map)} unique instructors")
    
    # Convert courses to have single instructor (first one) for backward compatibility
    # But also keep the full list
    courses_with_instructors = []
    for course in courses:
        # Create one entry per instructor if multiple instructors
        if course.get('instructor_names'):
            for instructor_name in course['instructor_names']:
                course_entry = {
                    'course_code': course['course_code'],
                    'course_name': course['course_name'],
                    'department': course['department'],
                    'instructor_name': instructor_name,
                    'instructor_email': '',
                    'credits': course['credits'],
                    'semester': course['semester'],
                    'year': course['year'],
                }
                courses_with_instructors.append(course_entry)
        else:
            # No instructor listed
            course_entry = {
                'course_code': course['course_code'],
                'course_name': course['course_name'],
                'department': course['department'],
                'instructor_name': '',
                'instructor_email': '',
                'credits': course['credits'],
                'semester': course['semester'],
                'year': course['year'],
            }
            courses_with_instructors.append(course_entry)
    
    # Create output structure
    output = {
        'courses': courses_with_instructors,
        'instructors': list(instructors_map.values()),
        'metadata': {
            'total_courses': len(courses),
            'total_course_instructor_pairs': len(courses_with_instructors),
            'total_instructors': len(instructors_map),
            'semester': 'FALL',
            'year': 2025,
        }
    }
    
    # Save to JSON
    output_path = Path('course_data.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nData saved to: {output_path}")
    print(f"\nSample course:")
    if courses:
        print(json.dumps(courses[0], indent=2))
    
    print(f"\nSample instructor:")
    if instructors_map:
        print(json.dumps(list(instructors_map.values())[0], indent=2))


if __name__ == '__main__':
    main()

