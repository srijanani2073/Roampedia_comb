import React from "react";
import { MapPin, Heart, Eye, TrendingUp, Star, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import "./RecommendationDisplay.css";

const RecommendationDisplay = ({
  recommendations = [],
  onAddToWishlist,
  onViewCountry,
  onFeedback,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="recommendation-loading">
        <div className="loading-spinner-large" />
        <p>Finding your perfect destinations...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const getMatchColor = (score) => {
    if (score >= 80) return "#27ae60";
    if (score >= 60) return "#f39c12";
    if (score >= 40) return "#e67e22";
    return "#95a5a6";
  };

  return (
    <div className="recommendation-display">
      <div className="recommendation-header">
        <div className="header-content">
          <Star className="header-icon" size={32} />
          <h2>Your Perfect Matches</h2>
          <p>
            We found {recommendations.length} destination{recommendations.length !== 1 ? "s" : ""}{" "}
            that match your preferences
          </p>
        </div>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((country, index) => (
          <div
            key={country._id || country.country}
            className="recommendation-card"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {/* Match Score Badge */}
            <div
              className="match-badge"
              style={{ background: getMatchColor(country.matchScore) }}
            >
              <TrendingUp size={16} />
              {country.matchScore}% Match
            </div>

            {/* Country Image */}
            <div className="card-image">
              {country.imageUrl ? (
                <img src={country.imageUrl} alt={country.country} />
              ) : (
                <div className="placeholder-image">
                  <MapPin size={48} />
                </div>
              )}
              <div className="image-overlay">
                {country.flagUrl && (
                  <img src={country.flagUrl} alt={`${country.country} flag`} className="flag-icon" />
                )}
              </div>
            </div>

            {/* Card Content */}
            <div className="card-content">
              <div className="country-header">
                <h3 className="country-name">{country.country}</h3>
                <div className="country-region">{country.region}</div>
              </div>

              {/* Matched Tags */}
              <div className="matched-tags">
                {country.matchedVibes?.slice(0, 3).map((vibe) => (
                  <span key={vibe} className="tag vibe-tag">
                    {vibe}
                  </span>
                ))}
                {country.matchedActivities?.slice(0, 2).map((activity) => (
                  <span key={activity} className="tag activity-tag">
                    {activity}
                  </span>
                ))}
              </div>

              {/* Reason */}
              <p className="recommendation-reason">{country.reason}</p>

              {/* Additional Info */}
              <div className="country-info">
                {country.climate && (
                  <div className="info-item">
                    <span className="info-label">Climate:</span>
                    <span className="info-value">{country.climate}</span>
                  </div>
                )}
                {country.bestSeason && (
                  <div className="info-item">
                    <span className="info-label">Best Time:</span>
                    <span className="info-value">{country.bestSeason}</span>
                  </div>
                )}
                {country.budgetLevel && (
                  <div className="info-item">
                    <span className="info-label">Budget:</span>
                    <span className="info-value">{country.budgetLevel}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="card-actions">
                <button
                  className="btn-icon wishlist"
                  onClick={() => onAddToWishlist(country)}
                  title="Add to Wishlist"
                >
                  <Heart size={20} />
                </button>
                <button
                  className="btn-primary explore"
                  onClick={() => onViewCountry(country)}
                >
                  <Eye size={18} />
                  Explore
                </button>
                <button
                  className="btn-icon feedback"
                  onClick={() => onFeedback(country, true)}
                  title="I like this suggestion"
                >
                  <ThumbsUp size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View More Section */}
      {recommendations.length >= 10 && (
        <div className="view-more-section">
          <p>Want to explore more destinations?</p>
          <Link to="/map" className="btn-view-more">
            <MapPin size={20} />
            Explore Full Map
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecommendationDisplay;