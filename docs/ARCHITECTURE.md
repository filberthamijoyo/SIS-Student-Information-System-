# System Architecture

## Overview

The Student Information System (SIS) is a full-stack web application built using a modern three-tier architecture with queue-based asynchronous processing for enrollment operations.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          React Frontend (Port 5173)                │    │
│  │  - React 19 + TypeScript                           │    │
│  │  - TailwindCSS for styling                         │    │
│  │  - React Router for navigation                     │    │
│  │  - TanStack Query for state management             │    │
│  │  - Axios for HTTP requests                         │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ HTTP/REST API (JSON)
                   │
┌──────────────────▼───────────────────────────────────────────┐
│                      Application Layer                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │        Express.js Backend (Port 5000)              │    │
│  │                                                    │    │
│  │  ┌──────────────────────────────────────────┐    │    │
│  │  │         API Routes                        │    │    │
│  │  │  - Auth, Courses, Enrollments, etc.      │    │    │
│  │  └──────────────┬───────────────────────────┘    │    │
│  │                 │                                 │    │
│  │  ┌──────────────▼───────────────────────────┐    │    │
│  │  │         Middleware Layer                  │    │    │
│  │  │  - Authentication (JWT)                   │    │    │
│  │  │  - Authorization (Role-based)             │    │    │
│  │  │  - Rate Limiting                          │    │    │
│  │  │  - Error Handling                         │    │    │
│  │  └──────────────┬───────────────────────────┘    │    │
│  │                 │                                 │    │
│  │  ┌──────────────▼───────────────────────────┐    │    │
│  │  │         Controllers                       │    │    │
│  │  │  - Request/Response handling              │    │    │
│  │  │  - Input validation                       │    │    │
│  │  └──────────────┬───────────────────────────┘    │    │
│  │                 │                                 │    │
│  │  ┌──────────────▼───────────────────────────┐    │    │
│  │  │         Services (Business Logic)         │    │    │
│  │  │  - Course service                         │    │    │
│  │  │  - Enrollment service                     │    │    │
│  │  │  - Auth service                           │    │    │
│  │  └──────────────┬───────────────────────────┘    │    │
│  │                 │                                 │    │
│  │  ┌──────────────▼───────────────────────────┐    │    │
│  │  │         Prisma ORM                        │    │    │
│  │  │  - Type-safe database queries             │    │    │
│  │  │  - Migration management                   │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Background Workers                         │    │
│  │  - Enrollment processing worker                    │    │
│  │  - Queue-based async operations                    │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬────────────────┬──────────────────────────┘
                   │                │
                   │                │
┌──────────────────▼──────┐  ┌─────▼─────────────────┐
│    Data Layer           │  │   Cache/Queue Layer   │
│                         │  │                       │
│  ┌──────────────────┐  │  │  ┌─────────────────┐ │
│  │   PostgreSQL     │  │  │  │     Redis       │ │
│  │   Database       │  │  │  │  - Cache        │ │
│  │                  │  │  │  │  - Bull Queue   │ │
│  │  - Student data  │  │  │  │  - Session mgmt │ │
│  │  - Courses       │  │  │  └─────────────────┘ │
│  │  - Enrollments   │  │  │                       │
│  │  - Grades        │  │  │                       │
│  │  - Schedules     │  │  │                       │
│  └──────────────────┘  │  │                       │
└─────────────────────────┘  └───────────────────────┘
```

## Technology Stack

### Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI framework | 19.x |
| TypeScript | Type safety | 5.x |
| Vite | Build tool & dev server | 7.x |
| React Router | Client-side routing | 7.x |
| TanStack Query | Server state management | 5.x |
| TailwindCSS | Styling framework | 3.x |
| Axios | HTTP client | 1.x |
| Lucide React | Icon library | Latest |

### Backend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime environment | 18+ |
| Express.js | Web framework | 4.x |
| TypeScript | Type safety | 5.x |
| Prisma | ORM & migrations | 6.x |
| PostgreSQL | Relational database | 14+ |
| Redis | Caching & queues | 6+ |
| Bull | Job queue | 4.x |
| JWT | Authentication | 9.x |
| bcrypt | Password hashing | 5.x |
| Joi | Request validation | 17.x |

## Core Components

### 1. Authentication & Authorization

**JWT-based Authentication:**
- Tokens issued on login
- Tokens include user ID, email, and role
- Tokens expire after configurable time period
- Refresh token mechanism (if implemented)

**Role-based Access Control:**
- **Student**: Access to own courses, grades, enrollments
- **Faculty**: Access to assigned courses, grade submission
- **Admin**: Full system access, user management

**Implementation:**
```typescript
// middleware/auth.ts
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

