# ai-service/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

# optional: reduce verbose logs from uvicorn/transformers during dev
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("transformers").setLevel(logging.WARNING)

app = FastAPI(title="Virtual Therapy - Emotion & Sentiment API")


class TextPayload(BaseModel):
    text: str
    presetEmotion: Optional[str] = None


# --- Try to load transformers pipelines if available ---
USE_TRANSFORMERS = False
sentiment_pipe = None
emotion_pipe = None

try:
    from transformers import pipeline

    # explicit model choices
    SENTIMENT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"
    EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"

    try:
        sentiment_pipe = pipeline("sentiment-analysis", model=SENTIMENT_MODEL)
    except Exception:
        sentiment_pipe = None

    try:
        emotion_pipe = pipeline("text-classification", model=EMOTION_MODEL, top_k=None)
    except Exception:
        emotion_pipe = None

    if sentiment_pipe:
        USE_TRANSFORMERS = True
except Exception:
    sentiment_pipe = None
    emotion_pipe = None
    USE_TRANSFORMERS = False


# --- Simple lexicon fallback (always available) ---
EMOTION_KEYWORDS = {
    "happy": ["happy", "joy", "glad", "pleased", "delighted", "excited", "cheer"],
    "sad": ["sad", "unhappy", "depressed", "down", "sorrow", "miserable"],
    "angry": ["angry", "mad", "furious", "irritat", "annoy", "rage"],
    "anxious": ["anxious", "nervous", "worried", "panic", "scared", "fear"],
    "neutral": ["okay", "fine", "neutral", "alright"],
    "surprise": ["surpris", "wow", "shock", "astonish"],
}

# NEW: richer suggestions structure
SUGGESTIONS = {
    "happy": {
        "description": (
            "It sounds like you're experiencing positive emotions. Feeling happy or uplifted "
            "can be a sign of emotional balance, meaningful connections, personal progress, or relief "
            "after stress. Recognizing moments of happiness is important for building resilience."
        ),
        "exercises": [
            "Practice gratitude: Write down 3 things that made you feel good today.",
            "Share your positive feelings with someone close to you.",
            "Try a 2-minute mindful breathing exercise to stay grounded in the moment.",
        ],
    },
    "sad": {
        "description": (
            "Sadness is a natural emotional response to loss, disappointment, or emotional overwhelm. "
            "It’s okay to feel this way, and acknowledging it is the first step toward healing. "
            "You don't need to rush the feeling — sitting with it mindfully can be grounding."
        ),
        "exercises": [
            "5-4-3-2-1 grounding exercise: Identify 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
            "Do a 10-minute journaling exercise about what is weighing on your mind.",
            "Try a slow walk while paying attention to your breathing.",
        ],
    },
    "angry": {
        "description": (
            "Anger often arises from feeling misunderstood, disrespected, or out of control. "
            "It’s a powerful emotion, but with awareness and safe release techniques, it can be managed "
            "in a healthy and constructive way."
        ),
        "exercises": [
            "Progressive muscle relaxation: Tense and release each muscle group slowly.",
            "Box breathing: Inhale 4 seconds, hold 4 seconds, exhale 4 seconds, hold 4 seconds.",
            "Write down what's making you angry and identify the triggers.",
        ],
    },
    "anxious": {
        "description": (
            "Anxiety can appear when your mind is expecting danger, uncertainty, or stress. "
            "It doesn’t mean something is wrong with you — it means your body is trying to protect you. "
            "Grounding techniques can help calm your system."
        ),
        "exercises": [
            "Try the 4-4-8 breathing technique: Inhale 4s, hold 4s, exhale 8s.",
            "5-minute mindfulness: Focus only on your breath or a single sound.",
            "Write your worries and ask: 'Which of these are in my control?'",
        ],
    },
    "neutral": {
        "description": (
            "You seem to be in a steady emotional state. Feeling neutral can mean you are balanced, "
            "calm, or simply not strongly affected by recent events. It's a healthy baseline emotion."
        ),
        "exercises": [
            "Do a short stretch routine for relaxation.",
            "Take a 2-minute mindful pause to check in with your body.",
            "Drink a glass of water & take 5 slow breaths.",
        ],
    },
    "surprise": {
        "description": (
            "Surprise is triggered by something unexpected — positive or negative. "
            "Your mind may need a moment to adjust to new information. This feeling usually fades quickly."
        ),
        "exercises": [
            "Pause and take 3 slow breaths to stabilize your mind.",
            "Reflect briefly on what caused the surprise and how it affects you.",
            "Write one sentence about what you want to do next.",
        ],
    },
}


