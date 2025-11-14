import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Navbar from "./components/Navbar";
import { supabase } from "./supabaseClient";
import CurrencyConverter from "./components/CurrencyConverter";
import NewsFeed from "./components/NewsFeed";
import ItineraryModule from "./components/ItineraryModule";
import TriviaModule from "./components/TriviaModule";
import ItineraryPlanner from "./components/ItineraryPlanner";
import ItineraryDashboard from "./components/ItineraryDashboard/ItineraryDashboard";
import RoampediaMap from './components/RoampediaMap';
import "mapbox-gl/dist/mapbox-gl.css";
import Chatbot from "./components/ChatBot";
import RecommendationEngine from "./pages/RecommendationEngine";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Navbar user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/currency" element={<CurrencyConverter />} />
        <Route path="/itinerary" element={<ItineraryModule />} />
        <Route path="/trivia" element={<TriviaModule />} />
        <Route path="/itineraryplanner" element={<ItineraryPlanner />} />
        <Route path="/itinerarydashboard" element={<ItineraryDashboard />} />
        <Route path="/map" element={<RoampediaMap />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/recommend" element={<RecommendationEngine />} />
      </Routes>
    </Router>
  );
}

export default App;