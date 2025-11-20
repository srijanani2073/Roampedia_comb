import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Navbar from "./components/Navbar";
import CurrencyConverter from "./components/CountryDashboard/CurrencyConverter";
import NewsFeed from "./components/CountryDashboard/NewsFeed";
import ItineraryDashboard from "./components/ItineraryDashboard/ItineraryDashboard";
import RoampediaMap from './components/RoampediaMap';
import "mapbox-gl/dist/mapbox-gl.css";
import Chatbot from "./components/ChatBot";
import RecommendationEngine from "./pages/RecommendationEngine";
import ProtectedRoute from "./components/ProtectedRoute";
import UserProfile from './components/UserProfile/UserProfile';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Pass standalone={true} prop for dedicated pages */}
        <Route path="/news" element={<NewsFeed standalone={true} />} />
        <Route path="/currency" element={<CurrencyConverter standalone={true} />} />
        <Route path="/itinerary" element={<ItineraryDashboard />} />
        <Route path="/map" element={<RoampediaMap />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/profile" element={<ProtectedRoute>
          <UserProfile />
          </ProtectedRoute>} />
        <Route path="/admin" element={ <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
          </ProtectedRoute>} />
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