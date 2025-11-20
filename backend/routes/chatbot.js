import express from "express";
import axios from "axios";

const router = express.Router();
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

// API Endpoints
const RESTBASE = "https://restcountries.com/v3.1";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const EXCHANGE_API = "https://api.exchangerate-api.com/v4/latest";
const TIMEZONE_API = "https://worldtimeapi.org/api/timezone";
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";

const FAQ = {
  map: "🗺️ Explore the interactive world map on Roampedia's homepage.",
  roampedia: "🌍 Roampedia is a travel exploration platform.",
  trivia: "🎯 Play trivia games to test your knowledge!",
  login: "🔐 Click the profile icon to sign in.",
  weather: "☁️ See live weather on country pages."
};

const SMALL_TALK = {
  hi: "Hi! 👋 Ask me about any country!",
  hello: "Hello! 🌍 Example: 'Capital of India?'",
  hey: "Hey there! 🌎 Try asking about any country!",
  "how are you": "I'm here to help you explore the world! 🌎",
  "what can you do": "I can tell you about countries, weather, exchange rates, time zones, and more! Try: 'Weather in Paris' or 'Exchange rate USD to EUR'"
};

const COUNTRY_ALIASES = {
  "india": "india",
  "usa": "united states",
  "us": "united states",
  "america": "united states",
  "uk": "united kingdom",
  "britain": "united kingdom",
  "england": "united kingdom",
  "uae": "united arab emirates",
  "korea": "south korea",
  "congo": "democratic republic of the congo"
};

