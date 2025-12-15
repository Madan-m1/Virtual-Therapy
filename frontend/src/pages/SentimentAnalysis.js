// frontend/src/pages/SentimentAnalysis.jsx
import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import API from "../services/api";

/**
 * Local suggestions mapping — must match backend/ai-service keys & structure.
 * Keep in sync with backend if you change wording.
 */
const SUGGESTIONS_MAP = {
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

export default function SentimentAnalysis() {
  const location = useLocation();
  const presetEmotion = (location.state && location.state.presetEmotion) || "";

  // ⭐ YOUR CODE IS ALREADY INTEGRATED HERE ⭐
  // text is prefilled with the preset emotion phrase but user can edit
  const [text, setText] = useState(presetEmotion ? `I feel ${presetEmotion}` : "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // usedPreset remains true until user edits the text area
  const usedPresetRef = useRef(Boolean(presetEmotion));
  const [usedPresetFlag, setUsedPresetFlag] = useState(Boolean(presetEmotion));

  // On mount: if presetEmotion exists, show local suggestions immediately (deterministic)
  useEffect(() => {
    if (presetEmotion) {
      const local = {
        sentiment: { label: "N/A", score: 0 },
        top_emotion: { emotion: presetEmotion, score: 1.0 },
        emotion_scores: Object.fromEntries(Object.keys(SUGGESTIONS_MAP).map((k) => [k, k === presetEmotion ? 1.0 : 0.0])),
        suggestions: SUGGESTIONS_MAP[presetEmotion] || { description: "", exercises: [] },
        text: `I feel ${presetEmotion}`,
        _source: "preset-frontend",
      };
      setResult(local);
      usedPresetRef.current = true;
      setUsedPresetFlag(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTextChange = (e) => {
    setText(e.target.value);
    if (usedPresetRef.current) {
      usedPresetRef.current = false;
      setUsedPresetFlag(false);
    }
  };

  // call backend when user presses Analyze; include presetEmotion if still 'used'
  const analyze = async () => {
    if (!text || text.trim().length === 0) return alert("Please enter some text to analyze.");

    setLoading(true);
    setError(null);
    try {
      const payload = { text };
      if (usedPresetRef.current && presetEmotion) payload.presetEmotion = presetEmotion;

      const resp = await API.post("/sentiment/analyze", payload);
      // normalize backend response to our UI shape
      const data = resp.data;
      // If backend didn't attach suggestions as object, try to map
      if (data && data.suggestions && typeof data.suggestions === "object") {
        // expected shape
      } else {
        // ensure suggestions field exists
        data.suggestions = data.suggestions || { description: "", exercises: [] };
      }
      setResult({ ...data, _source: "backend" });
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      usedPresetRef.current = false;
      setUsedPresetFlag(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-3">Sentiment & Emotion Analysis</h2>

      <textarea
        value={text}
        onChange={onTextChange}
        rows={6}
        className="w-full border rounded p-2 mb-3"
      />

      <div className="flex gap-2 mb-4">
        <button onClick={analyze} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <div className="text-red-600 mb-3">Error: {error}</div>}

      {result && (
        <div className="border rounded p-3">
          <h3 className="font-semibold">Result</h3>
          <p><strong>Sentiment:</strong> {result.sentiment?.label} {result.sentiment?.score ? `(${result.sentiment.score.toFixed(2)})` : ""}</p>
          <p><strong>Top Emotion:</strong> {result.top_emotion?.emotion} {result.top_emotion?.score ? `(${result.top_emotion.score.toFixed(2)})` : ""}</p>

          <div className="mt-2">
            <strong>Emotion Scores:</strong>
            <ul className="list-disc ml-5">
              {Object.entries(result.emotion_scores || {}).map(([k, v]) => (
                <li key={k}>{k}: {typeof v === "number" ? v.toFixed(3) : v}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">About this Emotion</h4>
            <p className="text-gray-700">{result.suggestions?.description}</p>

            <h4 className="font-semibold mt-3">Recommended Exercises</h4>
            <ul className="list-disc ml-5">
              {(result.suggestions?.exercises || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>

            <p className="text-xs text-gray-500 mt-3">Source: {result._source || "backend"}</p>
            {usedPresetFlag && <p className="text-xs text-gray-500">You used a preset emotion — suggestions shown from your selection.</p>}
          </div>
        </div>
      )}
    </div>
  );
}