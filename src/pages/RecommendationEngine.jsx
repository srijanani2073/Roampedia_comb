import React, { useState } from "react";
import axios from "axios";
import VibeSelector from "../components/RecommendationEngine/VibeSelector";
import RecommendationDisplay from "../components/RecommendationEngine/RecommendationDisplay";
import { useNavigate } from "react-router-dom";
import "./RecommendationEngine.css";

const RecommendationEngine = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-recommendations`,
        {
          userId: localStorage.getItem("userId") || "guest",
          vibes: searchParams.vibes,
          activities: searchParams.activities,
          filters: searchParams.filters,
          limit: 12,
        }
      );

      if (response.data.success) {
        setRecommendations(response.data.recommendations);

        // Scroll to results
        setTimeout(() => {
          document
            .querySelector(".recommendation-display")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError(
        err.response?.data?.error ||
          "Failed to load recommendations. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWishlist = async (country) => {
    try {
      const userId = localStorage.getItem("userId") || "guest";

      await axios.post(`${API_BASE_URL}/api/wishlist`, {
        userId,
        countryCode: country.country,
        countryName: country.country,
        region: country.region,
        flagUrl: country.flagUrl,
      });

      alert(`${country.country} added to your wishlist! ✨`);
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      if (err.response?.status === 400) {
        alert("This country is already in your wishlist!");
      } else {
        alert("Failed to add to wishlist. Please try again.");
      }
    }
  };

  const handleViewCountry = (country) => {
    // Navigate to map or country dashboard with the selected country
    navigate(`/map?country=${encodeURIComponent(country.country)}`);
  };

  const handleFeedback = async (country, liked) => {
    try {
      const userId = localStorage.getItem("userId") || "guest";

      await axios.post(`${API_BASE_URL}/api/recommendations/feedback`, {
        userId,
        countryName: country.country,
        liked,
        tags: [...(country.matchedVibes || []), ...(country.matchedActivities || [])],
      });

      // Show a subtle confirmation
      if (liked) {
        console.log(`Thanks for the feedback on ${country.country}!`);
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
    }
  };

  return (
    <div className="recommendation-engine-page">
      <div className="page-container">
        {/* Header Banner */}
        <div className="page-header">
          <div className="header-emoji">✈️</div>
          <h1>Discover Your Next Adventure</h1>
          <p>
            Tell us what kind of experience you're looking for, and we'll find the
            perfect destinations for you
          </p>
        </div>

        {/* Vibe Selector */}
        <VibeSelector onSearch={handleSearch} isLoading={isLoading} />

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Recommendations Display */}
        <RecommendationDisplay
          recommendations={recommendations}
          onAddToWishlist={handleAddToWishlist}
          onViewCountry={handleViewCountry}
          onFeedback={handleFeedback}
          isLoading={isLoading}
        />

        {/* Empty State - Show when no search has been made yet */}
        {!isLoading && recommendations.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-state-emoji">🌍</div>
            <h3>Ready to explore?</h3>
            <p>
              Select your preferred vibes and activities above to get personalized
              destination recommendations
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationEngine;