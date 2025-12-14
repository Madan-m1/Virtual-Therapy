const express = require("express");
const router = express.Router();
const Resource = require("../models/Resource");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// Public – Get all published resources with filtering options
router.get("/", async (req, res) => {
  try {
    const { type, category, search, limit = 20, page = 1 } = req.query;
    const filter = { isPublished: true, isActive: true };
    
    // Add optional filters
    if (type) filter.type = type;
    if (category) filter.category = category;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const resources = await Resource.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "name email"); // Add user info if needed
    
    const total = await Resource.countDocuments(filter);
    
    res.json({
      resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User – Get all active resources (authenticated users)
router.get("/user/all", auth, async (req, res) => {
  try {
    const resources = await Resource.find({ isActive: true })
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin – Add new resource
router.post("/", auth, admin, async (req, res) => {
  try {
    const resource = await Resource.create({
      ...req.body,
      createdBy: req.user.id, // Ensure createdBy is set
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });
    
    res.status(201).json(resource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin – Update resource
router.put("/:id", auth, admin, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    res.json(resource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin – Delete resource
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin – Disable resource
router.put("/:id/disable", auth, admin, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    res.json({ 
      message: "Resource disabled",
      resource 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin – Enable resource
router.put("/:id/enable", auth, admin, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { isActive: true, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    res.json({ 
      message: "Resource enabled",
      resource 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin – Get all resources (including unpublished and inactive)
router.get("/admin/all", auth, admin, async (req, res) => {
  try {
    const resources = await Resource.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin – Toggle publish status
router.patch("/:id/publish", auth, admin, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    resource.isPublished = !resource.isPublished;
    resource.updatedAt = Date.now();
    await resource.save();
    
    res.json({
      message: `Resource ${resource.isPublished ? "published" : "unpublished"}`,
      resource
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public – Get single resource by ID (only if published and active)
router.get("/:id", async (req, res) => {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      isPublished: true,
      isActive: true
    });
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found, not published, or inactive" });
    }
    
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin/User – Get single resource by ID (regardless of publish/active status for admin, active only for users)
router.get("/:id/detail", auth, async (req, res) => {
  try {
    let filter = { _id: req.params.id };
    
    // Non-admin users can only see active resources
    if (!req.user.isAdmin) {
      filter.isActive = true;
    }
    
    const resource = await Resource.findOne(filter);
    
    if (!resource) {
      return res.status(404).json({ message: "Resource not found or unauthorized" });
    }
    
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Note: The simple GET "/" route from the second code was not added since
// it would conflict with the existing comprehensive GET "/" route above.
// The existing route already provides better functionality with filtering,
// pagination, and proper error handling.

module.exports = router;