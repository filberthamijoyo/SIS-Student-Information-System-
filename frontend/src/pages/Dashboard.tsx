import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Welcome to the Course Selection System</h2>
            <p className="text-gray-600 mb-4">
              This is a production-ready course enrollment system that handles concurrent
              course registration with advanced features like:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Queue-based enrollment processing (handles 1000+ concurrent users)</li>
              <li>Optimistic locking to prevent overbooking</li>
              <li>Time conflict detection</li>
              <li>Prerequisites validation</li>
              <li>Automatic waitlist management</li>
              <li>Comprehensive audit logging</li>
            </ul>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">User Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>User ID:</strong> {user?.userIdentifier}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                {user?.major && <p><strong>Major:</strong> {user?.major}</p>}
                {user?.yearLevel && <p><strong>Year:</strong> {user?.yearLevel}</p>}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  to="/courses"
                  className="card bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <h4 className="font-semibold text-blue-900">Browse Courses</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    View all available courses for Term 1 2025
                  </p>
                </Link>
                <Link
                  to="/enrollments"
                  className="card bg-green-50 border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                >
                  <h4 className="font-semibold text-green-900">My Enrollments</h4>
                  <p className="text-sm text-green-700 mt-1">
                    View your enrolled courses and schedule
                  </p>
                </Link>
                <Link
                  to="/enrollments"
                  className="card bg-purple-50 border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <h4 className="font-semibold text-purple-900">Waitlist Status</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Check your waitlist positions (shown in My Enrollments)
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
