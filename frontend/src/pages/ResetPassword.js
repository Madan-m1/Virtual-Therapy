import { useParams } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await API.post(`/auth/reset-password/${token}`, { password });
    alert("Password updated successfully");
  };

  return (
    <form onSubmit={submit} className="p-6 max-w-sm mx-auto">
      <h2 className="text-xl mb-4">Reset Password</h2>
      <input
        type="password"
        className="border p-2 w-full mb-3"
        placeholder="New password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="bg-green-600 text-white px-4 py-2 rounded">
        Reset Password
      </button>
    </form>
  );
}