### 2. Course Management

**Features:**
- Course catalog with search and filtering
- Prerequisites tracking
- Schedule management
- Capacity tracking
- Exam scheduling

**Database Schema:**
```prisma
model courses {
  id           Int
  code         String
  name         String
  credits      Int
  capacity     Int
  prerequisites Json  // Array of prerequisite course codes
  schedules    Json  // Course schedule data
  exams        Json  // Exam schedule data
}
```

### 3. Enrollment System

**Queue-based Processing:**

The enrollment system uses Bull (Redis-based queue) to handle concurrent enrollment requests:

```
Student Request → API → Add to Queue → Worker Process → Database Update
```

**Why Queue-based?**
- Prevents race conditions when multiple students enroll simultaneously
- Ensures FIFO (First In, First Out) processing
- Allows for retry logic on failures
- Provides enrollment status tracking

**Enrollment Flow:**
```typescript
// 1. Student submits enrollment
POST /api/enrollments { courseId: 123 }

// 2. Add to queue
enrollmentQueue.add({
  userId,
  courseId,
  timestamp: Date.now()
});

// 3. Worker processes enrollment
worker.process(async (job) => {
  const { userId, courseId } = job.data;

  // Check conflicts
  await checkScheduleConflicts(userId, courseId);

  // Check prerequisites
  await checkPrerequisites(userId, courseId);

  // Create enrollment
  await createEnrollment(userId, courseId);
});

// 4. Frontend polls for status
GET /api/enrollments/:id/status
```

**Conflict Detection:**
- Schedule conflicts (overlapping class times)
- Prerequisite validation
- Credit limit checks
- Duplicate enrollment prevention

### 4. Grade Management

**Features:**
- Faculty grade submission
- Admin approval workflow
- GPA calculation (term & cumulative)
- Transcript generation

**Grade Calculation:**
```typescript
const calculateGPA = (grades: Grade[]) => {
  const totalPoints = grades.reduce((sum, g) =>
    sum + (gradeToPoint(g.grade) * g.credits), 0
  );
  const totalCredits = grades.reduce((sum, g) =>
    sum + g.credits, 0
  );
  return totalPoints / totalCredits;
};
```

### 5. State Management (Frontend)

**TanStack Query for Server State:**
- Automatic caching
- Background refetching
- Optimistic updates
- Pagination support

```typescript
// Example: Fetching courses
const { data, isLoading } = useQuery({
  queryKey: ['courses', filters],
  queryFn: () => courseService.getCourses(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Data Flow

### Enrollment Request Flow

```
1. User clicks "Enroll" button
   ↓
2. Frontend validates input
   ↓
3. POST /api/enrollments
   ↓
4. Backend validates request
   ↓
5. Add job to Bull queue
   ↓
6. Return queue position to frontend
   ↓
7. Frontend polls for status
   ↓
8. Worker processes job:
   - Check schedule conflicts
   - Check prerequisites
   - Check capacity
   - Create enrollment record
   ↓
9. Update job status
   ↓
10. Frontend receives success/failure
    ↓
11. Update UI with result
```

## Database Design

### Key Relationships

```
users (students/faculty/admin)
  ↓ 1:N
enrollments
  ↓ N:1
courses
  ↓ 1:N
schedules

