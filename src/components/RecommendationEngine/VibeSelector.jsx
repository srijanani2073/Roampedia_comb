import React, { useState } from "react";
import { Sparkles, Map, Activity } from "lucide-react";
import "./VibeSelector.css";

const VibeSelector = ({ onSearch, isLoading = false }) => {
  const [selectedVibes, setSelectedVibes] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    region: "",
    season: "",
    budget: "",
    excludeVisited: false,
  });

  // Vibe tags with emojis
  const vibeOptions = [
    { value: "Tropical", emoji: "🏝️", color: "#16a085" },
    { value: "Historic", emoji: "🏛️", color: "#8e44ad" },
    { value: "Adventurous", emoji: "🏔️", color: "#e74c3c" },
    { value: "Romantic", emoji: "💕", color: "#e91e63" },
    { value: "Cultural", emoji: "🎭", color: "#9b59b6" },
    { value: "Modern", emoji: "🏙️", color: "#3498db" },
    { value: "Rustic", emoji: "🌾", color: "#d35400" },
    { value: "Peaceful", emoji: "🕊️", color: "#27ae60" },
    { value: "Vibrant", emoji: "🎨", color: "#f39c12" },
    { value: "Serene", emoji: "🧘", color: "#1abc9c" },
    { value: "Wild", emoji: "🦁", color: "#e67e22" },
    { value: "Luxurious", emoji: "💎", color: "#c0392b" },
    { value: "Spiritual", emoji: "🕉️", color: "#9b59b6" },
    { value: "Remote", emoji: "🗺️", color: "#34495e" },
    { value: "Lively", emoji: "🎉", color: "#f1c40f" },
    { value: "Warm", emoji: "☀️", color: "#e67e22" },
    { value: "Artistic", emoji: "🎨", color: "#9b59b6" },
    { value: "Futuristic", emoji: "🚀", color: "#3498db" },
    { value: "Untouched", emoji: "🌿", color: "#27ae60" },
    { value: "Elegant", emoji: "✨", color: "#95a5a6" },
  ];

  // Activity tags with emojis
  const activityOptions = [
    { value: "Hiking", emoji: "🥾", color: "#27ae60" },
    { value: "Beach Leisure", emoji: "🏖️", color: "#3498db" },
    { value: "Museum Visits", emoji: "🏛️", color: "#8e44ad" },
    { value: "Shopping", emoji: "🛍️", color: "#e91e63" },
    { value: "Food Exploration", emoji: "🍜", color: "#e67e22" },
    { value: "Safari", emoji: "🦒", color: "#d35400" },
    { value: "Snorkeling", emoji: "🤿", color: "#16a085" },
    { value: "Cultural Tours", emoji: "🏮", color: "#9b59b6" },
    { value: "Festivals", emoji: "🎊", color: "#f39c12" },
    { value: "Skiing", emoji: "⛷️", color: "#3498db" },
    { value: "Road Trips", emoji: "🚗", color: "#e74c3c" },
    { value: "Photography", emoji: "📸", color: "#34495e" },
    { value: "Island Hopping", emoji: "🏝️", color: "#1abc9c" },
    { value: "Camping", emoji: "⛺", color: "#27ae60" },
    { value: "Sightseeing", emoji: "🗼", color: "#f39c12" },
    { value: "Architecture Walks", emoji: "🏰", color: "#95a5a6" },
    { value: "Wine Tastings", emoji: "🍷", color: "#c0392b" },
    { value: "Waterfall Visits", emoji: "💦", color: "#3498db" },
    { value: "Market Visits", emoji: "🏪", color: "#e67e22" },
    { value: "Temple Visits", emoji: "⛩️", color: "#9b59b6" },
  ];

  const regions = ["Africa", "Americas", "Asia", "Europe", "Oceania", "Middle East", "Caribbean"];
  const budgets = ["Budget", "Mid-range", "Luxury"];

  const toggleVibe = (vibe) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const toggleActivity = (activity) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleSearch = () => {
    if (selectedVibes.length === 0 && selectedActivities.length === 0) {
      alert("Please select at least one vibe or activity!");
      return;
    }

    onSearch({
      vibes: selectedVibes,
      activities: selectedActivities,
      filters,
    });
  };

  const handleReset = () => {
    setSelectedVibes([]);
    setSelectedActivities([]);
    setFilters({
      region: "",
      season: "",
      budget: "",
      excludeVisited: false,
    });
  };

  return (
    <div className="vibe-selector-container">
      <div className="vibe-selector-header">
        <Sparkles className="header-icon" size={32} />
        <h2>Discover Your Perfect Destination</h2>
        <p>Select the vibes and activities that match your travel style</p>
      </div>

      {/* Vibe Selection */}
      <div className="selection-section">
        <div className="section-title">
          <Sparkles size={20} />
          <h3>Travel Vibes</h3>
          <span className="selection-count">
            {selectedVibes.length} selected
          </span>
        </div>
        <div className="tags-grid">
          {vibeOptions.map((option) => (
            <button
              key={option.value}
              className={`tag-chip ${
                selectedVibes.includes(option.value) ? "selected" : ""
              }`}
              style={{
                "--tag-color": option.color,
              }}
              onClick={() => toggleVibe(option.value)}
            >
              <span className="tag-emoji">{option.emoji}</span>
              <span className="tag-label">{option.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Selection */}
      <div className="selection-section">
        <div className="section-title">
          <Activity size={20} />
          <h3>Activities</h3>
          <span className="selection-count">
            {selectedActivities.length} selected
          </span>
        </div>
        <div className="tags-grid">
          {activityOptions.map((option) => (
            <button
              key={option.value}
              className={`tag-chip ${
                selectedActivities.includes(option.value) ? "selected" : ""
              }`}
              style={{
                "--tag-color": option.color,
              }}
              onClick={() => toggleActivity(option.value)}
            >
              <span className="tag-emoji">{option.emoji}</span>
              <span className="tag-label">{option.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="advanced-filters">
        <button
          className="toggle-advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Map size={18} />
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
        </button>

        {showAdvanced && (
          <div className="filters-grid">
            <div className="filter-group">
              <label>Region</label>
              <select
                value={filters.region}
                onChange={(e) =>
                  setFilters({ ...filters, region: e.target.value })
                }
              >
                <option value="">Any Region</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Budget</label>
              <select
                value={filters.budget}
                onChange={(e) =>
                  setFilters({ ...filters, budget: e.target.value })
                }
              >
                <option value="">Any Budget</option>
                {budgets.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Season</label>
              <input
                type="text"
                placeholder="e.g., Summer, Winter"
                value={filters.season}
                onChange={(e) =>
                  setFilters({ ...filters, season: e.target.value })
                }
              />
            </div>

            <div className="filter-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.excludeVisited}
                  onChange={(e) =>
                    setFilters({ ...filters, excludeVisited: e.target.checked })
                  }
                />
                Exclude visited countries
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-reset" onClick={handleReset}>
          Reset All
        </button>
        <button
          className="btn-search"
          onClick={handleSearch}
          disabled={isLoading || (selectedVibes.length === 0 && selectedActivities.length === 0)}
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Find My Destinations
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VibeSelector;