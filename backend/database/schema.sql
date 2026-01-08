-- CUHK Course Selection System - Database Schema
-- PostgreSQL Database Schema

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS course_status CASCADE;
DROP TYPE IF EXISTS enrollment_status CASCADE;
DROP TYPE IF EXISTS semester_type CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
DROP TYPE IF EXISTS grade_type CASCADE;

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'administrator', 'instructor');
CREATE TYPE course_status AS ENUM ('active', 'inactive', 'cancelled');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'waitlisted', 'dropped', 'pending');
CREATE TYPE semester_type AS ENUM ('Fall', 'Spring', 'Summer');
CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
CREATE TYPE grade_type AS ENUM ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'P', 'NP');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    student_id VARCHAR(20) UNIQUE,
    major VARCHAR(100),
    year INTEGER CHECK (year >= 1 AND year <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_student_id ON users(student_id);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits >= 1 AND credits <= 10),
    instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(100) NOT NULL,
    semester semester_type NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    max_enrollment INTEGER NOT NULL CHECK (max_enrollment > 0),
    current_enrollment INTEGER DEFAULT 0 CHECK (current_enrollment >= 0),
    status course_status DEFAULT 'active',
    prerequisites JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_code, semester, year)
);

-- Create indexes for faster queries
CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_courses_semester_year ON courses(semester, year);
CREATE INDEX idx_courses_status ON courses(status);

-- Time slots table
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'LECTURE' CHECK (type IN ('LECTURE', 'TUTORIAL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

-- Create index for faster time slot lookups
CREATE INDEX idx_time_slots_course ON time_slots(course_id);
CREATE INDEX idx_time_slots_day ON time_slots(day_of_week);

-- Enrollments table
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    status enrollment_status DEFAULT 'pending',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dropped_at TIMESTAMP,
    waitlist_position INTEGER,
    grade grade_type,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Create indexes for faster enrollment queries
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_student_status ON enrollments(student_id, status);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at
    BEFORE UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent enrollment count from going negative
CREATE OR REPLACE FUNCTION check_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_enrollment < 0 THEN
        RAISE EXCEPTION 'Current enrollment cannot be negative';
    END IF;
    IF NEW.current_enrollment > NEW.max_enrollment THEN
        RAISE EXCEPTION 'Current enrollment cannot exceed max enrollment';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_course_enrollment_count
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION check_enrollment_count();

-- Views for common queries

-- View: Active courses with enrollment info
CREATE OR REPLACE VIEW v_active_courses AS
SELECT
    c.*,
    u.first_name || ' ' || u.last_name AS instructor_name,
    u.email AS instructor_email,
    c.max_enrollment - c.current_enrollment AS available_seats,
    CASE WHEN c.current_enrollment >= c.max_enrollment THEN true ELSE false END AS is_full,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'waitlisted') AS waitlist_count
FROM courses c
LEFT JOIN users u ON c.instructor_id = u.id
WHERE c.status = 'active';

-- View: Student enrollment summary
CREATE OR REPLACE VIEW v_student_enrollments AS
SELECT
    e.student_id,
    e.course_id,
    e.status,
    e.grade,
    c.course_code,
    c.course_name,
    c.credits,
    c.semester,
    c.year,
    c.department,
    u.first_name || ' ' || u.last_name AS instructor_name,
    e.enrolled_at
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN users u ON c.instructor_id = u.id;

-- View: Course statistics
CREATE OR REPLACE VIEW v_course_statistics AS
SELECT
    c.id,
    c.course_code,
    c.course_name,
    c.department,
    c.semester,
    c.year,
    c.max_enrollment,
    c.current_enrollment,
    ROUND((c.current_enrollment::NUMERIC / c.max_enrollment::NUMERIC) * 100, 2) AS enrollment_percentage,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'enrolled') AS total_enrolled,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'waitlisted') AS total_waitlisted,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'dropped') AS total_dropped
FROM courses c;

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user information for students, instructors, and administrators';
COMMENT ON TABLE courses IS 'Stores course offerings for each semester';
COMMENT ON TABLE time_slots IS 'Stores meeting times for courses';
COMMENT ON TABLE enrollments IS 'Stores student enrollments and waitlist information';

COMMENT ON COLUMN users.role IS 'User role: student, instructor, or administrator';
COMMENT ON COLUMN courses.prerequisites IS 'JSON array of prerequisite course codes';
COMMENT ON COLUMN enrollments.waitlist_position IS 'Position in waitlist (NULL if not waitlisted)';
COMMENT ON COLUMN enrollments.grade IS 'Final grade for the course (NULL until graded)';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO course_selection_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO course_selection_app;