// Cache functions
function getCached(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Improved fetch with timeout and retry
async function fetchAPI(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url, { 
        timeout: 8000,
        validateStatus: (status) => status === 200
      });
      return res.data;
    } catch (err) {
      if (i === retries) {
        console.error(`Failed to fetch ${url}:`, err.message);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  return null;
}

// Get country information
async function getCountry(name) {
  const normalized = name.toLowerCase().trim();
  const searchName = COUNTRY_ALIASES[normalized] || normalized;
  const cacheKey = `country:${searchName}`;
  
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  let data = await fetchAPI(`${RESTBASE}/name/${encodeURIComponent(searchName)}?fullText=true`);
  
  if (!data || !data[0]) {
    data = await fetchAPI(`${RESTBASE}/name/${encodeURIComponent(searchName)}`);
  }
  
  if (!data || !data[0]) return null;
  
  let country = data[0];
  if (data.length > 1) {
    const independent = data.filter(c => c.independent === true);
    if (independent.length > 0) country = independent[0];
  }
  
  const c = country;
  const countryInfo = {
    name: c.name?.common || name,
    capital: Array.isArray(c.capital) ? c.capital[0] : c.capital || "No official capital",
    capitalLat: c.capitalInfo?.latlng?.[0],
    capitalLng: c.capitalInfo?.latlng?.[1],
    region: c.region || "Unknown",
    subregion: c.subregion || "Unknown",
    population: c.population || 0,
    area: c.area || 0,
    currencies: c.currencies 
      ? Object.entries(c.currencies).map(([code, curr]) => `${curr.name} (${code})${curr.symbol ? ' ' + curr.symbol : ''}`).join(", ")
      : "Unknown",
    languages: c.languages ? Object.values(c.languages).join(", ") : "Unknown",
    flag: c.flag || "🏳️",
    independent: c.independent || false,
    timezones: c.timezones || [],
    borders: c.borders || [],
    tld: c.tld?.[0] || "Unknown",
    currencyCodes: c.currencies ? Object.keys(c.currencies) : []
  };
  
  setCache(cacheKey, countryInfo);
  return countryInfo;
}

// Get weather for a location
async function getWeather(city) {
  const cacheKey = `weather:${city.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  // First get coordinates from geocoding
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const geoData = await fetchAPI(geoUrl);
  
  if (!geoData || !geoData.results || geoData.results.length === 0) {
    return null;
  }
  
  const { latitude, longitude, name, country } = geoData.results[0];
  
  // Get weather data
  const weatherUrl = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;
  const weatherData = await fetchAPI(weatherUrl);
  
  if (!weatherData || !weatherData.current) return null;
  
  const weather = {
    location: name,
    country: country,
    temperature: weatherData.current.temperature_2m,
    humidity: weatherData.current.relative_humidity_2m,
    precipitation: weatherData.current.precipitation,
    windSpeed: weatherData.current.wind_speed_10m,
    weatherCode: weatherData.current.weather_code
  };
  
  setCache(cacheKey, weather);
  return weather;
}

// Get weather description from code
function getWeatherDescription(code) {
  const weatherCodes = {
    0: "Clear sky ☀️",
    1: "Mainly clear 🌤️", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
    45: "Foggy 🌫️", 48: "Foggy 🌫️",
    51: "Light drizzle 🌦️", 53: "Moderate drizzle 🌦️", 55: "Dense drizzle 🌧️",
    61: "Slight rain 🌧️", 63: "Moderate rain 🌧️", 65: "Heavy rain ⛈️",
    71: "Slight snow 🌨️", 73: "Moderate snow ❄️", 75: "Heavy snow 🌨️",
    80: "Rain showers 🌦️", 81: "Rain showers 🌧️", 82: "Heavy rain showers ⛈️",
    95: "Thunderstorm ⛈️", 96: "Thunderstorm with hail ⛈️"
  };
  return weatherCodes[code] || "Unknown";
}

// Get exchange rate
async function getExchangeRate(from, to) {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  const cacheKey = `exchange:${fromUpper}:${toUpper}`;
  
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await fetchAPI(`${EXCHANGE_API}/${fromUpper}`);
  if (!data || !data.rates || !data.rates[toUpper]) return null;
  
  const rate = {
    from: fromUpper,
    to: toUpper,
    rate: data.rates[toUpper],
    date: data.date
  };
  
  setCache(cacheKey, rate);
  return rate;
}

// Get current time in timezone
async function getTimeInLocation(timezone) {
  const cacheKey = `time:${timezone}`;
  // Shorter cache for time (5 minutes)
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.data;
  }
  
  const data = await fetchAPI(`${TIMEZONE_API}/${encodeURIComponent(timezone)}`);
  if (!data || !data.datetime) return null;
  
  const timeData = {
    timezone: data.timezone,
    datetime: data.datetime,
    time: new Date(data.datetime).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    }),
    date: new Date(data.datetime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
  
  cache.set(cacheKey, { data: timeData, timestamp: Date.now() });
  return timeData;
}

// Get Wikipedia summary
async function getWikiSummary(topic) {
  const cacheKey = `wiki:${topic.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await fetchAPI(`${WIKI_API}/${encodeURIComponent(topic)}`);
  if (!data || data.type === 'disambiguation') return null;
  
  const summary = {
    title: data.title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page
  };
  
  setCache(cacheKey, summary);
  return summary;
}

// Normalize input
function normalizeInput(text) {
  return text.toLowerCase().replace(/[?!.,']/g, '').trim();
}

// Extract country name
function extractCountryName(text) {
  const patterns = [
    /(?:capital of|about|tell me about|info on|information about|describe|explain)\s+(.+)/,
    /what is (.+?)(?:'s| capital| currency| language)/,
    /(.+?)(?:'s capital|'s currency|'s language)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

async function handleMessage(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return "Please send a valid message.";
  }
  
  const normalized = normalizeInput(text);
  const original = text.toLowerCase();
  
  // FAQ responses
  for (const [keyword, response] of Object.entries(FAQ)) {
    if (normalized.includes(keyword)) return response;
  }
  
  // Small talk
  if (SMALL_TALK[normalized]) return SMALL_TALK[normalized];
  
  // Weather queries
  const weatherMatch = original.match(/weather (?:in|at|for)\s+([a-z\s]+)/i) || 
                       original.match(/(?:temperature|climate) (?:in|at|of)\s+([a-z\s]+)/i) ||
                       original.match(/how'?s? (?:the )?weather in\s+([a-z\s]+)/i);
  if (weatherMatch) {
    const location = weatherMatch[1].trim();
    const weather = await getWeather(location);
    
    if (!weather) {
      return `Sorry, I couldn't find weather data for '${location}'. Try a major city name.`;
    }
    
    return (
      `🌡️ **Weather in ${weather.location}, ${weather.country}**\n\n` +
      `${getWeatherDescription(weather.weatherCode)}\n` +
      `Temperature: ${weather.temperature}°C (${(weather.temperature * 9/5 + 32).toFixed(1)}°F)\n` +
      `💧 Humidity: ${weather.humidity}%\n` +
      `💨 Wind Speed: ${weather.windSpeed} km/h\n` +
      `🌧️ Precipitation: ${weather.precipitation} mm`
    );
  }
  
  // Exchange rate queries
  const exchangeMatch = original.match(/(?:exchange rate|convert|currency)\s+([a-z]{3})\s+(?:to|in)\s+([a-z]{3})/i) ||
                        original.match(/([a-z]{3})\s+to\s+([a-z]{3})\s+(?:rate|exchange)/i);
  if (exchangeMatch) {
    const [, from, to] = exchangeMatch;
    const rate = await getExchangeRate(from, to);
    
    if (!rate) {
      return `Sorry, I couldn't find the exchange rate for ${from.toUpperCase()} to ${to.toUpperCase()}. Please check the currency codes.`;
    }
    
    return (
      `💱 **Exchange Rate (${rate.date})**\n\n` +
      `1 ${rate.from} = ${rate.rate.toFixed(4)} ${rate.to}\n` +
      `100 ${rate.from} = ${(rate.rate * 100).toFixed(2)} ${rate.to}\n` +
      `1000 ${rate.from} = ${(rate.rate * 1000).toFixed(2)} ${rate.to}`
    );
  }
  
  // Time queries
  const timeMatch = original.match(/(?:time|clock) (?:in|at)\s+([a-z\s]+)/i) ||
                    original.match(/what time is it in\s+([a-z\s]+)/i);
  if (timeMatch) {
    const location = timeMatch[1].trim();
    const country = await getCountry(location);
    
    if (!country || !country.timezones || country.timezones.length === 0) {
      return `Sorry, I couldn't find timezone information for '${location}'.`;
    }
    
    const timezone = country.timezones[0];
    const timeData = await getTimeInLocation(timezone);
    
    if (!timeData) {
      return `Sorry, I couldn't fetch the current time for '${location}'.`;
    }
    
    return (
      `🕐 **Time in ${country.name}**\n\n` +
      `${timeData.time}\n` +
      `${timeData.date}\n` +
      `⏰ Timezone: ${timeData.timezone}`
    );
  }
  
  // Wikipedia/History queries
  const wikiMatch = original.match(/(?:history of|wiki|wikipedia|tell me about)\s+([a-z\s]+)/i);
  if (wikiMatch && (original.includes('history') || original.includes('wiki'))) {
    const topic = wikiMatch[1].trim();
    const wiki = await getWikiSummary(topic);
    
    if (!wiki) {
      return `Sorry, I couldn't find information about '${topic}' on Wikipedia.`;
    }
    
    const excerpt = wiki.extract.length > 500 
      ? wiki.extract.substring(0, 497) + '...' 
      : wiki.extract;
    
    return (
      `📚 **${wiki.title}**\n\n` +
      `${excerpt}\n\n` +
      `🔗 Read more: ${wiki.url}`
    );
  }
  
  // Region queries
  const regionMatch = original.match(/countries in ([a-z\s]+)/);
  if (regionMatch) {
    const region = regionMatch[1].trim();
    const cacheKey = `region:${region}`;
    let data = getCached(cacheKey);
    
    if (!data) {
      data = await fetchAPI(`${RESTBASE}/region/${encodeURIComponent(region)}`);
      if (Array.isArray(data)) setCache(cacheKey, data);
    }
    
    if (!Array.isArray(data)) {
      return `Sorry, region '${region}' not found. Try: Africa, Europe, Asia, Americas, or Oceania.`;
    }
    
    const names = data
      .filter(c => c.independent !== false)
      .map(c => c.name?.common)
      .filter(Boolean)
      .sort();
    
    return `🌎 **Countries in ${region.charAt(0).toUpperCase() + region.slice(1)}** (${names.length}):\n\n${names.join(", ")}`;
  }
  
  // Language queries
  const langMatch = original.match(/(?:speak|spoken|speaks|language:?)\s*([a-z]+)/);
  if (langMatch) {
    const lang = langMatch[1].trim();
    const cacheKey = `lang:${lang}`;
    let data = getCached(cacheKey);
    
    if (!data) {
      data = await fetchAPI(`${RESTBASE}/lang/${encodeURIComponent(lang)}`);
      if (Array.isArray(data)) setCache(cacheKey, data);
    }
    
    if (!Array.isArray(data)) {
      return `Sorry, couldn't find countries for language '${lang}'. Try full language names like 'spanish' or 'french'.`;
    }
    
    const names = data.map(c => c.name?.common).filter(Boolean).sort();
    return `💬 **Countries where ${lang.charAt(0).toUpperCase() + lang.slice(1)} is spoken** (${names.length}):\n\n${names.join(", ")}`;
  }
  
  // Currency queries
  if (original.includes("euro") || original.includes("eur")) {
    const cacheKey = "currency:eur";
    let data = getCached(cacheKey);
    
    if (!data) {
      data = await fetchAPI(`${RESTBASE}/currency/eur`);
      if (Array.isArray(data)) setCache(cacheKey, data);
    }
    
    if (!Array.isArray(data)) {
      return "Sorry, couldn't fetch Euro-using countries.";
    }
    
    const names = data.map(c => c.name?.common).filter(Boolean).sort();
    return `💱 **Countries using EUR** (${names.length}):\n\n${names.join(", ")}`;
  }
  
  // Country information queries
  const extractedCountry = extractCountryName(original);
  if (extractedCountry) {
    const country = await getCountry(extractedCountry);
    if (!country) {
      return `Sorry, I couldn't find information for '${extractedCountry}'. Please check the spelling.`;
    }
    
    return (
      `${country.flag} **${country.name}**\n\n` +
      `📍 Region: ${country.region} (${country.subregion})\n` +
      `🏙️ Capital: ${country.capital}\n` +
      `💬 Languages: ${country.languages}\n` +
      `💱 Currency: ${country.currencies}\n` +
      `👥 Population: ${country.population.toLocaleString()}\n` +
      `📏 Area: ${country.area.toLocaleString()} km²\n` +
      `🌐 Domain: ${country.tld}\n` +
      `${country.independent ? '🗽 Independent nation' : '⚠️ Dependent territory'}`
    );
  }
  
  // Fallback: try to find country name in text
  const words = text.match(/[a-zA-Z]+(?:\s+[a-zA-Z]+)*/g) || [];
  
  for (let len = Math.min(words.length, 4); len > 0; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const candidate = words.slice(i, i + len).join(' ').trim();
      if (candidate.length < 3) continue;
      
      const country = await getCountry(candidate);
      if (country) {
        return `${country.flag} **${country.name}** — Capital: ${country.capital} | Region: ${country.region} | Population: ${country.population.toLocaleString()}`;
      }
    }
  }
  
  return (
    "🤔 I didn't quite understand that. Try asking:\n\n" +
    "**Country Info:**\n" +
    "• 'What is the capital of India?'\n" +
    "• 'Tell me about Japan'\n\n" +
    "**Weather:**\n" +
    "• 'Weather in Paris'\n" +
    "• 'Temperature in Tokyo'\n\n" +
    "**Time:**\n" +
    "• 'Time in New York'\n" +
    "• 'What time is it in London?'\n\n" +
    "**Exchange Rates:**\n" +
    "• 'Exchange rate USD to EUR'\n" +
    "• 'Convert GBP to JPY'\n\n" +
    "**Other:**\n" +
    "• 'Countries in Europe'\n" +
    "• 'Countries that speak Spanish'"
  );
}

// Main route
router.post("/", async (req, res) => {
  const message = req.body?.message;
  
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ 
      response: "Please send a non-empty 'message' field." 
    });
  }
  
  try {
    const reply = await handleMessage(message);
    res.json({ response: reply });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ 
      response: "Sorry, something went wrong. Please try again." 
    });
  }
});

export default router;