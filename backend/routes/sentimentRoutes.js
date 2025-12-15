// backend/routes/sentimentRoutes.js
const express = require("express");
const router = express.Router();
const { analyzeText } = require("../controllers/sentimentController");

router.post("/analyze", analyzeText);

module.exports = router;