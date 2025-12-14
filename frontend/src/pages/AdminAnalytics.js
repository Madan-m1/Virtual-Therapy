import { useEffect, useState } from "react";
import API from "../services/api";

export default function AdminAnalytics() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/admin/analytics")
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching analytics:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl mb-4">Platform Analytics</h1>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-6">Platform Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.totalUsers || stats.users || 0}
          </p>
          {stats.regularUsers !== undefined && (
            <p className="text-sm text-gray-500 mt-2">
              Regular users: {stats.regularUsers}
            </p>
          )}
        </div>

        <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Therapists</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.therapists || 0}
          </p>
        </div>

        <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Sessions</h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats.sessions || stats.totalSessions || 0}
          </p>
        </div>

        <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed Sessions</h3>
          <p className="text-3xl font-bold text-teal-600">
            {stats.completed || stats.completedSessions || 0}
          </p>
          {stats.completionRate !== undefined && (
            <p className="text-sm text-gray-500 mt-2">
              Completion rate: {stats.completionRate}%
            </p>
          )}
        </div>
      </div>

      {/* Additional stats if available */}
      {(stats.completionRate !== undefined || stats.regularUsers !== undefined) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.completionRate !== undefined && (
            <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Session Completion Rate</h3>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-teal-600 h-4 rounded-full" 
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
                <span className="ml-4 text-xl font-bold">{stats.completionRate}%</span>
              </div>
            </div>
          )}
          
          {stats.regularUsers !== undefined && (
            <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">User Distribution</h3>
              <p className="text-gray-600">Regular Users: {stats.regularUsers}</p>
              <p className="text-gray-600">Therapists: {stats.therapists}</p>
              {stats.totalUsers && stats.totalUsers !== (stats.regularUsers + stats.therapists) && (
                <p className="text-gray-600">
                  Admins: {stats.totalUsers - (stats.regularUsers + stats.therapists)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}