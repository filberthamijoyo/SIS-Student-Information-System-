# API Documentation

Base URL: `http://localhost:5000/api`

## Table of Contents

- [Authentication](#authentication)
- [Courses](#courses)
- [Enrollments](#enrollments)
- [Academic Records](#academic-records)
- [Student Management](#student-management)
- [Faculty](#faculty)
- [Admin](#admin)
- [Error Handling](#error-handling)

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### POST /auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "student@university.edu",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT"
  }
}
```

**Status Codes:**
- `200 OK`: Login successful
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing or invalid fields

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "newstudent@university.edu",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "STUDENT"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "newstudent@university.edu",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "STUDENT"
  }
}
```

### POST /auth/logout

Logout current user (requires authentication).

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Courses

### GET /courses

Get list of all courses with optional filters.

**Query Parameters:**
- `term` (optional): Filter by term code (e.g., "2025-26 Term 1")
- `department` (optional): Filter by department
- `search` (optional): Search in course code or name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request:**
```
GET /api/courses?term=2025-26 Term 1&department=CSCI&search=database
```

**Response:**
```json
{
  "courses": [
    {
      "id": 1,
      "code": "CSCI3170",
      "name": "Introduction to Database Systems",
      "credits": 3,
      "department": "CSCI",
      "description": "This course provides an introduction to database...",
      "capacity": 120,
      "enrolled": 85,
      "term": "2025-26 Term 1",
      "prerequisites": ["CSCI2100"],
      "schedules": [
        {
          "dayOfWeek": 1,
          "startTime": "09:30",
          "endTime": "11:15",
          "location": "LSB LT1"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET /courses/:id

Get detailed information about a specific course.

**Response:**
```json
{
  "id": 1,
  "code": "CSCI3170",
  "name": "Introduction to Database Systems",
  "credits": 3,
  "department": "CSCI",
  "description": "This course provides an introduction to database...",
  "capacity": 120,
  "enrolled": 85,
  "waitlist": 12,
  "term": "2025-26 Term 1",
  "prerequisites": [
    {
      "code": "CSCI2100",
      "name": "Data Structures"
    }
  ],
  "schedules": [...],
  "exams": [
    {
      "type": "Final Exam",
      "date": "2025-12-15",
      "startTime": "09:30",
      "endTime": "12:30",
      "location": "CKLSP"
    }
  ],
  "instructor": {
    "name": "Dr. Smith",
    "email": "smith@university.edu"
  }
}
```

### POST /courses (Admin Only)

Create a new course.

**Request Body:**
```json
{
  "code": "CSCI4999",
  "name": "Special Topics in Computer Science",
  "credits": 3,
  "department": "CSCI",
  "description": "Advanced topics...",
  "capacity": 40,
  "term": "2025-26 Term 2",
  "prerequisites": ["CSCI3000"],
  "schedules": [
    {
      "dayOfWeek": 2,
      "startTime": "14:30",
      "endTime": "16:15",
      "location": "SHB 833"
    }
  ]
}
```

**Response:**
```json
{
  "id": 123,
  "code": "CSCI4999",
  "name": "Special Topics in Computer Science",
  ...
}
```

---

## Enrollments

### GET /enrollments/my-courses

Get current user's enrolled courses.

**Response:**
```json
{
  "enrollments": [
    {
      "id": 1,
      "courseId": 10,
      "course": {
        "code": "CSCI3170",
        "name": "Introduction to Database Systems",
        "credits": 3,
        "schedules": [...]
      },
      "status": "ENROLLED",
      "enrolledAt": "2025-08-15T10:30:00Z",
      "grade": null
    }
  ],
  "totalCredits": 15
}
```

### POST /enrollments

Enroll in a course.

**Request Body:**
```json
{
  "courseId": 10
}
```

**Response:**
```json
{
  "enrollment": {
    "id": 1,
    "courseId": 10,
    "status": "PENDING",
    "queuePosition": 5,
    "message": "Enrollment request submitted. Processing..."
  }
}
```

**Status Codes:**
- `201 Created`: Enrollment request created
- `400 Bad Request`: Validation error (conflicts, prerequisites, etc.)
- `409 Conflict`: Already enrolled or on waitlist

**Possible Errors:**
```json
{
  "error": "SCHEDULE_CONFLICT",
  "message": "This course conflicts with CSCI2100",
  "conflictingCourse": {
    "code": "CSCI2100",
    "name": "Data Structures"
  }
}
```

```json
{
  "error": "PREREQUISITE_NOT_MET",
  "message": "Missing prerequisite: CSCI2100",
  "missingPrerequisites": ["CSCI2100"]
}
```

### DELETE /enrollments/:id

Drop a course.

**Response:**
```json
{
  "message": "Course dropped successfully"
}
```

### GET /enrollments/:id/status

Get enrollment status (for queue processing).

**Response:**
```json
{
  "id": 1,
  "status": "ENROLLED",
  "queuePosition": null,
  "processedAt": "2025-08-15T10:30:15Z"
}
```

---

## Academic Records

### GET /academic/grades

Get current user's grades.

**Query Parameters:**
- `term` (optional): Filter by term

**Response:**
```json
{
  "grades": [
    {
      "courseCode": "CSCI3170",
      "courseName": "Introduction to Database Systems",
      "credits": 3,
      "grade": "A",
      "gradePoint": 4.0,
      "term": "2024-25 Term 1"
    }
  ],
  "summary": {
    "termGPA": 3.85,
    "cumulativeGPA": 3.72,
    "totalCredits": 45,
    "completedCredits": 42
  }
}
```

### GET /academic/transcript

Get official transcript.

**Response:**
```json
{
  "student": {
    "id": 1,
    "studentId": "1155123456",
    "name": "John Doe",
    "program": "Computer Science",
    "admissionYear": 2023
  },
  "academicRecords": [
    {
      "term": "2023-24 Term 1",
      "courses": [
        {
          "code": "CSCI1010",
          "name": "Introduction to Programming",
          "credits": 3,
          "grade": "A",
          "gradePoint": 4.0
        }
      ],
      "termGPA": 3.85,
      "termCredits": 15
    }
  ],
  "summary": {
    "cumulativeGPA": 3.72,
    "totalCredits": 45,
    "classification": "Second Year Standing"
  }
}
```

### GET /academic/schedule

Get current term schedule.

**Response:**
```json
{
  "term": "2025-26 Term 1",
  "courses": [
    {
      "code": "CSCI3170",
      "name": "Introduction to Database Systems",
      "schedules": [
        {
          "type": "Lecture",
          "dayOfWeek": 1,
          "startTime": "09:30",
          "endTime": "11:15",
          "location": "LSB LT1"
        }
      ]
    }
  ]
}
```

### GET /academic/exam-schedule

Get exam schedule for current term.

**Response:**
```json
{
  "exams": [
    {
      "courseCode": "CSCI3170",
      "courseName": "Introduction to Database Systems",
      "type": "Final Exam",
      "date": "2025-12-15",
      "startTime": "09:30",
      "endTime": "12:30",
      "location": "CKLSP",
      "seatNumber": "A-123"
    }
  ]
}
```

---

## Student Management

### GET /personal/info

Get current user's personal information.

**Response:**
```json
{
  "id": 1,
  "studentId": "1155123456",
  "email": "student@university.edu",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2003-05-15",
  "gender": "M",
  "phone": "+852 1234 5678",
  "address": "123 University Ave",
  "program": "Computer Science",
  "major": "Computer Science",
  "admissionYear": 2023,
  "expectedGraduation": 2027,
  "studentType": "LOCAL"
}
```

### PUT /personal/info

Update personal information.

**Request Body:**
```json
{
  "phone": "+852 9876 5432",
  "address": "456 New Street"
}
```

---

## Faculty

### GET /faculty/courses

Get courses taught by current faculty member.

**Response:**
```json
{
  "courses": [
    {
      "id": 10,
      "code": "CSCI3170",
      "name": "Introduction to Database Systems",
      "term": "2025-26 Term 1",
      "enrolled": 85,
      "capacity": 120
    }
  ]
}
```

### GET /faculty/courses/:id/students

Get roster for a specific course.

**Response:**
```json
{
  "course": {
    "code": "CSCI3170",
    "name": "Introduction to Database Systems"
  },
  "students": [
    {
      "id": 1,
      "studentId": "1155123456",
      "name": "John Doe",
      "email": "student@university.edu",
      "program": "Computer Science",
      "year": 3
    }
  ]
}
```

### POST /faculty/grades

Submit grades for students.

**Request Body:**
```json
{
  "courseId": 10,
  "grades": [
    {
      "studentId": 1,
      "grade": "A",
      "comments": "Excellent work"
    },
    {
      "studentId": 2,
      "grade": "B+",
      "comments": "Good progress"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Grades submitted successfully",
  "submitted": 2,
  "status": "PENDING_APPROVAL"
}
```

---

## Admin

### GET /admin/students

Get list of all students.

**Query Parameters:**
- `search`: Search by name or student ID
- `program`: Filter by program
- `page`, `limit`: Pagination

**Response:**
```json
{
  "students": [
    {
      "id": 1,
      "studentId": "1155123456",
      "name": "John Doe",
      "email": "student@university.edu",
      "program": "Computer Science",
      "year": 3,
      "gpa": 3.72,
      "status": "ACTIVE"
    }
  ],
  "pagination": {...}
}
```

### POST /admin/students

Create a new student account.

**Request Body:**
```json
{
  "studentId": "1155999999",
  "email": "newstudent@university.edu",
  "firstName": "Jane",
  "lastName": "Smith",
  "program": "Computer Science",
  "admissionYear": 2025
}
```

### GET /admin/enrollments/pending

Get pending enrollment approvals.

**Response:**
```json
{
  "pendingEnrollments": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "name": "John Doe"
      },
      "course": {
        "code": "CSCI3170",
        "name": "Introduction to Database Systems"
      },
      "requestedAt": "2025-08-15T10:30:00Z",
      "reason": "Late enrollment"
    }
  ]
}
```

### POST /admin/enrollments/:id/approve

Approve an enrollment request.

**Response:**
```json
{
  "message": "Enrollment approved",
  "enrollment": {...}
}
```

### GET /admin/reports/enrollment-stats

Get enrollment statistics.

**Query Parameters:**
- `term`: Term code

**Response:**
```json
{
  "term": "2025-26 Term 1",
  "totalEnrollments": 5420,
  "totalStudents": 1350,
  "averageCredits": 15.2,
  "departmentStats": [
    {
      "department": "CSCI",
      "courses": 45,
      "enrollments": 1200,
      "utilization": 0.85
    }
  ]
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request (validation errors)
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate, etc.)
- `500 Internal Server Error`: Server error

### Common Error Codes

- `INVALID_CREDENTIALS`: Wrong email or password
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `SCHEDULE_CONFLICT`: Course schedule conflict
- `PREREQUISITE_NOT_MET`: Missing prerequisites
- `CREDIT_LIMIT_EXCEEDED`: Enrollment exceeds credit limit
- `COURSE_FULL`: Course at capacity
- `ALREADY_ENROLLED`: Already enrolled in course
- `ENROLLMENT_CLOSED`: Enrollment period ended

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Changelog

### Version 1.0.0 (Current)

Initial API release with:
- Authentication system
- Course management
- Enrollment system
- Grade management
- Student/Faculty/Admin portals
- Academic records

---

For questions or issues with the API, please open an issue on GitHub.
