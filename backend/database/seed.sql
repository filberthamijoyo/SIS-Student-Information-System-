-- CUHK Course Selection System - Seed Data
-- Sample data for testing and development

-- Clear existing data
TRUNCATE TABLE enrollments, time_slots, courses, users RESTART IDENTITY CASCADE;

-- Insert sample users

-- Administrators
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'System', 'Administrator', 'administrator');

-- Instructors
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('john.smith@cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'John', 'Smith', 'instructor'),
('mary.chen@cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Mary', 'Chen', 'instructor'),
('david.wong@cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'David', 'Wong', 'instructor'),
('sarah.lee@cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Sarah', 'Lee', 'instructor'),
('robert.tan@cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Robert', 'Tan', 'instructor');

-- Students
INSERT INTO users (email, password_hash, first_name, last_name, role, student_id, major, year) VALUES
('alice.wang@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Alice', 'Wang', 'student', '1155123001', 'Computer Science', 2),
('bob.liu@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Bob', 'Liu', 'student', '1155123002', 'Computer Science', 2),
('charlie.zhang@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Charlie', 'Zhang', 'student', '1155123003', 'Mathematics', 3),
('diana.kim@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Diana', 'Kim', 'student', '1155123004', 'Computer Science', 1),
('edward.chen@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Edward', 'Chen', 'student', '1155123005', 'Information Engineering', 2),
('fiona.wu@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Fiona', 'Wu', 'student', '1155123006', 'Computer Science', 3),
('george.li@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'George', 'Li', 'student', '1155123007', 'Mathematics', 2),
('helen.zhao@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Helen', 'Zhao', 'student', '1155123008', 'Computer Science', 4),
('ivan.huang@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Ivan', 'Huang', 'student', '1155123009', 'Statistics', 1),
('jenny.lam@link.cuhk.edu.hk', '$2b$10$YourHashedPasswordHere', 'Jenny', 'Lam', 'student', '1155123010', 'Computer Science', 2);

-- Insert sample courses

-- Computer Science Courses
INSERT INTO courses (course_code, course_name, description, credits, instructor_id, department, semester, year, max_enrollment, current_enrollment, status) VALUES
('CSCI1010', 'Introduction to Computer Science', 'Fundamental concepts of computer science and programming basics using Python.', 3, 2, 'Computer Science', 'Fall', 2024, 100, 0, 'active'),
('CSCI2100', 'Data Structures', 'Study of fundamental data structures including arrays, linked lists, stacks, queues, trees, and graphs.', 3, 2, 'Computer Science', 'Fall', 2024, 80, 0, 'active'),
('CSCI3170', 'Database Systems', 'Introduction to database design, SQL, normalization, and transaction management.', 3, 3, 'Computer Science', 'Fall', 2024, 60, 0, 'active'),
('CSCI3320', 'Fundamentals of Artificial Intelligence', 'Introduction to AI including search algorithms, machine learning, and neural networks.', 3, 4, 'Computer Science', 'Fall', 2024, 50, 0, 'active'),
('CSCI4430', 'Data Communications and Computer Networks', 'Principles of data communications and computer network architectures.', 3, 2, 'Computer Science', 'Fall', 2024, 45, 0, 'active'),
('CSCI3230', 'Operating Systems', 'Concepts and design of operating systems including process management, memory management, and file systems.', 3, 3, 'Computer Science', 'Spring', 2025, 60, 0, 'active'),
('CSCI3251', 'Engineering Software as a Service', 'Modern software engineering practices including agile development, testing, and deployment.', 3, 4, 'Computer Science', 'Spring', 2025, 50, 0, 'active');

-- Mathematics Courses
INSERT INTO courses (course_code, course_name, description, credits, instructor_id, department, semester, year, max_enrollment, current_enrollment, status) VALUES
('MATH1010', 'University Mathematics', 'Calculus, linear algebra, and differential equations.', 3, 5, 'Mathematics', 'Fall', 2024, 120, 0, 'active'),
('MATH2010', 'Advanced Calculus I', 'Rigorous treatment of limits, continuity, differentiation, and integration.', 3, 5, 'Mathematics', 'Fall', 2024, 60, 0, 'active'),
('MATH3230', 'Probability and Statistics', 'Introduction to probability theory and statistical inference.', 3, 6, 'Mathematics', 'Fall', 2024, 70, 0, 'active');

-- Insert time slots for courses

-- CSCI1010 (Monday & Wednesday 10:30-11:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(1, 'Monday', '10:30:00', '11:45:00', 'LSB LT1', 'LECTURE'),
(1, 'Wednesday', '10:30:00', '11:45:00', 'LSB LT1', 'LECTURE');

-- CSCI2100 (Tuesday & Thursday 14:30-15:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(2, 'Tuesday', '14:30:00', '15:45:00', 'SHB 833', 'LECTURE'),
(2, 'Thursday', '14:30:00', '15:45:00', 'SHB 833', 'LECTURE');

-- CSCI3170 (Monday & Wednesday 14:30-15:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(3, 'Monday', '14:30:00', '15:45:00', 'ERB 905', 'LECTURE'),
(3, 'Wednesday', '14:30:00', '15:45:00', 'ERB 905', 'LECTURE');

-- CSCI3320 (Tuesday & Thursday 10:30-11:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(4, 'Tuesday', '10:30:00', '11:45:00', 'SHB 910', 'LECTURE'),
(4, 'Thursday', '10:30:00', '11:45:00', 'SHB 910', 'LECTURE');

-- CSCI4430 (Monday 16:30-18:15)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(5, 'Monday', '16:30:00', '18:15:00', 'ERB 1013', 'LECTURE');

-- CSCI3230 (Tuesday & Thursday 14:30-15:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(6, 'Tuesday', '14:30:00', '15:45:00', 'SHB 833', 'LECTURE'),
(6, 'Thursday', '14:30:00', '15:45:00', 'SHB 833', 'LECTURE');

-- CSCI3251 (Wednesday & Friday 10:30-11:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(7, 'Wednesday', '10:30:00', '11:45:00', 'ERB 905', 'LECTURE'),
(7, 'Friday', '10:30:00', '11:45:00', 'ERB 905', 'LECTURE');

-- MATH1010 (Monday, Wednesday, Friday 09:00-09:50)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(8, 'Monday', '09:00:00', '09:50:00', 'LSB LT2', 'LECTURE'),
(8, 'Wednesday', '09:00:00', '09:50:00', 'LSB LT2', 'LECTURE'),
(8, 'Friday', '09:00:00', '09:50:00', 'LSB LT2', 'LECTURE');

-- MATH2010 (Tuesday & Thursday 09:00-10:15)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(9, 'Tuesday', '09:00:00', '10:15:00', 'LSB LT3', 'LECTURE'),
(9, 'Thursday', '09:00:00', '10:15:00', 'LSB LT3', 'LECTURE');

-- MATH3230 (Monday & Wednesday 16:30-17:45)
INSERT INTO time_slots (course_id, day_of_week, start_time, end_time, location, type) VALUES
(10, 'Monday', '16:30:00', '17:45:00', 'LSB C1', 'LECTURE'),
(10, 'Wednesday', '16:30:00', '17:45:00', 'LSB C1', 'LECTURE');

-- Insert sample enrollments

-- Alice enrolled in CSCI1010 and MATH1010
INSERT INTO enrollments (student_id, course_id, status, enrolled_at) VALUES
(7, 1, 'enrolled', CURRENT_TIMESTAMP),
(7, 8, 'enrolled', CURRENT_TIMESTAMP);

-- Bob enrolled in CSCI2100 and MATH1010
INSERT INTO enrollments (student_id, course_id, status, enrolled_at) VALUES
(8, 2, 'enrolled', CURRENT_TIMESTAMP),
(8, 8, 'enrolled', CURRENT_TIMESTAMP);

-- Charlie enrolled in CSCI3170 and MATH3230
INSERT INTO enrollments (student_id, course_id, status, enrolled_at) VALUES
(9, 3, 'enrolled', CURRENT_TIMESTAMP),
(9, 10, 'enrolled', CURRENT_TIMESTAMP);

-- Update course enrollment counts
UPDATE courses SET current_enrollment = (
    SELECT COUNT(*) FROM enrollments
    WHERE course_id = courses.id AND status = 'enrolled'
);

-- Display summary
SELECT 'Database seeded successfully!' AS message;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_courses FROM courses;
SELECT COUNT(*) AS total_time_slots FROM time_slots;
SELECT COUNT(*) AS total_enrollments FROM enrollments;
