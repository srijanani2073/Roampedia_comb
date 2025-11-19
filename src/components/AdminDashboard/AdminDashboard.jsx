import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../../utils/api";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";
import "./AdminDashboard.css";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState(null);
  const [userTrends, setUserTrends] = useState(null);
  const [popularCountries, setPopularCountries] = useState(null);
  const [countryRatings, setCountryRatings] = useState(null);
  const [themePopularity, setThemePopularity] = useState(null);
  const [regionalStats, setRegionalStats] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== "admin") {
      alert("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        trendsRes,
        countriesRes,
        ratingsRes,
        themesRes,
        regionalRes,
        engagementRes,
        usersRes
      ] = await Promise.all([
        apiClient.get("/api/admin/system-stats"),
        apiClient.get("/api/admin/user-trends?period=month"),
        apiClient.get("/api/admin/popular-countries?limit=15"),
        apiClient.get("/api/admin/country-ratings"),
        apiClient.get("/api/admin/theme-popularity"),
        apiClient.get("/api/admin/regional-stats"),
        apiClient.get("/api/admin/engagement"),
        apiClient.get("/api/admin/users?limit=10")
      ]);

      setSystemStats(statsRes.data);
      setUserTrends(trendsRes.data);
      setPopularCountries(countriesRes.data);
      setCountryRatings(ratingsRes.data);
      setThemePopularity(themesRes.data);
      setRegionalStats(regionalRes.data);
      setEngagement(engagementRes.data);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      if (error.response?.status === 403) {
        alert("Access denied. Admin privileges required.");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportType) => {
    try {
      // FIX: Correct path is /api/reports/admin-reports/{reportType}
      const response = await apiClient.get(`/api/reports/admin-reports/${reportType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admin-${reportType}-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    }
  };

  const handleExportUsersCSV = () => {
    if (!users || users.length === 0) return;

    const csvData = [
      ["Email", "Name", "Visited Count", "Wishlist Count", "Experiences Count", "Created At"],
      ...users.map(u => [
        u.email,
        `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        u.stats?.visitedCount || 0,
        u.stats?.wishlistCount || 0,
        u.stats?.experiencesCount || 0,
        new Date(u.createdAt).toLocaleDateString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-export-${Date.now()}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
  }

  if (!systemStats) {
    return <div className="admin-error">Failed to load admin data</div>;
  }

  // Prepare chart data
  const userTrendsData = userTrends ? {
    labels: userTrends.map(t => t.period),
    datasets: [{
      label: "New Users",
      data: userTrends.map(t => t.count),
      borderColor: "#4A90E2",
      backgroundColor: "rgba(74, 144, 226, 0.2)",
      tension: 0.4
    }]
  } : null;

  const popularCountriesData = popularCountries ? {
    labels: popularCountries.mostVisited.slice(0, 10).map(c => c.countryName),
    datasets: [{
      label: "Times Visited",
      data: popularCountries.mostVisited.slice(0, 10).map(c => c.count),
      backgroundColor: "#36A2EB"
    }]
  } : null;

  const themePopularityData = themePopularity ? {
    labels: themePopularity.slice(0, 8).map(t => t.theme),
    datasets: [{
      label: "Number of Experiences",
      data: themePopularity.slice(0, 8).map(t => t.count),
      backgroundColor: [
        "#FF6384",
        "#36A2EB",
        "#FFCE56",
        "#4BC0C0",
        "#9966FF",
        "#FF9F40",
        "#FF6384",
        "#C9CBCF"
      ]
    }]
  } : null;

  const regionalDistributionData = regionalStats ? {
    labels: regionalStats.map(r => r._id || "Unknown"),
    datasets: [{
      label: "Countries Visited",
      data: regionalStats.map(r => r.count),
      backgroundColor: [
        "#FF6384",
        "#36A2EB",
        "#FFCE56",
        "#4BC0C0",
        "#9966FF",
        "#FF9F40"
      ]
    }]
  } : null;

  const engagementDistributionData = engagement ? {
    labels: ["High", "Medium", "Low"],
    datasets: [{
      label: "Number of Users",
      data: [
        engagement.engagementDistribution.high,
        engagement.engagementDistribution.medium,
        engagement.engagementDistribution.low
      ],
      backgroundColor: ["#27ae60", "#f39c12", "#e74c3c"]
    }]
  } : null;

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>System-wide analytics and user management</p>
      </div>

      {/* System Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-number">{systemStats.overview.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-number">{systemStats.overview.activeUsers}</div>
          <div className="stat-label">Active Users (30d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-number">{systemStats.overview.totalVisited}</div>
          <div className="stat-label">Countries Visited</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-number">{systemStats.overview.totalWishlist}</div>
          <div className="stat-label">Wishlisted</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-number">{systemStats.overview.totalExperiences}</div>
          <div className="stat-label">Total Experiences</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-number">{systemStats.overview.averageVisitedPerUser}</div>
          <div className="stat-label">Avg Countries/User</div>
        </div>
      </div>

      {/* Download Reports */}
      <div className="admin-reports-section">
        <h2>📥 Download System Reports</h2>
        <div className="reports-grid">
          <button className="report-btn" onClick={() => handleDownloadReport("users-summary")}>
            👥 All Users Summary
          </button>
          <button className="report-btn" onClick={() => handleDownloadReport("country-popularity")}>
            🌍 Country Popularity Report
          </button>
          <button className="report-btn" onClick={() => handleDownloadReport("engagement")}>
            📈 User Engagement Report
          </button>
          <button className="report-btn" onClick={handleExportUsersCSV}>
            📊 Users CSV Export
          </button>
          <button className="report-btn" onClick={() => handleDownloadReport("system-statistics")}>
            🔢 System Statistics PDF
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="admin-charts-section">
        <h2>📊 Analytics & Visualizations</h2>
        
        <div className="charts-grid">
          {/* User Registration Trends */}
          {userTrendsData && (
            <div className="chart-container full-width">
              <h3>User Registration Trends</h3>
              <Line 
                data={userTrendsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Most Popular Countries */}
          {popularCountriesData && (
            <div className="chart-container full-width">
              <h3>Most Visited Countries</h3>
              <Bar 
                data={popularCountriesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  indexAxis: 'y',
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Travel Theme Popularity */}
          {themePopularityData && (
            <div className="chart-container">
              <h3>Travel Theme Popularity</h3>
              <Pie 
                data={themePopularityData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true
                }}
              />
            </div>
          )}

          {/* Regional Distribution */}
          {regionalDistributionData && (
            <div className="chart-container">
              <h3>Regional Distribution</h3>
              <Pie 
                data={regionalDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true
                }}
              />
            </div>
          )}

          {/* User Engagement */}
          {engagementDistributionData && (
            <div className="chart-container">
              <h3>User Engagement Levels</h3>
              <Bar 
                data={engagementDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Top Rated Countries */}
      {countryRatings && countryRatings.length > 0 && (
        <div className="top-countries-section">
          <h2>⭐ Top Rated Countries</h2>
          <div className="top-countries-list">
            {countryRatings.slice(0, 10).map((country, index) => (
              <div key={index} className="top-country-item">
                <span className="rank">#{index + 1}</span>
                <span className="country-name">{country._id}</span>
                <span className="rating">⭐ {country.averageRating.toFixed(2)}/10</span>
                <span className="count">({country.totalExperiences} experiences)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Users */}
      <div className="recent-users-section">
        <h2>👥 Recent Users</h2>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Visited</th>
                <th>Wishlist</th>
                <th>Experiences</th>
                <th>Joined</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.stats?.visitedCount || 0}</td>
                  <td>{user.stats?.wishlistCount || 0}</td>
                  <td>{user.stats?.experiencesCount || 0}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Wishlisted Countries */}
      {popularCountries && popularCountries.mostWishlisted.length > 0 && (
        <div className="wishlist-section">
          <h2>⭐ Most Wishlisted Countries</h2>
          <div className="wishlist-grid">
            {popularCountries.mostWishlisted.slice(0, 10).map((country, index) => (
              <div key={index} className="wishlist-card">
                <div className="wishlist-rank">#{index + 1}</div>
                <div className="wishlist-name">{country.countryName}</div>
                <div className="wishlist-count">{country.count} users</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Insights */}
      {engagement && (
        <div className="engagement-insights">
          <h2>📈 User Engagement Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>Average Activity</h3>
              <p className="insight-value">{engagement.averageActivity}</p>
              <p className="insight-label">actions per user</p>
            </div>
            <div className="insight-card high">
              <h3>High Engagement</h3>
              <p className="insight-value">{engagement.engagementDistribution.high}</p>
              <p className="insight-label">users (20+ activities)</p>
            </div>
            <div className="insight-card medium">
              <h3>Medium Engagement</h3>
              <p className="insight-value">{engagement.engagementDistribution.medium}</p>
              <p className="insight-label">users (5-19 activities)</p>
            </div>
            <div className="insight-card low">
              <h3>Low Engagement</h3>
              <p className="insight-value">{engagement.engagementDistribution.low}</p>
              <p className="insight-label">users ({"<5 activities"})</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;