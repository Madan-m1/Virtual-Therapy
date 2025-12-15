import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Automatically attach JWT token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

/* ---------------------------------------------------------
   🌟 SENTIMENT / EMOTION ANALYSIS API CALL
   This will call backend → backend proxies → FastAPI AI service
---------------------------------------------------------- */
export const analyzeSentiment = async (text) => {
  return API.post("/sentiment/analyze", { text });
};

/* ---------------------------------------------------------
   📌 Export main API instance
---------------------------------------------------------- */
export default API;