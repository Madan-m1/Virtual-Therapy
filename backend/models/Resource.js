const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true 
    },
    
    description: String,
    
    type: {
      type: String,
      enum: ["article", "video", "audio", "exercise", "pdf", "link"],
      required: true,
    },
    
    category: {
      type: String,
      enum: ["Anxiety", "Depression", "Stress", "Mindfulness", "Sleep", "General"],
      default: "General",
    },
    
    content: {
      type: String, // article text, exercise steps, or other content
    },
    
    url: String, // for video, link, pdf URL, or external resources
    
    link: String, // YouTube / external link (added from second schema)
    
    createdBy: {
      type: String,
      default: "admin",
      // Keep flexible: could be changed to ObjectId if needed
      // type: mongoose.Schema.Types.ObjectId,
      // ref: "User",
    },
    
    isPublished: {
      type: Boolean,
      default: true,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    createdAt: { // Added from second schema
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // This already includes createdAt and updatedAt
);

// Add a pre-save middleware to ensure either content or url is provided
resourceSchema.pre("save", function(next) {
  if (!this.content && !this.url && !this.link) {
    return next(new Error("Either content, URL, or link must be provided"));
  }
  
  // Validate based on type if needed
  if (this.type === "video" && !this.url && !this.link) {
    return next(new Error("Video resources require a URL or link"));
  }
  
  if (this.type === "article" && !this.content && !this.url && !this.link) {
    return next(new Error("Article resources require either content, URL, or link"));
  }
  
  // If link is provided but url is empty, copy link to url for backward compatibility
  if (this.link && !this.url) {
    this.url = this.link;
  }
  
  next();
});

// Optional: Add index for better query performance
resourceSchema.index({ category: 1, isPublished: 1, isActive: 1 });

module.exports = mongoose.model("Resource", resourceSchema);