import React, { useState, useEffect } from 'react';
import { Globe, MapPin, Trophy, Newspaper, Cloud, ChefHat, Users, Play, ArrowRight, Star, Zap } from 'lucide-react';
import './home.css';
import { Link } from "react-router-dom";

const WorldExplorerLanding = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  const features = [
    {
      icon: <Globe size={48} />,
      title: "Interactive World Map",
      description: "Click directly on any country or use smart filters to begin your exploration journey"
    },
    {
      icon: <Trophy size={48} />,
      title: "Country Trivia Games",
      description: "Test your knowledge with engaging quizzes on geography, culture, and history"
    },
    {
      icon: <Newspaper size={48} />,
      title: "Live News & Weather",
      description: "Stay updated with real-time news and weather conditions from around the globe"
    },
    {
      icon: <MapPin size={48} />,
      title: "Travel Intelligence",
      description: "Get insider tips on best travel times, local customs, and cultural highlights"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartJourney = () => {
    setShowAuthModal(true);
  };

  const handleCloseModal = () => {
    setShowAuthModal(false);
  };

  return (
    <div className="world-explorer-container">
      {/* Hero Section */}
      <section className="hero-section">
        {/* Video Background */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="video-background"
        >
          <source src="landing_world.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Dark overlay for better text readability */}
        <div className="hero-overlay" />

        {/* Animated Background Elements - now more subtle over video */}
        <div className="animated-bg">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className="floating-particle" 
              style={{
                width: Math.random() * 4 + 1 + 'px',
                height: Math.random() * 4 + 1 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDuration: `${4 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-emoji">🌍 Roampedia</div>
          
          <h1 className="hero-title">
            Explore the World, One Country at a Time
          </h1>
          
          <p className="hero-description">
            Discover cultures, test your knowledge, and explore the world through interactive maps, 
            live news, real-time weather, and engaging trivia games
          </p>
          
          <div className="hero-buttons">
            <button 
              onClick={() => scrollToSection('features')}
              className="btn-primary"
            >
              <Play size={20} />
              Start Exploring
            </button>
            <Link to="/map" className="btn-secondary">
            <Globe size={20} />
            Explore the Interactive Map
            </Link>
          </div>
        </div>
        

        {/* Scroll Indicator */}
        <div className="scroll-indicator">
          <div className="scroll-line" />
          <div className="scroll-dot" />
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        data-animate
        className={`features-section ${isVisible.features ? 'visible' : ''}`}
      >
        <div className="features-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number stat-blue">195</div>
              <div className="stat-label">Countries</div>
            </div>
            <div className="stat-item">
              <div className="stat-number stat-green">180+</div>
              <div className="stat-label">Currencies</div>
            </div>
            <div className="stat-item">
              <div className="stat-number stat-purple">1000+</div>
              <div className="stat-label">Cultural Facts</div>
            </div>
            <div className="stat-item">
              <div className="stat-number stat-red">24/7</div>
              <div className="stat-label">Live Updates</div>
            </div>
          </div>
          <div className="stats-spacer"></div>
        </div>
        <div className="features-main">
          <h2 className="features-title">
            ✨ Discover What Makes Us Special
          </h2>
          
          <p className="features-subtitle">
            Powerful features designed to make your world exploration journey unforgettable
          </p>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`feature-card ${currentFeature === index ? 'active' : ''}`}
                onClick={() => setCurrentFeature(index)}
              >
                <div className="feature-icon">
                  {feature.icon}
                </div>
                
                <h3 className="feature-title">
                  {feature.title}
                </h3>
                
                <p className="feature-description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-emoji">🚀</div>
          
          <h2 className="cta-title">
            Ready to Explore the World?
          </h2>
          
          <p className="cta-description">
            Join thousands of explorers discovering cultures, testing knowledge, and traveling the world from home
          </p>
          
          <button className="cta-button" onClick={handleStartJourney}>
            <Zap size={20} />
            Start Your Journey
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-brand-header">
                <Globe size={24} className="footer-brand-icon" />
                <span className="footer-brand-name">Roampedia</span>
              </div>
              <p className="footer-brand-description">
                Your comprehensive travel companion for exploring the world with confidence.
              </p>
            </div>

            {/* Features */}
            <div className="footer-column">
              <h4 className="footer-column-title">Features</h4>
              <ul className="footer-list">
                <li>Live News</li>
                <li>Travel Guides</li>
                <li>Weather Forecast</li>
                <li>Cultural Discovery</li>
              </ul>
            </div>

            {/* Tools */}
            <div className="footer-column">
              <h4 className="footer-column-title">Tools</h4>
              <ul className="footer-list">
                <li>Currency Converter</li>
                <li>Country Comparison</li>
                <li>Travel Planner</li>
                <li>Weather Checker</li>
              </ul>
            </div>

            {/* Support */}
            <div className="footer-column">
              <h4 className="footer-column-title">Support</h4>
              <ul className="footer-list">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="footer-divider">
            © 2025 Roampedia. All rights reserved. Built with React.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WorldExplorerLanding;
