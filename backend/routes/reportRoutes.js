import express from "express";
import PDFDocument from "pdfkit";
import User from "../models/User.js";
import Visited from "../models/Visited.js";
import Wishlist from "../models/Wishlist.js";
import UserExperience from "../models/UserExperience.js";
import TravelNote from "../models/TravelNote.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Report Generation Routes
 * Generates PDF reports for users and admins
 */

// ========================================
// USER REPORTS
// ========================================

// Travel Summary Report
router.get("/travel-summary", auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [user, visited, wishlist, experiences] = await Promise.all([
      User.findById(userId).select("-password"),
      Visited.find({ userId }).sort({ dateVisited: -1 }),
      Wishlist.find({ userId }).sort({ addedAt: -1 }),
      UserExperience.find({ userId }).sort({ createdAt: -1 })
    ]);

    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=travel-summary.pdf');
    
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('Travel Summary Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Generated for: ${user.email}`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Overview Section
    doc.fontSize(16).font('Helvetica-Bold').text('Overview');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total Countries Visited: ${visited.length}`);
    doc.text(`Countries on Wishlist: ${wishlist.length}`);
    doc.text(`Total Experiences: ${experiences.length}`);
    if (experiences.length > 0) {
      const avgRating = (experiences.reduce((sum, e) => sum + e.rating, 0) / experiences.length).toFixed(2);
      doc.text(`Average Rating: ${avgRating}/10`);
    }
    doc.moveDown(2);

    // Visited Countries Section
    if (visited.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Visited Countries');
      doc.moveDown(0.5);
      
      visited.forEach((country, index) => {
        doc.fontSize(11).font('Helvetica');
        doc.text(`${index + 1}. ${country.countryName} (${country.region}) - Visited: ${new Date(country.dateVisited).toLocaleDateString()}`);
      });
      doc.moveDown(2);
    }

    // Wishlist Section
    if (wishlist.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Wishlist');
      doc.moveDown(0.5);
      
      wishlist.forEach((country, index) => {
        doc.fontSize(11).font('Helvetica');
        doc.text(`${index + 1}. ${country.countryName} (${country.region})`);
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error generating travel summary:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// Experience Journal Report
router.get("/experience-journal", auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [user, experiences] = await Promise.all([
      User.findById(userId).select("-password"),
      UserExperience.find({ userId }).sort({ fromDate: -1 })
    ]);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=experience-journal.pdf');
    
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('Travel Experience Journal', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`${user.firstName} ${user.lastName}`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Experiences
    experiences.forEach((exp, index) => {
      if (index > 0) doc.addPage();
      
      doc.fontSize(18).font('Helvetica-Bold').text(exp.country);
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Rating: ${'⭐'.repeat(Math.floor(exp.rating / 2))} ${exp.rating}/10`);
      doc.text(`Themes: ${exp.themes.join(', ')}`);
      doc.text(`Duration: ${new Date(exp.fromDate).toLocaleDateString()} to ${new Date(exp.toDate).toLocaleDateString()}`);
      doc.moveDown();
      
      doc.fontSize(11).font('Helvetica').text(exp.experience, {
        align: 'justify'
      });
    });

    doc.end();
  } catch (error) {
    console.error("Error generating experience journal:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// Statistics Report
router.get("/statistics", auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [user, visited, experiences] = await Promise.all([
      User.findById(userId).select("-password"),
      Visited.find({ userId }),
      UserExperience.find({ userId })
    ]);

    // Calculate stats
    const regionBreakdown = {};
    visited.forEach(v => {
      regionBreakdown[v.region] = (regionBreakdown[v.region] || 0) + 1;
    });

    const themeBreakdown = {};
    experiences.forEach(e => {
      e.themes.forEach(theme => {
        themeBreakdown[theme] = (themeBreakdown[theme] || 0) + 1;
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=statistics.pdf');
    
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('Travel Statistics Report', { align: 'center' });
    doc.moveDown(2);

    // Regional Breakdown
    doc.fontSize(16).font('Helvetica-Bold').text('Countries by Region');
    doc.moveDown(0.5);
    
    Object.entries(regionBreakdown).forEach(([region, count]) => {
      doc.fontSize(12).font('Helvetica').text(`${region}: ${count} countries`);
    });
    doc.moveDown(2);

    // Theme Preferences
    if (Object.keys(themeBreakdown).length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Travel Theme Preferences');
      doc.moveDown(0.5);
      
      Object.entries(themeBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([theme, count]) => {
          doc.fontSize(12).font('Helvetica').text(`${theme}: ${count} experiences`);
        });
    }

    doc.end();
  } catch (error) {
    console.error("Error generating statistics:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// NEW: Itinerary Planning Report
router.get("/itinerary-report", auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [user, itineraries] = await Promise.all([
      User.findById(userId).select("-password"),
      Itinerary.find({ userId }).sort({ startDate: -1 })
    ]);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=itinerary-report.pdf');
    
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('Itinerary Planning Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Generated for: ${user.email}`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Overview Section
    doc.fontSize(16).font('Helvetica-Bold').text('Planning Overview');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    
    const totalBudget = itineraries.reduce((sum, i) => sum + i.budget, 0);
    const totalDays = itineraries.reduce((sum, i) => sum + i.tripDays, 0);
    const avgBudget = itineraries.length > 0 ? Math.round(totalBudget / itineraries.length) : 0;
    
    doc.text(`Total Itineraries: ${itineraries.length}`);
    doc.text(`Total Days Planned: ${totalDays}`);
    doc.text(`Total Budget: $${totalBudget.toLocaleString()}`);
    doc.text(`Average Budget per Trip: $${avgBudget.toLocaleString()}`);
    doc.moveDown(2);

    // Destination Breakdown
    const destinations = {};
    itineraries.forEach(i => {
      destinations[i.destination] = (destinations[i.destination] || 0) + 1;
    });

    doc.fontSize(16).font('Helvetica-Bold').text('Destinations');
    doc.moveDown(0.5);
    Object.entries(destinations).forEach(([dest, count]) => {
      doc.fontSize(12).font('Helvetica').text(`${dest}: ${count} trip(s)`);
    });
    doc.moveDown(2);

    // Detailed Itineraries
    if (itineraries.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Detailed Itineraries');
      doc.moveDown();

      itineraries.forEach((itinerary, index) => {
        if (index > 0 && index % 2 === 0) doc.addPage();

        doc.fontSize(14).font('Helvetica-Bold').text(`${index + 1}. ${itinerary.destination}`);
        doc.moveDown(0.3);
        
        doc.fontSize(11).font('Helvetica');
        doc.text(`Dates: ${new Date(itinerary.startDate).toLocaleDateString()} - ${new Date(itinerary.endDate).toLocaleDateString()}`);
        doc.text(`Duration: ${itinerary.tripDays} days`);
        doc.text(`Budget: $${itinerary.budget.toLocaleString()}`);
        doc.text(`Status: ${itinerary.status.charAt(0).toUpperCase() + itinerary.status.slice(1)}`);
        
        // Expense Breakdown
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Bold').text('Budget Breakdown:');
        doc.fontSize(10).font('Helvetica');
        Object.entries(itinerary.expenses).forEach(([category, amount]) => {
          doc.text(`  ${category}: $${amount.toLocaleString()}`);
        });

        // Activities Summary
        const totalActivities = itinerary.dailyPlan.reduce((sum, day) => sum + day.activities.length, 0);
        doc.moveDown(0.3);
        doc.text(`Total Activities: ${totalActivities}`);
        
        doc.moveDown(1);
      });
    }

    // Expense Analysis
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Expense Analysis');
    doc.moveDown();

    const totalExpenses = {
      Accommodation: 0,
      Transport: 0,
      Food: 0,
      Activities: 0,
      Misc: 0
    };

    itineraries.forEach(i => {
      Object.keys(i.expenses).forEach(category => {
        totalExpenses[category] += i.expenses[category];
      });
    });

    doc.fontSize(12).font('Helvetica');
    Object.entries(totalExpenses).forEach(([category, amount]) => {
      const percentage = totalBudget > 0 ? ((amount / totalBudget) * 100).toFixed(1) : 0;
      doc.text(`${category}: $${amount.toLocaleString()} (${percentage}%)`);
    });

    doc.end();
  } catch (error) {
    console.error("Error generating itinerary report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ========================================
// ADMIN REPORTS
// ========================================

// All Users Summary Report
router.get("/admin-reports/users-summary", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select("-password -refreshTokens")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=users-summary.pdf');
    
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('All Users Summary Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Total Users: ${users.length}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // User list
    for (const user of users) {
      const [visited, wishlist, experiences, itineraries] = await Promise.all([
        Visited.countDocuments({ userId: user._id.toString() }),
        Wishlist.countDocuments({ userId: user._id.toString() }),
        UserExperience.countDocuments({ userId: user._id.toString() }),
        Itinerary.countDocuments({ userId: user._id.toString() })
      ]);

      doc.fontSize(11).font('Helvetica');
      doc.text(`${user.email} - Joined: ${new Date(user.createdAt).toLocaleDateString()}`);
      doc.text(`  Visited: ${visited} | Wishlist: ${wishlist} | Experiences: ${experiences} | Itineraries: ${itineraries}`);
      doc.moveDown(0.5);
    }

    doc.end();
  } catch (error) {
    console.error("Error generating users summary:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// Country Popularity Report
router.get("/admin-reports/country-popularity", auth, isAdmin, async (req, res) => {
  try {
    const visitedAgg = await Visited.aggregate([
      { $group: { 
          _id: "$countryCode",
          countryName: { $first: "$countryName" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=country-popularity.pdf');
    
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('Country Popularity Report', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').text('Most Visited Countries');
    doc.moveDown(0.5);

    visitedAgg.forEach((country, index) => {
      doc.fontSize(11).font('Helvetica');
      doc.text(`${index + 1}. ${country.countryName}: ${country.count} visits`);
    });

    doc.end();
  } catch (error) {
    console.error("Error generating country popularity report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// User Engagement Report
router.get("/admin-reports/engagement", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("_id email");
    
    const engagement = await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();
        const [visited, wishlist, experiences, itineraries] = await Promise.all([
          Visited.countDocuments({ userId }),
          Wishlist.countDocuments({ userId }),
          UserExperience.countDocuments({ userId }),
          Itinerary.countDocuments({ userId })
        ]);
        
        return {
          email: user.email,
          visited,
          wishlist,
          experiences,
          itineraries,
          total: visited + wishlist + experiences + itineraries
        };
      })
    );

    engagement.sort((a, b) => b.total - a.total);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=engagement-report.pdf');
    
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('User Engagement Report', { align: 'center' });
    doc.moveDown(2);

    engagement.forEach((user, index) => {
      doc.fontSize(10).font('Helvetica');
      doc.text(`${index + 1}. ${user.email}`);
      doc.text(`   Total Activity: ${user.total} (V: ${user.visited}, W: ${user.wishlist}, E: ${user.experiences}, I: ${user.itineraries})`);
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    console.error("Error generating engagement report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// System Statistics Report
router.get("/admin-reports/system-statistics", auth, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalVisited, totalWishlist, totalExperiences, totalItineraries] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Visited.countDocuments(),
      Wishlist.countDocuments(),
      UserExperience.countDocuments(),
      Itinerary.countDocuments()
    ]);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=system-statistics.pdf');
    
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('System Statistics Report', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica');
    doc.text(`Total Active Users: ${totalUsers}`);
    doc.text(`Total Visited Countries: ${totalVisited}`);
    doc.text(`Total Wishlisted Countries: ${totalWishlist}`);
    doc.text(`Total Experiences Shared: ${totalExperiences}`);
    doc.text(`Total Itineraries Created: ${totalItineraries}`);
    doc.text(`Average Visited per User: ${(totalVisited / totalUsers).toFixed(2)}`);
    doc.text(`Average Experiences per User: ${(totalExperiences / totalUsers).toFixed(2)}`);
    doc.text(`Average Itineraries per User: ${(totalItineraries / totalUsers).toFixed(2)}`);

    doc.end();
  } catch (error) {
    console.error("Error generating system statistics:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;