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
      const [visited, wishlist, experiences] = await Promise.all([
        Visited.countDocuments({ userId: user._id.toString() }),
        Wishlist.countDocuments({ userId: user._id.toString() }),
        UserExperience.countDocuments({ userId: user._id.toString() })
      ]);

      doc.fontSize(11).font('Helvetica');
      doc.text(`${user.email} - Joined: ${new Date(user.createdAt).toLocaleDateString()}`);
      doc.text(`  Visited: ${visited} | Wishlist: ${wishlist} | Experiences: ${experiences}`);
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
        const [visited, wishlist, experiences] = await Promise.all([
          Visited.countDocuments({ userId }),
          Wishlist.countDocuments({ userId }),
          UserExperience.countDocuments({ userId })
        ]);
        
        return {
          email: user.email,
          visited,
          wishlist,
          experiences,
          total: visited + wishlist + experiences
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
      doc.text(`   Total Activity: ${user.total} (V: ${user.visited}, W: ${user.wishlist}, E: ${user.experiences})`);
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
    const [totalUsers, totalVisited, totalWishlist, totalExperiences] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Visited.countDocuments(),
      Wishlist.countDocuments(),
      UserExperience.countDocuments()
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
    doc.text(`Average Visited per User: ${(totalVisited / totalUsers).toFixed(2)}`);
    doc.text(`Average Experiences per User: ${(totalExperiences / totalUsers).toFixed(2)}`);

    doc.end();
  } catch (error) {
    console.error("Error generating system statistics:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;