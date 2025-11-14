import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Navbar from "./components/Navbar";
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
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <>
      <Navbar />
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
        <Route 
          path="/recommend" 
          element={
            <ProtectedRoute>
              <RecommendationEngine />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
}

export default App;