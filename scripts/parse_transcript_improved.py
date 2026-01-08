#!/usr/bin/env python3
"""
Improved PDF Parser for Academic Transcript
Extracts course grades and academic records from the transcript PDF.
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


def parse_transcript(pdf_path):
    """Parse transcript PDF and extract academic records."""
    all_text = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                all_text.append(text)
    
    full_text = '\n\n'.join(all_text)
    return full_text


def extract_course_grades(text):
    """Extract course grades from transcript text."""
    courses = []
    lines = text.split('\n')
    
    current_term = None
    current_year = None
    in_course_section = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Detect term/year headers (e.g., "2022-23Term1", "2022-23Term2", "2022-23SummerSession")
        # Also handle "2025-26Term1" format
        # Term1 = Fall, Term2 = Spring, SummerSession = Summer
        term_match = re.search(r'(\d{4})-(\d{2})(Term1|Term2|SummerSession)', line)
        if term_match:
            start_year = int(term_match.group(1))
            term_type = term_match.group(3)
            
            if term_type == 'Term1':
                current_term = 'FALL'
                current_year = start_year
            elif term_type == 'Term2':
                current_term = 'SPRING'
                current_year = start_year
            elif term_type == 'SummerSession':
                current_term = 'SUMMER'
                current_year = start_year
            
            in_course_section = False
            continue
        
        # Also check for term headers that might appear without the full academic year format
        # This handles cases where the term continues on a new page
        if re.match(r'^\d{4}-\d{2}(Term1|Term2|SummerSession)', line):
            term_match = re.search(r'(\d{4})-(\d{2})(Term1|Term2|SummerSession)', line)
            if term_match:
                start_year = int(term_match.group(1))
                term_type = term_match.group(3)
                
                if term_type == 'Term1':
                    current_term = 'FALL'
                    current_year = start_year
                elif term_type == 'Term2':
                    current_term = 'SPRING'
                    current_year = start_year
                elif term_type == 'SummerSession':
                    current_term = 'SUMMER'
                    current_year = start_year
                
                in_course_section = False
                continue
        
        # Detect course section header
        if 'Course Code' in line and 'Course Title' in line:
            in_course_section = True
            continue
        
        # If we see a term header, we should be ready to parse courses
        # But don't set in_course_section yet - wait for the header
        # However, if we already have a term set and see a course code, parse it
        
        # Skip summary lines
        if 'Units Passed' in line or 'Cumulative' in line or 'Term GPA' in line:
            in_course_section = False
            continue
        
        # Skip other headers and footers
        if any(x in line for x in ['Unofficial Copy', 'Invalid unless', 'ThemaximumGPA', 'Summary', 'Remarks', 'End of Transcript', 'Director']):
            in_course_section = False
            continue
        
        # Parse course lines
        # Format: Course Code, Course Title, Units, Grade, % of A- and above
        # Example: "CLC1201 Basic Chinese 3.0 B+ 37.1"
        # Also handle: "DDA2001 Introduction to Data Science 3.0 PA N/A"
        # Allow parsing if we have a term set (courses might continue from previous page)
        # But only parse if line starts with a course code pattern
        if current_term and current_year:
            # Match course code (2-6 letters followed by 4 digits, optionally followed by letters)
            # Updated regex to handle "PA" and "IP" correctly - match longer patterns first
            # Must start with course code pattern to avoid false matches
            course_code_match = re.match(r'^([A-Z]{2,6}\d{4}[A-Z]?)\s+(.+?)\s+(\d+\.?\d*)\s+(PA|NP|IP|[A-Z][+-]?|W|I|S|U)\s*', line)
            
            if course_code_match:
                course_code = course_code_match.group(1)
                course_name = course_code_match.group(2).strip()
                units = float(course_code_match.group(3))
                letter_grade = course_code_match.group(4)
                
                # Clean up course name (remove trailing numbers/units if accidentally included)
                course_name = re.sub(r'\s+\d+\.?\d*\s*$', '', course_name)
                
                # Calculate grade points
                grade_points_map = {
                    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
                    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
                    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
                    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
                    'F': 0.0
                }
                
                grade_points = None
                if letter_grade.upper() in grade_points_map:
                    grade_points = grade_points_map[letter_grade.upper()]
                elif letter_grade.upper() in ['PA', 'P']:
                    # Pass/Pass with credit - no grade points but counts toward credits
                    grade_points = None
                elif letter_grade.upper() in ['NP', 'W', 'I', 'IP', 'S', 'U']:
                    # No pass, Withdraw, Incomplete, In Progress, Satisfactory, Unsatisfactory
                    grade_points = None
                
                course = {
                    'course_code': course_code,
                    'course_name': course_name,
                    'credits': int(units),
                    'letter_grade': letter_grade,
                    'numeric_grade': None,  # Not provided in transcript
                    'semester': current_term,
                    'year': current_year,
                    'grade_points': grade_points
                }
                
                courses.append(course)
    
    return courses


def main():
    pdf_path = Path('FilbertHamijoyo_CUSZ_TSCRPT.pdf')
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Parsing transcript PDF: {pdf_path}")
    
    # Parse PDF
    text = parse_transcript(pdf_path)
    
    # Extract course grades
    print("\nExtracting course grades...")
    courses = extract_course_grades(text)
    
    # Remove duplicates (in case same course appears on multiple pages)
    seen = set()
    unique_courses = []
    for course in courses:
        key = (course['course_code'], course['semester'], course['year'])
        if key not in seen:
            seen.add(key)
            unique_courses.append(course)
    
    courses = unique_courses
    
    # Group by term for display
    terms = {}
    for course in courses:
        key = f"{course['year']}-{course['semester']}"
        if key not in terms:
            terms[key] = []
        terms[key].append(course)
    
    # Calculate GPA per term
    print("\nTerm Summary:")
    for term_key in sorted(terms.keys()):
        term_courses = terms[term_key]
        total_points = 0
        total_credits = 0
        for course in term_courses:
            if course.get('grade_points') is not None:
                total_points += course['grade_points'] * course['credits']
                total_credits += course['credits']
            elif course['letter_grade'] and course['letter_grade'].upper() in ['PA', 'P']:
                # Pass courses count toward credits but not GPA
                total_credits += course['credits']
        
        term_gpa = total_points / total_credits if total_credits > 0 else 0
        print(f"  {term_key}: {len(term_courses)} courses, Term GPA: {term_gpa:.3f}")
    
    # Create output structure
    output = {
        'student_id': '122040012',
        'student_name': 'Filbert Cahyadi Hamijoyo',
        'courses': courses,
        'metadata': {
            'total_courses': len(courses),
            'total_terms': len(terms),
        }
    }
    
    # Save to JSON
    output_path = Path('filbert_transcript_real.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nData saved to: {output_path}")
    print(f"\nTotal courses extracted: {len(courses)}")
    
    if courses:
        print("\nSample courses:")
        for course in courses[:10]:
            print(f"  {course['course_code']}: {course['course_name']} - {course['letter_grade']} ({course['semester']} {course['year']})")


if __name__ == '__main__':
    main()


Improved PDF Parser for Academic Transcript
Extracts course grades and academic records from the transcript PDF.
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


def parse_transcript(pdf_path):
    """Parse transcript PDF and extract academic records."""
    all_text = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                all_text.append(text)
    
    full_text = '\n\n'.join(all_text)
    return full_text


def extract_course_grades(text):
    """Extract course grades from transcript text."""
    courses = []
    lines = text.split('\n')
    
    current_term = None
    current_year = None
    in_course_section = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Detect term/year headers (e.g., "2022-23Term1", "2022-23Term2", "2022-23SummerSession")
        # Also handle "2025-26Term1" format
        # Term1 = Fall, Term2 = Spring, SummerSession = Summer
        term_match = re.search(r'(\d{4})-(\d{2})(Term1|Term2|SummerSession)', line)
        if term_match:
            start_year = int(term_match.group(1))
            term_type = term_match.group(3)
            
            if term_type == 'Term1':
                current_term = 'FALL'
                current_year = start_year
            elif term_type == 'Term2':
                current_term = 'SPRING'
                current_year = start_year
            elif term_type == 'SummerSession':
                current_term = 'SUMMER'
                current_year = start_year
            
            in_course_section = False
            continue
        
        # Also check for term headers that might appear without the full academic year format
        # This handles cases where the term continues on a new page
        if re.match(r'^\d{4}-\d{2}(Term1|Term2|SummerSession)', line):
            term_match = re.search(r'(\d{4})-(\d{2})(Term1|Term2|SummerSession)', line)
            if term_match:
                start_year = int(term_match.group(1))
                term_type = term_match.group(3)
                
                if term_type == 'Term1':
                    current_term = 'FALL'
                    current_year = start_year
                elif term_type == 'Term2':
                    current_term = 'SPRING'
                    current_year = start_year
                elif term_type == 'SummerSession':
                    current_term = 'SUMMER'
                    current_year = start_year
                
                in_course_section = False
                continue
        
        # Detect course section header
        if 'Course Code' in line and 'Course Title' in line:
            in_course_section = True
            continue
        
        # If we see a term header, we should be ready to parse courses
        # But don't set in_course_section yet - wait for the header
        # However, if we already have a term set and see a course code, parse it
        
        # Skip summary lines
        if 'Units Passed' in line or 'Cumulative' in line or 'Term GPA' in line:
            in_course_section = False
            continue
        
        # Skip other headers and footers
        if any(x in line for x in ['Unofficial Copy', 'Invalid unless', 'ThemaximumGPA', 'Summary', 'Remarks', 'End of Transcript', 'Director']):
            in_course_section = False
            continue
        
        # Parse course lines
        # Format: Course Code, Course Title, Units, Grade, % of A- and above
        # Example: "CLC1201 Basic Chinese 3.0 B+ 37.1"
        # Also handle: "DDA2001 Introduction to Data Science 3.0 PA N/A"
        # Allow parsing if we have a term set (courses might continue from previous page)
        # But only parse if line starts with a course code pattern
        if current_term and current_year:
            # Match course code (2-6 letters followed by 4 digits, optionally followed by letters)
            # Updated regex to handle "PA" and "IP" correctly - match longer patterns first
            # Must start with course code pattern to avoid false matches
            course_code_match = re.match(r'^([A-Z]{2,6}\d{4}[A-Z]?)\s+(.+?)\s+(\d+\.?\d*)\s+(PA|NP|IP|[A-Z][+-]?|W|I|S|U)\s*', line)
            
            if course_code_match:
                course_code = course_code_match.group(1)
                course_name = course_code_match.group(2).strip()
                units = float(course_code_match.group(3))
                letter_grade = course_code_match.group(4)
                
                # Clean up course name (remove trailing numbers/units if accidentally included)
                course_name = re.sub(r'\s+\d+\.?\d*\s*$', '', course_name)
                
                # Calculate grade points
                grade_points_map = {
                    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
                    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
                    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
                    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
                    'F': 0.0
                }
                
                grade_points = None
                if letter_grade.upper() in grade_points_map:
                    grade_points = grade_points_map[letter_grade.upper()]
                elif letter_grade.upper() in ['PA', 'P']:
                    # Pass/Pass with credit - no grade points but counts toward credits
                    grade_points = None
                elif letter_grade.upper() in ['NP', 'W', 'I', 'IP', 'S', 'U']:
                    # No pass, Withdraw, Incomplete, In Progress, Satisfactory, Unsatisfactory
                    grade_points = None
                
                course = {
                    'course_code': course_code,
                    'course_name': course_name,
                    'credits': int(units),
                    'letter_grade': letter_grade,
                    'numeric_grade': None,  # Not provided in transcript
                    'semester': current_term,
                    'year': current_year,
                    'grade_points': grade_points
                }
                
                courses.append(course)
    
    return courses


def main():
    pdf_path = Path('FilbertHamijoyo_CUSZ_TSCRPT.pdf')
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Parsing transcript PDF: {pdf_path}")
    
    # Parse PDF
    text = parse_transcript(pdf_path)
    
    # Extract course grades
    print("\nExtracting course grades...")
    courses = extract_course_grades(text)
    
    # Remove duplicates (in case same course appears on multiple pages)
    seen = set()
    unique_courses = []
    for course in courses:
        key = (course['course_code'], course['semester'], course['year'])
        if key not in seen:
            seen.add(key)
            unique_courses.append(course)
    
    courses = unique_courses
    
    # Group by term for display
    terms = {}
    for course in courses:
        key = f"{course['year']}-{course['semester']}"
        if key not in terms:
            terms[key] = []
        terms[key].append(course)
    
    # Calculate GPA per term
    print("\nTerm Summary:")
    for term_key in sorted(terms.keys()):
        term_courses = terms[term_key]
        total_points = 0
        total_credits = 0
        for course in term_courses:
            if course.get('grade_points') is not None:
                total_points += course['grade_points'] * course['credits']
                total_credits += course['credits']
            elif course['letter_grade'] and course['letter_grade'].upper() in ['PA', 'P']:
                # Pass courses count toward credits but not GPA
                total_credits += course['credits']
        
        term_gpa = total_points / total_credits if total_credits > 0 else 0
        print(f"  {term_key}: {len(term_courses)} courses, Term GPA: {term_gpa:.3f}")
    
    # Create output structure
    output = {
        'student_id': '122040012',
        'student_name': 'Filbert Cahyadi Hamijoyo',
        'courses': courses,
        'metadata': {
            'total_courses': len(courses),
            'total_terms': len(terms),
        }
    }
    
    # Save to JSON
    output_path = Path('filbert_transcript_real.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nData saved to: {output_path}")
    print(f"\nTotal courses extracted: {len(courses)}")
    
    if courses:
        print("\nSample courses:")
        for course in courses[:10]:
            print(f"  {course['course_code']}: {course['course_name']} - {course['letter_grade']} ({course['semester']} {course['year']})")


if __name__ == '__main__':
    main()



