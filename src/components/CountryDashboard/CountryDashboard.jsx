import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import apiClient from "../../utils/api"; // ✅ Import apiClient for authenticated requests
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { FaCheck, FaStar, FaPlus } from "react-icons/fa";
import WeatherCard from "./WeatherCard";
import NewsFeed from "./NewsFeed";
import CurrencyConverter from "./CurrencyConverter";
import TemperatureChart from "./TemperatureChart";
import TravelInsights from "./TravelInsights";
import BestTimeToVisit from "./BestTimeToVisit";
import TravelListManager from "./TravelListManager";
import ExperienceModal from "./ExperienceModal";
import AddExperienceForm from "./AddExperienceForm";
import AuthModal from "../AuthModal";
import TriviaCard from "./TriviaCard";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

import "./CountryDashboard.css";
import "leaflet/dist/leaflet.css";

export default function CountryDashboard({
  countryCode,
  countryName,
  onClose,
  cacheTTL = 1000 * 60 * 15,
}) {
  const NEWSDATA_API_KEY = "pub_9eeba8abf7fc48a681df8f921c969433";
  
  // Authentication
  const { user, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [country, setCountry] = useState(null);
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState([]);
  const [timezone, setTimezone] = useState(null);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [wikiSummary, setWikiSummary] = useState(null);
  const [wikidataFacts, setWikidataFacts] = useState(null);
  const [localTime, setLocalTime] = useState(null);
  const [accentColor, setAccentColor] = useState("#4A90E2");
  const navigate = useNavigate();
  const [showExperienceForm, setShowExperienceForm] = useState(false);

  // per-country in-memory status for session-only persistence
  const [countryStatus, setCountryStatus] = useState({});
  const [isVisited, setIsVisited] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // In-memory cache
  const [cache, setCache] = useState({});
  const clockRef = useRef(null);

  // Cache helpers
  const keyPrefix = `roampedia_${countryCode || "nocode"}`;

  const setCacheValue = (suffix, payload, ttl = cacheTTL) => {
    const key = `${keyPrefix}_${suffix}`;
    setCache((prev) => ({
      ...prev,
      [key]: { ts: Date.now(), ttl, payload },
    }));
  };

  const getCacheValue = (suffix) => {
    const key = `${keyPrefix}_${suffix}`;
    const cached = cache[key];
    if (!cached) return null;
    if (Date.now() - cached.ts > (cached.ttl || cacheTTL)) {
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
      return null;
    }
    return cached.payload;
  };

  useEffect(() => {
    if (!countryCode) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        // 1) REST Countries
        let rest = getCacheValue("rest");
        if (!rest) {
          const rr = await axios.get(
            `https://restcountries.com/v3.1/alpha/${countryCode}`
          );
          rest = rr.data?.[0];
          setCacheValue("rest", rest, 1000 * 60 * 60 * 24);
        }
        if (!rest) throw new Error("Country info unavailable");

        const normalized = {
          name: rest.name?.common || countryName || countryCode,
          cca2: rest.cca2,
          cca3: rest.cca3,
          capital: Array.isArray(rest.capital)
            ? rest.capital[0]
            : rest.capital || "",
          latlng:
            rest.capitalInfo?.latlng?.length ? rest.capitalInfo.latlng : rest.latlng || [],
          population: rest.population || 0,
          region: rest.region || "",
          flag: rest.flags?.svg || rest.flags?.png || "",
          currencies: rest.currencies || {},
          languages: rest.languages ? Object.values(rest.languages) : [],
          timezones: rest.timezones || [],
        };
        normalized.currencyCode = Object.keys(normalized.currencies || {})[0] || "USD";
        normalized.currencySymbol =
          normalized.currencies?.[normalized.currencyCode]?.symbol || "";

        if (mounted) setCountry(normalized);

        // Accent color from flag
        extractAccentFromFlag(normalized.flag).then((color) => {
          if (mounted && color) setAccentColor(color);
        });

        // 2) Weather
        let w = getCacheValue("weather");
        if (!w && normalized.latlng?.length) {
          const [lat, lon] = normalized.latlng;
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=UTC`;
          const wresp = await axios.get(weatherUrl);
          w = wresp.data;
          setCacheValue("weather", w, 1000 * 60 * 30);
        }
        if (mounted) setWeather(w);

        // 3) Timezone
        let tz = getCacheValue("timezone");
        if (!tz && normalized.latlng?.length) {
          try {
            const [lat, lon] = normalized.latlng;
            const tzUrl = `https://api.timezonedb.com/v2.1/get-time-zone?key=P1AEFU4GTZEQ&format=json&by=position&lat=${lat}&lng=${lon}`;
            const tzRes = await axios.get(tzUrl);

            if (tzRes.data.status === "OK") {
              const tzData = tzRes.data;
              tz = {
                timezone: tzData.zoneName,
                utc_offset: formatOffset(tzData.gmtOffset),
                datetime: new Date(tzData.timestamp * 1000).toISOString(),
                timestamp: tzData.timestamp,
                gmtOffset: tzData.gmtOffset,
                abbreviation: tzData.abbreviation,
                dst: tzData.dst,
              };
              setCacheValue("timezone", tz, 1000 * 60 * 30);
            } else {
              throw new Error("TimezoneDB API error");
            }
          } catch (err) {
            console.warn("TimezoneDB API failed, using fallback", err.message);
            tz = calculateFallbackTimezone(normalized.timezones?.[0]);
          }
        } else if (!tz) {
          tz = calculateFallbackTimezone(normalized.timezones?.[0]);
        }

        if (mounted) {
          setTimezone(tz);
          startClock(tz);
        }

        // 4) News
        let newsCached = getCacheValue("news");
        if (!newsCached) {
          try {
            const alpha2 = normalized.cca2?.toLowerCase();
            const nUrl = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${alpha2}&language=en`;
            const nresp = await axios.get(nUrl);
            newsCached = nresp.data?.results || [];
            setCacheValue("news", newsCached, 1000 * 60 * 30);
          } catch (ne) {
            console.warn("news fetch err", ne);
            newsCached = [];
          }
        }
        if (mounted) setNews(newsCached);

        // 5) Exchange rates
        let ex = getCacheValue("exchange");
        if (!ex) {
          try {
            const xr = await axios.get("https://api.exchangerate-api.com/v4/latest/USD");
            ex = xr.data;
            setCacheValue("exchange", ex, 1000 * 60 * 60);
          } catch (xe) {
            console.warn("exchange fetch err", xe);
          }
        }
        if (mounted) setExchangeRates(ex);

        // 6) Wikipedia summary
        let wiki = getCacheValue("wiki");
        if (!wiki) {
          try {
            const wikiName = encodeURIComponent(normalized.name);
            const wkr = await axios.get(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiName}`
            );
            wiki = {
              extract: wkr.data.extract || "",
              url: wkr.data.content_urls?.desktop?.page || "",
            };
            setCacheValue("wiki", wiki, 1000 * 60 * 60 * 24);
          } catch (we) {
            console.warn("wiki fetch err", we);
          }
        }
        if (mounted) setWikiSummary(wiki);

        // 7) Wikidata fun facts
        let wikidata = getCacheValue("wikidata");
        if (!wikidata) {
          try {
            const wdRes = await fetchWikidataFacts(normalized.name);
            wikidata = wdRes;
            setCacheValue("wikidata", wikidata, 1000 * 60 * 60 * 24 * 7);
          } catch (wd) {
            console.warn("wikidata fetch err", wd);
          }
        }
        if (mounted) setWikidataFacts(wikidata);

        // 8) ✅ Load user's visited/wishlist status if authenticated
        if (isAuthenticated) {
          await loadUserStatus(normalized.cca3 || normalized.cca2);
        }

        if (mounted) setLoading(false);
      } catch (err) {
        console.error("fetchAll error:", err);
        if (mounted) {
          setError(err.message || "Failed to load country data");
          setLoading(false);
        }
      }
    }

    fetchAll();

    return () => {
      mounted = false;
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [countryCode, isAuthenticated]);

  // ✅ Load user's visited/wishlist status using apiClient
  const loadUserStatus = async (code) => {
    try {
      // ✅ Using apiClient which automatically adds auth token
      const [visitedRes, wishlistRes] = await Promise.all([
        apiClient.get("/api/visited"),
        apiClient.get("/api/wishlist")
      ]);

      const visited = visitedRes.data.some(item => item.countryCode === code);
      const wishlisted = wishlistRes.data.some(item => item.countryCode === code);

      setIsVisited(visited);
      setIsWishlisted(wishlisted);
    } catch (err) {
      console.error("Error loading user status:", err);
      // Don't show error to user as this is a background operation
    }
  };

  // Helper: Wikidata SPARQL query for country facts
  async function fetchWikidataFacts(countryName) {
    const sparql = `
      SELECT ?countryLabel ?population ?area ?gdp ?currency WHERE {
        ?country wdt:P31 wd:Q6256 ;
                 rdfs:label "${countryName}"@en .
        OPTIONAL { ?country wdt:P1082 ?population . }
        OPTIONAL { ?country wdt:P2046 ?area . }
        OPTIONAL { ?country wdt:P2131 ?gdp . }
        OPTIONAL { ?country wdt:P38 ?currencyItem . ?currencyItem rdfs:label ?currency FILTER (LANG(?currency)='en') . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      } LIMIT 1
    `;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
      sparql
    )}&format=json`;
    const res = await axios.get(url, {
      headers: { Accept: "application/sparql-results+json" },
    });
    const bindings = res.data?.results?.bindings;
    if (!bindings || !bindings.length) return null;

    const b = bindings[0];
    return {
      population: b.population?.value || null,
      area: b.area?.value || null,
      gdp: b.gdp?.value || null,
      currency: b.currency?.value || null,
    };
  }

  // Helper: extract accent from flag
  async function extractAccentFromFlag(flagUrl) {
    if (!flagUrl) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        try {
          const { data } = ctx.getImageData(0, 0, img.width, img.height);
          const colors = [];
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a > 200) {
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              if (lum > 40 && lum < 220) {
                colors.push({ r, g, b });
              }
            }
          }
          if (!colors.length) return resolve(null);
          const avgR = Math.round(
            colors.reduce((s, c) => s + c.r, 0) / colors.length
          );
          const avgG = Math.round(
            colors.reduce((s, c) => s + c.g, 0) / colors.length
          );
          const avgB = Math.round(
            colors.reduce((s, c) => s + c.b, 0) / colors.length
          );
          resolve(`rgb(${avgR},${avgG},${avgB})`);
        } catch (e) {
          console.warn("Canvas error extracting color", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = flagUrl;
    });
  }

  // Helper: format UTC offset
  function formatOffset(seconds) {
    const hours = Math.floor(Math.abs(seconds) / 3600);
    const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
    const sign = seconds >= 0 ? "+" : "-";
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    return `${sign}${hh}:${mm}`;
  }

  // Fallback timezone
  function calculateFallbackTimezone(tzString) {
    if (!tzString) {
      return { timezone: "Unknown", utc_offset: "+00:00", datetime: new Date().toISOString() };
    }
    const match = tzString.match(/(UTC|GMT)([\+\-]\d+)/i);
    if (!match) {
      return { timezone: tzString, utc_offset: "+00:00", datetime: new Date().toISOString() };
    }
    const sign = match[2].startsWith("-") ? -1 : 1;
    const offset = parseInt(match[2].replace(/[\+\-]/, ""), 10);
    const totalSeconds = sign * offset * 3600;
    return {
      timezone: tzString,
      utc_offset: formatOffset(totalSeconds),
      datetime: new Date(Date.now() + totalSeconds * 1000).toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
      gmtOffset: totalSeconds,
    };
  }

  // Start local clock
  function startClock(tzData) {
    if (!tzData) return;
    if (clockRef.current) clearInterval(clockRef.current);
    
    const updateLocalTime = () => {
      if (!tzData.gmtOffset) {
        setLocalTime(new Date().toLocaleTimeString());
        return;
      }
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const local = new Date(utc + tzData.gmtOffset * 1000);
      setLocalTime(local.toLocaleTimeString());
    };

    updateLocalTime();
    clockRef.current = setInterval(updateLocalTime, 1000);
  }

  // Status helpers
  const statusKey = country?.cca3 || country?.cca2 || countryCode;

  useEffect(() => {
    if (!country) {
      setIsVisited(false);
      setIsWishlisted(false);
      return;
    }
    const s = countryStatus[statusKey];
    setIsVisited(Boolean(s?.visited));
    setIsWishlisted(Boolean(s?.wishlist));
  }, [country, countryStatus, statusKey]);

  // ✅ Toggle Visited - REQUIRES AUTHENTICATION
  const toggleVisited = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (!country) return;
      const code = country.cca3 || country.cca2 || countryCode;
      const payload = {
        countryCode: code,
        countryName: country.name,
        region: country.region,
        flagUrl: country.flag,
      };

      // optimistic UI update
      setIsVisited((prev) => !prev);
      setCountryStatus((prev) => {
        const cur = prev[statusKey] || { visited: false, wishlist: false };
        const next = { ...cur, visited: !cur.visited };
        return { ...prev, [statusKey]: next };
      });

      if (isVisited) {
        // currently visited -> remove
        // ✅ Using apiClient which automatically adds auth token
        await apiClient.delete(`/api/visited/${encodeURIComponent(code)}`);
      } else {
        // currently not visited -> add
        // ✅ Using apiClient which automatically adds auth token
        await apiClient.post("/api/visited", payload);
      }
    } catch (err) {
      // revert optimistic update on failure
      console.error("Failed to toggle visited:", err);
      setIsVisited((v) => !v);
      setCountryStatus((prev) => {
        const cur = prev[statusKey] || { visited: false, wishlist: false };
        const next = { ...cur, visited: !cur.visited };
        return { ...prev, [statusKey]: next };
      });
      
      // Show auth modal if 401 error
      if (err.response?.status === 401) {
        setShowAuthModal(true);
      }
    }
  };

  // ✅ Toggle Wishlist - REQUIRES AUTHENTICATION
  const toggleWishlist = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (!country) return;
      const code = country.cca3 || country.cca2 || countryCode;
      const payload = {
        countryCode: code,
        countryName: country.name,
        region: country.region,
        flagUrl: country.flag,
      };

      // optimistic UI update
      setIsWishlisted((prev) => !prev);
      setCountryStatus((prev) => {
        const cur = prev[statusKey] || { visited: false, wishlist: false };
        const next = { ...cur, wishlist: !cur.wishlist };
        return { ...prev, [statusKey]: next };
      });

      if (isWishlisted) {
        // remove from wishlist
        // ✅ Using apiClient which automatically adds auth token
        await apiClient.delete(`/api/wishlist/${encodeURIComponent(code)}`);
      } else {
        // add to wishlist
        // ✅ Using apiClient which automatically adds auth token
        await apiClient.post("/api/wishlist", payload);
      }
    } catch (err) {
      // revert optimistic update on failure
      console.error("Failed to toggle wishlist:", err);
      setIsWishlisted((v) => !v);
      setCountryStatus((prev) => {
        const cur = prev[statusKey] || { visited: false, wishlist: false };
        const next = { ...cur, wishlist: !cur.wishlist };
        return { ...prev, [statusKey]: next };
      });
      
      // Show auth modal if 401 error
      if (err.response?.status === 401) {
        setShowAuthModal(true);
      }
    }
  };

  // ✅ Handle Add Experience - REQUIRES AUTHENTICATION
  const handleAddExperience = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!isVisited) {
      alert("Please mark this country as visited first before adding an experience!");
      return;
    }

    setShowExperienceForm(true);
  };

  return (
    <AnimatePresence>
      {countryCode && (
        <motion.aside
          className="cd-drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <div className="cd-top">
            <div className="cd-left">
              <div className="flag-wrap" style={{ borderColor: accentColor }}>
                {country?.flag && <img src={country.flag} alt={`${country.name} flag`} />}
              </div>
              <div className="title-block">
                <h3 style={{ color: accentColor }}>{country?.name || countryName || countryCode}</h3>
                <div className="sub">
                  {country?.capital ? `${country.capital} • ${country.region}` : country?.region}
                </div>
                {timezone && (
                  <div className="timezone">
                    🕒 {timezone.timezone} (UTC{timezone.utc_offset}) — Local Time: {localTime || "—"}
                  </div>
                )}
              </div>
            </div>

            <div className="cd-actions">
              <button
                className={`icon-btn ${isVisited ? "active-visited" : ""}`}
                onClick={toggleVisited}
                title={isAuthenticated 
                  ? (isVisited ? "Remove from Visited" : "Mark as Visited")
                  : "Login to mark as visited"
                }
                aria-pressed={isVisited}
                aria-label={isVisited ? "Visited — selected" : "Mark as visited"}
              >
                <FaCheck />
              </button>

              <button
                className={`icon-btn ${isWishlisted ? "active-wishlist" : ""}`}
                onClick={toggleWishlist}
                title={isAuthenticated
                  ? (isWishlisted ? "Remove from Wishlist" : "Add to Wishlist")
                  : "Login to add to wishlist"
                }
                aria-pressed={isWishlisted}
                aria-label={isWishlisted ? "Wishlisted — selected" : "Add to wishlist"}
              >
                <FaStar />
              </button>

              <button
                className={`icon-btn ${isVisited ? "active-plus" : "disabled-plus"}`}
                onClick={handleAddExperience}
                title={!isAuthenticated 
                  ? "Login to add experience"
                  : isVisited 
                    ? "Add your travel experience" 
                    : "Mark visited first"
                }
                disabled={!isAuthenticated || !isVisited}
              >
                <FaPlus />
              </button>

              <button className="btn" onClick={onClose} title="Close">
                ✕
              </button>
              
              {/* Experience Form Modal */}
              {showExperienceForm && (
                <div className="experience-modal-overlay">
                  <div className="experience-modal">
                    <button
                      className="close-modal-btn"
                      onClick={() => setShowExperienceForm(false)}
                    >
                      ✕
                    </button>
                    <ExperienceModal
                      isOpen={showExperienceForm}
                      onClose={() => setShowExperienceForm(false)}
                    >
                      <AddExperienceForm
                        selectedCountry={country?.name || countryName || countryCode}
                        onClose={() => setShowExperienceForm(false)}
                      />
                    </ExperienceModal>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="cd-content">
            {loading ? (
              <div className="cd-loading">Loading…</div>
            ) : error ? (
              <div className="cd-error">{error}</div>
            ) : (
              <div className="cd-grid">
                <div className="left-col">
                  <div className="card quick-card">
                    <div className="card-body">
                      <div className="q-row">
                        <div>
                          <div className="q-label">Local time</div>
                          <div className="q-value">{localTime || "—"}</div>
                        </div>

                        <div>
                          <div className="q-label">Population</div>
                          <div className="q-value">{country?.population?.toLocaleString() || "—"}</div>
                        </div>

                        <div>
                          <div className="q-label">Currency</div>
                          <div className="q-value">
                            {country?.currencyCode || "—"} {country?.currencySymbol || ""}
                          </div>
                        </div>
                      </div>
                      <div className="q-row small-meta">
                        <div>Languages: {country?.languages?.slice(0, 3).join(", ") || "—"}</div>
                        <div>Region: {country?.region || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <WeatherCard weather={weather} capital={country?.capital} />
                  <TemperatureChart weather={weather} latlng={country?.latlng} />
                  <TriviaCard wikidata={wikidataFacts} wikipedia={wikiSummary} country={country} />
                  <TravelInsights 
                    countryCode={country?.cca3 || countryCode}
                    countryName={country?.name || countryName}
                  />
                </div>

                <div className="right-col">
                  <TravelListManager country={country} />
                  <div className="card map-card">
                    <div className="card-header">Map</div>
                    <div className="card-body map-body">
                      {country?.latlng?.length ? (
                        <div style={{ height: 220 }}>
                          <MapContainer
                            center={[country.latlng[0], country.latlng[1]]}
                            zoom={5}
                            style={{ height: "100%", width: "100%", borderRadius: 8 }}
                            scrollWheelZoom={true}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[country.latlng[0], country.latlng[1]]}>
                              <Popup>{country.name} — {country.capital}</Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="muted">Map preview not available</div>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <a
                          className="link"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            country?.capital || country?.name
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Google Maps ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  <NewsFeed articles={news} />

                  <CurrencyConverter
                    exchangeRates={exchangeRates}
                    defaultTo={country?.currencyCode}
                    defaultToSymbol={country?.currencySymbol}
                  />

                  <BestTimeToVisit
                    latitude={country?.latlng?.[0]}
                    longitude={country?.latlng?.[1]}
                    countryName={country?.name}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Auth Modal */}
          {showAuthModal && (
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}