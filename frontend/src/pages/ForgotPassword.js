import { useState } from "react";
import API from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await API.post("/auth/forgot-password", { email });
    alert("If email exists, reset link sent");
  };

  return (
    <form onSubmit={submit} className="p-6 max-w-sm mx-auto">
      <h2 className="text-xl mb-4">Forgot Password</h2>
      <input
        className="border p-2 w-full mb-3"
        placeholder="Enter email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Send Reset Link
      </button>
    </form>
  );
}
