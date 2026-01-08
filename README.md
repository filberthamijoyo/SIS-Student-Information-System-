# Student Information System

A comprehensive, full-stack Student Information System built with modern web technologies for managing academic operations including course enrollment, grade management, and student records.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## Overview

This Student Information System demonstrates full-stack development capabilities with a focus on database design, RESTful API architecture, and modern frontend development. The system manages the complete academic lifecycle including course registration, enrollment processing, grade management, and academic records.

## Key Features

### 🎓 Student Portal
- **Smart Course Enrollment**: Queue-based enrollment system with real-time conflict detection
- **Academic Calendar Integration**: View terms, deadlines, and important dates
- **Grade Tracking**: GPA calculation, transcripts, and academic progress monitoring
- **Course Search & Discovery**: Advanced filtering by department, term, and prerequisites
- **Shopping Cart System**: Add/drop courses with instant validation

### 👨‍🏫 Faculty Portal
- **Course Management**: View assigned courses and student rosters
- **Grade Submission**: Submit and manage student grades with approval workflow
- **Course Analytics**: Track enrollment and student performance

### 🔧 Admin Portal
- **User Management**: Create and manage student, faculty, and admin accounts
- **Enrollment Oversight**: Approve late enrollments and course changes
- **System Reports**: Generate enrollment statistics and academic analytics
- **Course Catalog Management**: Maintain course offerings, schedules, and prerequisites

## Technology Stack

### Frontend
- **React 19** with TypeScript for type-safe component development
- **Vite** for fast builds and hot module replacement
- **TailwindCSS** for responsive, modern UI design
- **TanStack Query** for efficient server state management
- **React Router v7** for client-side routing
- **Axios** for HTTP requests

### Backend
- **Node.js 18+** runtime environment
- **Express.js** web framework with TypeScript
- **Prisma ORM** for type-safe database access
- **PostgreSQL** relational database
- **Redis** for caching and queue management
- **Bull** for background job processing
- **JWT** authentication with bcrypt password hashing

### Architecture Highlights
- **Queue-Based Enrollment**: Asynchronous processing prevents race conditions
- **Conflict Detection**: Real-time validation of schedule conflicts and prerequisites
- **Role-Based Access Control**: Separate interfaces for students, faculty, and administrators
- **RESTful API Design**: Clean, resource-based API architecture
- **Docker Support**: Containerized deployment with Docker Compose

## System Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Port 5173)   │
└────────┬────────┘
         │
         │ REST API
         │
┌────────▼────────┐
│ Express Backend │
│   (Port 5000)   │
└────┬───────┬────┘
     │       │
┌────▼────┐ ┌▼─────────┐
│PostgreSQL│ │  Redis   │
│ Database │ │Queue/Cache│
└──────────┘ └──────────┘
```

**Key Design Patterns:**
- Queue-based asynchronous enrollment processing
- Transaction management for data consistency
- Connection pooling for database optimization
- Caching strategy for frequently accessed data

## Database Schema

The system uses a comprehensive PostgreSQL schema managed by Prisma ORM:

- **users** - Student, faculty, and admin accounts with role-based access
- **courses** - Course catalog with schedules, prerequisites, and capacity tracking
- **enrollments** - Student course enrollments with approval workflows
- **grades** - Academic performance tracking with GPA calculations
- **programs** - Academic programs and major requirements
- **academic_events** - Calendar events and important dates
- **applications** - Student applications for major changes, withdrawals, etc.

View complete schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

## API Documentation

The backend exposes a RESTful API with comprehensive endpoints for:
- Authentication and authorization
- Course management and search
- Enrollment operations
- Grade submission and retrieval
- User and admin management

See [API Documentation](docs/API_DOCUMENTATION.md) for detailed endpoint specifications.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Clone repository
git clone https://github.com/filberthamijoyo/Student-Information-System.git
cd Student-Information-System

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your configuration

# Run database migrations
cd backend
npx prisma db push
npm run db:seed

# Start development servers
npm run dev          # Backend (terminal 1)
cd ../frontend
npm run dev          # Frontend (terminal 2)
```

Access the application at `http://localhost:5173`

### Default Test Credentials

```
Admin:    admin@university.edu / admin123
Faculty:  faculty@university.edu / faculty123
Student:  student@university.edu / student123
```

## Project Structure

```
Student-Information-System/
├── backend/              # Express.js API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, validation, etc.
│   │   └── workers/      # Background jobs
│   └── prisma/          # Database schema
├── frontend/            # React application
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Route pages
│       ├── services/    # API services
│       └── contexts/    # React contexts
├── docs/               # Technical documentation
└── docker-compose.yml  # Container orchestration
```

## Technical Highlights

### Queue-Based Enrollment System
Implements Bull (Redis-based queue) for processing enrollment requests asynchronously, ensuring:
- Prevention of race conditions during concurrent enrollments
- FIFO (First In, First Out) processing
- Automatic retry logic for failed operations
- Real-time status tracking

### Conflict Detection Engine
Automatically validates:
- Schedule conflicts (overlapping class times)
- Prerequisite requirements
- Credit limit violations
- Duplicate enrollments

### Performance Optimizations
- Database query optimization with strategic indexing
- Connection pooling for efficient database access
- Redis caching for frequently accessed data
- Pagination for large datasets
- Eager loading of related entities

## Documentation

- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete REST API reference
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design and technical decisions

## Skills Demonstrated

This project showcases proficiency in:

✅ **Full-Stack Development** - Complete MERN-like stack (React, Node.js, PostgreSQL)
✅ **Database Design** - Complex relational schema with proper normalization
✅ **API Development** - RESTful API design with proper HTTP semantics
✅ **Authentication & Security** - JWT-based auth, password hashing, RBAC
✅ **Queue Systems** - Asynchronous job processing with Bull/Redis
✅ **TypeScript** - Type-safe development across frontend and backend
✅ **State Management** - Modern React patterns with TanStack Query
✅ **DevOps** - Docker containerization, environment configuration
✅ **System Architecture** - Scalable, maintainable application design

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Filbert Hamijoyo**

- GitHub: [@filberthamijoyo](https://github.com/filberthamijoyo)
- Project Link: [Student Information System](https://github.com/filberthamijoyo/Student-Information-System)

---

*This project was developed as a demonstration of full-stack development capabilities, database design, and modern web application architecture.*
