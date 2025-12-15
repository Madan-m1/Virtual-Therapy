// frontend/src/pages/EmotionCheck.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const EMOTIONS = [
  "happy",
  "sad",
  "angry",
  "anxious",
  "neutral",
  "surprise"
];

export default function EmotionCheck() {
  const [selected, setSelected] = useState("");
  const navigate = useNavigate();

  const goToAnalysis = () => {
    navigate("/sentiment-analysis", { state: { presetEmotion: selected }});
  };

  const skipToAnalysis = () => {
    // Navigate without presetEmotion so user can type free text
    navigate("/sentiment-analysis", { state: { presetEmotion: "" }});
  };

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <h2 className="text-2xl font-semibold mb-4">Emotion Check</h2>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Select an emotion (or skip to type your own)</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border p-2 rounded w-full"
          aria-label="Select an emotion"
        >
          <option value="">— choose an emotion —</option>
          {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          className={`px-4 py-2 rounded text-white ${
            selected
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
          onClick={goToAnalysis}
          disabled={!selected}
        >
          Continue to Sentiment Analysis
        </button>

        <button
          className="text-sm text-gray-600 underline hover:text-gray-800 bg-transparent p-0"
          onClick={skipToAnalysis}
        >
          Or skip and type text
        </button>
      </div>
    </div>
  );
}