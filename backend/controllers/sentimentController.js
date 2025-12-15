// backend/controllers/sentimentController.js
const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Local suggestions with rich structure (description + exercises array)
 */
const LOCAL_SUGGESTIONS = {
  happy: {
    description:
      "It sounds like you're experiencing positive emotions. Feeling happy or uplifted can be a sign of emotional balance, meaningful connections, personal progress, or relief after stress. Recognizing moments of happiness is important for building resilience.",
    exercises: [
      "Practice gratitude: Write down 3 things that made you feel good today.",
      "Share your positive feelings with someone close to you.",
      "Try a 2-minute mindful breathing exercise to stay grounded in the moment.",
    ],
  },
  sad: {
    description:
      "Sadness is a natural emotional response to loss, disappointment, or emotional overwhelm. It's okay to feel this way, and acknowledging it is the first step toward healing. You don't need to rush the feeling — sitting with it mindfully can be grounding.",
    exercises: [
      "5-4-3-2-1 grounding exercise: Identify 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
      "Do a 10-minute journaling exercise about what is weighing on your mind.",
      "Try a slow walk while paying attention to your breathing.",
    ],
  },
  angry: {
    description:
      "Anger often arises from feeling misunderstood, disrespected, or out of control. It's a powerful emotion, but with awareness and safe release techniques, it can be managed in a healthy and constructive way.",
    exercises: [
      "Progressive muscle relaxation: Tense and release each muscle group slowly.",
      "Box breathing: Inhale 4 seconds, hold 4 seconds, exhale 4 seconds, hold 4 seconds.",
      "Write down what's making you angry and identify the triggers.",
    ],
  },
  anxious: {
    description:
      "Anxiety can appear when your mind is expecting danger, uncertainty, or stress. It doesn't mean something is wrong with you — it means your body is trying to protect you. Grounding techniques can help calm your system.",
    exercises: [
      "Try the 4-4-8 breathing technique: Inhale 4s, hold 4s, exhale 8s.",
      "5-minute mindfulness: Focus only on your breath or a single sound.",
      "Write your worries and ask: 'Which of these are in my control?'",
    ],
  },
  neutral: {
    description:
      "You seem to be in a steady emotional state. Feeling neutral can mean you are balanced, calm, or simply not strongly affected by recent events. It's a healthy baseline emotion.",
    exercises: [
      "Do a short stretch routine for relaxation.",
      "Take a 2-minute mindful pause to check in with your body.",
      "Drink a glass of water & take 5 slow breaths.",
    ],
  },
  surprise: {
    description:
      "Surprise is triggered by something unexpected — positive or negative. Your mind may need a moment to adjust to new information. This feeling usually fades quickly.",
    exercises: [
      "Pause and take 3 slow breaths to stabilize your mind.",
      "Reflect briefly on what caused the surprise and how it affects you.",
      "Write one sentence about what you want to do next.",
    ],
  },
};

const LOCAL_EMOTION_KEYWORDS = {
  happy: ["happy", "joy", "glad", "pleased", "delighted", "excited", "cheer"],
  sad: ["sad", "unhappy", "depressed", "down", "sorrow", "miserable"],
  angry: ["angry", "mad", "furious", "irritat", "annoy", "rage"],
  anxious: ["anxious", "nervous", "worried", "panic", "scared", "fear"],
  neutral: ["okay", "fine", "neutral", "alright"],
  surprise: ["surpris", "wow", "shock", "astonish"],
};

function simpleSentiment(text) {
  const lower = (text || "").toLowerCase();
  const pos = ["good", "great", "happy", "well", "better", "love", "like", "progress", "relieved"];
  const neg = ["sad", "bad", "angry", "depress", "upset", "anxious", "worry", "stress", "hurt"];

  const p = pos.reduce((acc, k) => acc + (lower.includes(k) ? 1 : 0), 0);
  const n = neg.reduce((acc, k) => acc + (lower.includes(k) ? 1 : 0), 0);

  if (p > n) return { label: "positive", score: 0.6 + (p / (p + n + 1)) * 0.4 };
  if (n > p) return { label: "negative", score: 0.6 + (n / (p + n + 1)) * 0.4 };
  return { label: "neutral", score: 0.5 };
}