users
  ↓ 1:N
grades
  ↓ N:1
courses
```

### Indexing Strategy

Critical indexes for performance:
- `users.email` (unique)
- `courses.code` (unique)
- `enrollments(userId, courseId)` (composite, unique)
- `grades(userId, courseId)` (composite)

## Security Considerations

### 1. Authentication Security
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with expiration
- Secure token storage (httpOnly cookies or localStorage with XSS protection)

### 2. Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API endpoint protection

### 3. Input Validation
- Request validation using Joi
- SQL injection prevention (Prisma parameterized queries)
- XSS protection (React auto-escaping)

### 4. Rate Limiting
- API rate limiting (100 requests/15 min)
- Auth endpoint limiting (5 requests/15 min)

### 5. CORS Configuration
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## Performance Optimizations

### 1. Database Query Optimization
- Eager loading of relations (Prisma `include`)
- Pagination for large datasets
- Database indexes on frequently queried fields

### 2. Caching Strategy
- Redis caching for:
  - User sessions
  - Frequently accessed course data
  - Academic calendar events
- Cache invalidation on updates

### 3. Frontend Optimization
- Code splitting (React lazy loading)
- Asset optimization (Vite)
- Image optimization
- TanStack Query caching

### 4. API Optimization
- Response compression
- JSON payload minimization
- Connection pooling (Prisma)

## Scalability Considerations

### Horizontal Scaling
- Stateless API design enables multiple backend instances
- Redis for shared session storage
- Database connection pooling

### Vertical Scaling
- Optimized database queries
- Efficient indexing
- Background job processing

### Future Scaling Options
- Database read replicas
- CDN for static assets
- Microservices architecture (if needed)
- Kubernetes deployment

## Error Handling

### Frontend Error Handling
```typescript
try {
  await api.enrollCourse(courseId);
} catch (error) {
  if (error.response?.status === 409) {
    toast.error('Schedule conflict detected');
  } else {
    toast.error('Enrollment failed. Please try again.');
  }
}
```

### Backend Error Handling
```typescript
// Global error handler
app.use((err, req, res, next) => {
  logger.error(err);

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

## Monitoring & Logging

### Logging Strategy
- Application logs (development)
- Error tracking (production)
- Access logs (all environments)
- Database query logs (development)

### Metrics to Monitor
- API response times
- Database query performance
- Queue processing times
- Error rates
- User activity

## Deployment Architecture

### Development
```
Local Machine
├── Frontend (Vite dev server)
├── Backend (ts-node-dev)
├── PostgreSQL (Docker or local)
└── Redis (Docker or local)
```

### Production
```
Cloud Platform (e.g., AWS, Heroku, Vercel)
├── Frontend (Static hosting - Vercel/Netlify)
├── Backend (Container/Server - AWS EC2, Heroku)
├── PostgreSQL (Managed DB - Supabase, AWS RDS)
└── Redis (Managed Cache - Redis Cloud, AWS ElastiCache)
```

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions
- React components (if implemented)

### Integration Tests
- API endpoints
- Database operations
- Queue processing

### End-to-End Tests
- Critical user flows (if implemented)
- Enrollment process
- Grade submission

## Development Workflow

```
1. Feature Branch
   ↓
2. Local Development
   ↓
3. Unit Tests
   ↓
4. Code Review
   ↓
5. Merge to Main
   ↓
6. CI/CD Pipeline
   ↓
7. Deployment
```

## Future Architectural Improvements

1. **Microservices**: Split into smaller services (auth, courses, enrollments)
2. **Event-Driven**: Use message queues for cross-service communication
3. **GraphQL**: Replace REST with GraphQL for flexible data fetching
4. **Real-time**: WebSocket support for live updates
5. **Caching Layer**: More aggressive caching with Redis
6. **Search**: Elasticsearch for advanced course search
7. **Analytics**: Dedicated analytics service

---

This architecture provides a solid foundation for a scalable, maintainable student information system while allowing for future growth and enhancements.
