from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)
sentiment = pipeline("sentiment-analysis")

@app.route("/", methods=["GET"])
def home():
    return {"message": "AI Service Running ✅"}

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json.get("text")
    result = sentiment(data)[0]
    return jsonify(result)

if __name__ == "__main__":
    app.run(port=5001, debug=True)