function simpleEmotionScores(text) {
  const lower = (text || "").toLowerCase();
  const scores = {};
  Object.keys(LOCAL_EMOTION_KEYWORDS).forEach((em) => (scores[em] = 0));
  Object.entries(LOCAL_EMOTION_KEYWORDS).forEach(([em, words]) => {
    words.forEach((w) => {
      if (lower.includes(w)) scores[em] += 1;
    });
  });
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    Object.keys(scores).forEach((k) => (scores[k] = k === "neutral" ? 1 : 0));
    return scores;
  }
  Object.keys(scores).forEach((k) => (scores[k] = scores[k] / total));
  return scores;
}

/**
 * Normalize suggestions into { description: string, exercises: string[] }
 */
function normalizeSuggestions(s) {
  if (!s) return { description: "", exercises: [] };
  if (Array.isArray(s)) return { description: "", exercises: s };
  if (typeof s === "string") return { description: s, exercises: [] };
  if (typeof s === "object") {
    const desc = s.description || s.text || "";
    const exercises = Array.isArray(s.exercises) ? s.exercises : s.items || [];
    return { description: desc, exercises };
  }
  return { description: "", exercises: [] };
}

exports.analyzeText = async (req, res) => {
  try {
    const { text, presetEmotion } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "text (string) is required in body" });
    }

    // Forward to AI microservice
    try {
      const payload = { text };
      if (presetEmotion) payload.presetEmotion = presetEmotion;
      
      // Integrated axios call in the requested format
      const resp = await axios.post(`${AI_SERVICE_URL}/analyze`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
      });

      // Normalize incoming AI-service response to a known shape
      const data = resp.data || {};
      const sentiment = data.sentiment || simpleSentiment(text);
      const emotion_scores = data.emotion_scores || simpleEmotionScores(text);
      const top_emotion = data.top_emotion || (() => {
        const sorted = Object.entries(emotion_scores).sort((a, b) => b[1] - a[1]);
        return { emotion: sorted[0][0], score: Number(sorted[0][1]) };
      })();

      const suggestions = normalizeSuggestions(data.suggestions) || LOCAL_SUGGESTIONS[top_emotion.emotion] || { description: "", exercises: [] };

      return res.json({
        text: data.text || text,
        use_transformers: !!data.use_transformers,
        sentiment,
        emotion_scores,
        top_emotion,
        suggestions,
        _source: "ai-service",
      });
    } catch (err) {
      console.error("AI service error (falling back to local heuristic):", err.message || err);

      // LOCAL fallback
      const sentiment = simpleSentiment(text);
      const emotion_scores = simpleEmotionScores(text);

      // If presetEmotion provided by frontend, prefer it
      let top_emotion;
      if (presetEmotion && LOCAL_SUGGESTIONS[presetEmotion]) {
        top_emotion = { emotion: presetEmotion, score: 1.0 };
        Object.keys(emotion_scores).forEach((k) => (emotion_scores[k] = k === presetEmotion ? 1.0 : 0.0));
      } else {
        const sorted = Object.entries(emotion_scores).sort((a, b) => b[1] - a[1]);
        top_emotion = { emotion: sorted[0][0], score: Number(sorted[0][1]) };
      }

      const suggestions = LOCAL_SUGGESTIONS[top_emotion.emotion] || { description: "Try breathing exercises or a short walk.", exercises: ["Take 5 deep breaths."] };

      return res.json({
        text,
        use_transformers: false,
        sentiment,
        emotion_scores,
        top_emotion,
        suggestions,
        _note: "returned from local fallback because AI service was unreachable",
        _source: "local-fallback",
      });
    }
  } catch (outerErr) {
    console.error("Unexpected error in analyzeText:", outerErr && outerErr.stack ? outerErr.stack : outerErr);
    return res.status(500).json({ message: "Internal server error" });
  }
};