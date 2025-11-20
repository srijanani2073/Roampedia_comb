import React, { useEffect, useState } from "react";
import "./NewsFeed.css";

/**
 * NewsFeed Component - WORKING VERSION with full inline styles
 * NO CSS CLASSES on the news items to prevent override issues
 */
const NewsFeed = ({ articles: externalArticles = null, standalone = false, country: initialCountry = "in" }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(!externalArticles);
  const [country, setCountry] = useState(initialCountry);
  const [category, setCategory] = useState("top");
  const [language, setLanguage] = useState("en");

  const [interest, setInterest] = useState("");
  const [savedInterests, setSavedInterests] = useState([]);

  const NEWSDATA_API_KEY = "pub_9eeba8abf7fc48a681df8f921c969433";

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${country}&language=${language}&category=${category}`
      );
      const data = await response.json();
      setArticles(data.results || []);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalArticles !== null) {
      setArticles(externalArticles);
      setLoading(false);
    }
  }, [externalArticles]);

  useEffect(() => {
    if (standalone && externalArticles === null) {
      fetchNews();
    }
  }, [country, category, language, standalone]);

  const handleInterestSubmit = (e) => {
    e.preventDefault();
    if (interest.trim() !== "") {
      setSavedInterests([...savedInterests, interest]);
      setInterest("");
    }
  };

  // Render for CountryDashboard (compact version) - FULLY INLINE STYLED
  if (!standalone) {
    return (
      <div className="card">
        <div className="card-header">Top News</div>
        <div style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {(!articles || articles.length === 0) && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
              📰 No recent news available
            </div>
          )}
          {articles.slice(0, 4).map((a, i) => {
            const title = a.title || "Untitled";
            const description = a.description || (a.content ? a.content.slice(0, 120) + "..." : "No description available");
            const date = a.pubDate ? new Date(a.pubDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : "";
            
            return (
              <a 
                key={i}
                href={a.link || "#"} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => {
                  if (!a.link || a.link === "#") {
                    e.preventDefault();
                  }
                }}
                style={{
                  display: 'flex',
                  gap: '12px',
                  textDecoration: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.3)',
                  border: '1px solid rgba(96, 165, 250, 0.08)',
                  transition: 'all 0.2s ease',
                  minHeight: '100px',
                  color: 'inherit'
                }}
              >
                <div style={{
                  width: '96px',
                  height: '72px',
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(29, 78, 216, 0.3) 100%)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(96, 165, 250, 0.15)'
                }}>
                  {a.image_url ? (
                    <img src={a.image_url} alt={title} style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }} onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div style="font-size: 2rem; opacity: 0.6;">📰</div>';
                    }} />
                  ) : (
                    <div style={{ fontSize: '2rem', opacity: 0.6 }}>📰</div>
                  )}
                </div>
                
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  minWidth: 0
                }}>
                  <h4 style={{
                    margin: 0,
                    padding: 0,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#F0F9FF',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    maxHeight: '2.8em',
                    whiteSpace: 'normal'
                  }}>{title}</h4>
                  
                  <p style={{
                    margin: 0,
                    padding: 0,
                    fontSize: '0.85rem',
                    color: '#CBD5E1',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    maxHeight: '2.8em',
                    whiteSpace: 'normal'
                  }}>{description}</p>
                  
                  {date && (
                    <div style={{
                      color: '#94A3B8',
                      fontSize: '0.85rem',
                      marginTop: '4px'
                    }}>🕒 {date}</div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // Render for standalone page (full version with filters)
  return (
    <div className="news-card">
      <h2>📰 Live News Feed</h2>

      <div className="filter-bar">
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="in">India</option>
          <option value="us">USA</option>
          <option value="uk">UK</option>
          <option value="jp">Japan</option>
          <option value="au">Australia</option>
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="top">Top</option>
          <option value="business">Business</option>
          <option value="sports">Sports</option>
          <option value="technology">Technology</option>
          <option value="entertainment">Entertainment</option>
          <option value="science">Science</option>
          <option value="world">World</option>
        </select>

        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>

        <button onClick={fetchNews}>Search</button>
      </div>

      {loading ? (
        <p>Loading news...</p>
      ) : (
        <div className="news-list">
          {articles.slice(0, 8).map((article, index) => (
            <div key={index} className="news-item">
              {article.image_url && (
                <img src={article.image_url} alt={article.title} />
              )}
              <div className="news-content">
                <h3>{article.title}</h3>
                <p>{article.description || "No description available."}</p>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read more →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="news-interest-form">
        <h3>🗒️ Save News Interests</h3>
        <form onSubmit={handleInterestSubmit}>
          <input
            type="text"
            placeholder="Enter a news topic or keyword"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          />
          <button type="submit">Add Interest</button>
        </form>
        <ul>
          {savedInterests.map((topic, i) => (
            <li key={i}>• {topic}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NewsFeed;