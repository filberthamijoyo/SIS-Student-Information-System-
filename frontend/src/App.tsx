import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { CourseDetails } from './pages/CourseDetails';
import { MyCourses } from './pages/MyCourses';
import { CourseSearch } from './pages/CourseSearch';

// New Student Pages
import { StudentDashboard } from './pages/StudentDashboard';
import { MyGrades } from './pages/MyGrades';
import { PersonalInfo } from './pages/PersonalInfo';
import { Applications } from './pages/Applications';
import { EnrollmentsLanding } from './pages/EnrollmentsLanding';
import { ApplicationsLanding } from './pages/ApplicationsLanding';
import { CampusInfo } from './pages/CampusInfo';
import { Transcript } from './pages/Transcript';
import { GradeAnalytics } from './pages/GradeAnalytics';

// Faculty Pages
import { FacultyDashboard } from './pages/FacultyDashboard';
import { GradeSubmission } from './pages/GradeSubmission';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { CourseManagement } from './pages/admin/CourseManagement';
import { ProgramManagement } from './pages/admin/ProgramManagement';
import { EnrollmentManagement } from './pages/admin/EnrollmentManagement';
import { EnrollmentApprovals } from './pages/admin/EnrollmentApprovals';
import { GradeApprovals } from './pages/admin/GradeApprovals';
import { ApplicationApprovals } from './pages/admin/ApplicationApprovals';
import { Reports } from './pages/admin/Reports';

// New Feature Pages
import AcademicCalendarPage from './pages/AcademicCalendarPage';
import AddDropPage from './pages/AddDropPage';
import MajorChangePage from './pages/MajorChangePage';
import EvaluationsPage from './pages/EvaluationsPage';
import { ShoppingCart } from './pages/ShoppingCart';

// Enrollment Pages
import { TermInformation } from './pages/TermInformation';
import { ExamSchedules } from './pages/ExamSchedules';
import { ClassSchedule } from './pages/ClassSchedule';

// Application Pages
import { DeclareMajor } from './pages/DeclareMajor';
import { DeclareMinor } from './pages/DeclareMinor';
import { DeclareSecondMajor } from './pages/DeclareSecondMajor';
import { ExchangeVisiting } from './pages/ExchangeVisiting';
import { ResumptionOfStudy } from './pages/ResumptionOfStudy';
import { Suspension } from './pages/Suspension';
import { Withdrawal } from './pages/Withdrawal';
import { NormalAddition } from './pages/NormalAddition';
import { LateCourseAddDrop } from './pages/LateCourseAddDrop';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function RoleDashboard() {
  const { user } = useAuth();

  if (user?.role === 'INSTRUCTOR') {
    return <FacultyDashboard />;
  }

  if (user?.role === 'ADMINISTRATOR') {
    return <AdminDashboard />;
  }

  return <StudentDashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Dashboard - Role-based */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <RoleDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Course Management */}
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CourseDetails />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MyCourses />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/course-search"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CourseSearch />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EnrollmentsLanding />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/add"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AddDropPage initialTab="add" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/drop"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AddDropPage initialTab="drop" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/term-information"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <TermInformation />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/exam-schedules"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ExamSchedules />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/class-schedule"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ClassSchedule />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ShoppingCart />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Academic Pages */}
            <Route
              path="/academic/grades"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MyGrades />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic/transcript"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Transcript />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic/analytics"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GradeAnalytics />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Personal Info */}
            <Route
              path="/personal"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PersonalInfo />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Applications */}
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ApplicationsLanding />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/my-applications"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Applications />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/declare-major"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DeclareMajor />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/declare-minor"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DeclareMinor />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/declare-second-major"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DeclareSecondMajor />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/change-major"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MajorChangePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/exchange-visiting"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ExchangeVisiting />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/resumption-of-study"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ResumptionOfStudy />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/suspension"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Suspension />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/students-record/withdrawal"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Withdrawal />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/normal-addition"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <NormalAddition />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/late-course-add-drop"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <LateCourseAddDrop />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Campus Info */}
            <Route
              path="/campus"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CampusInfo />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Academic Calendar */}
            <Route
              path="/academic-calendar"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AcademicCalendarPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Add/Drop Courses */}
            <Route
              path="/add-drop"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AddDropPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Major Change Request */}
            <Route
              path="/major-change"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MajorChangePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Course Evaluations */}
            <Route
              path="/evaluations"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EvaluationsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AdminDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UserManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CourseManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/programs"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProgramManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/enrollments"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EnrollmentManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/enrollments/approvals"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EnrollmentApprovals />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/grades/approvals"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GradeApprovals />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Reports />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ApplicationApprovals />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Faculty Routes */}
            <Route
              path="/faculty"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FacultyDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/courses"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FacultyDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/courses/:courseId/grades"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GradeSubmission />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;