def lexicon_emotion(text: str) -> Dict[str, float]:
    text_low = text.lower()
    scores = {k: 0.0 for k in EMOTION_KEYWORDS.keys()}
    for e, words in EMOTION_KEYWORDS.items():
        for w in words:
            if w in text_low:
                scores[e] += 1.0
    total = sum(scores.values())
    if total == 0:
        scores = {k: (1.0 if k == "neutral" else 0.0) for k in scores}
    else:
        scores = {k: v / total for k, v in scores.items()}
    return scores


@app.post("/analyze")
def analyze(payload: TextPayload) -> Dict[str, Any]:
    text = payload.text or ""
    preset = (payload.presetEmotion or "").lower() if payload.presetEmotion else None

    result = {
        "text": text,
        "use_transformers": USE_TRANSFORMERS,
        "sentiment": {"label": "unknown", "score": 0.0},
        "emotion_scores": {},
        "top_emotion": None,
        "suggestions": {},
    }

    # Sentiment
    if USE_TRANSFORMERS and sentiment_pipe:
        try:
            s = sentiment_pipe(text[:1000])[0]
            result["sentiment"] = {"label": s.get("label"), "score": float(s.get("score", 0.0))}
        except Exception:
            result["sentiment"] = {"label": "neutral", "score": 0.5}
    else:
        lower = text.lower()
        pos_kw = ["good", "great", "happy", "well", "better", "love", "like", "progress", "relieved"]
        neg_kw = ["sad", "bad", "angry", "depress", "upset", "anxious", "worry", "stress", "hurt"]
        p = sum(1 for k in pos_kw if k in lower)
        n = sum(1 for k in neg_kw if k in lower)
        if p > n:
            result["sentiment"] = {"label": "positive", "score": 0.6 + (p / (p + n + 1)) * 0.4}
        elif n > p:
            result["sentiment"] = {"label": "negative", "score": 0.6 + (n / (p + n + 1)) * 0.4}
        else:
            result["sentiment"] = {"label": "neutral", "score": 0.5}

    # Emotion scoring
    if preset and preset in SUGGESTIONS:
        # If frontend provided presetEmotion, prefer it
        emotion_scores = {k: (1.0 if k == preset else 0.0) for k in EMOTION_KEYWORDS}
        result["emotion_scores"] = emotion_scores
        result["top_emotion"] = {"emotion": preset, "score": 1.0}
        result["suggestions"] = SUGGESTIONS.get(preset)
        return result

    emotion_scores = {}
    if USE_TRANSFORMERS and emotion_pipe:
        try:
            raw = emotion_pipe(text[:1000])
            if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], list):
                raw_scores = raw[0]
            else:
                raw_scores = raw

            for item in raw_scores:
                lbl = (item.get("label") or "").lower()
                score = float(item.get("score", 0.0))
                for e in EMOTION_KEYWORDS:
                    if e in lbl:
                        emotion_scores[e] = max(emotion_scores.get(e, 0.0), score)
            for e in EMOTION_KEYWORDS:
                emotion_scores.setdefault(e, 0.0)
        except Exception:
            emotion_scores = lexicon_emotion(text)
    else:
        emotion_scores = lexicon_emotion(text)

    result["emotion_scores"] = emotion_scores
    top = max(emotion_scores.items(), key=lambda x: x[1])
    result["top_emotion"] = {"emotion": top[0], "score": float(top[1])}

    # suggestions object
    top_em = result["top_emotion"]["emotion"]
    result["suggestions"] = SUGGESTIONS.get(top_em, {"description": "Try breathing exercises or a short walk.", "exercises": ["Take 5 deep breaths."]})

    return result


# Health endpoint
@app.get("/")
def root():
    return {"status": "ok", "service": "ai-service", "use_transformers": USE_TRANSFORMERS}