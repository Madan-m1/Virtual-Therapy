import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    specialization: "",
    experience: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/register", form);
      alert("Registration successful!");
      navigate("/");
    } catch (err) {
      alert("Error registering user");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-r from-blue-50 to-teal-50">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-96">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
          Create Account 🧘‍♂️
        </h2>
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Full Name"
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
          />
          <select
            name="role"
            className="border border-gray-300 p-2 rounded-md"
            onChange={handleChange}
          >
            <option value="user">User</option>
            <option value="therapist">Therapist</option>
          </select>

          {form.role === "therapist" && (
            <>
              <input
                name="specialization"
                placeholder="Specialization"
                className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
                onChange={handleChange}
              />
              <input
                name="experience"
                placeholder="Experience (in years)"
                type="number"
                className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
                onChange={handleChange}
              />
            </>
          )}

          <button className="bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition">
            Register
          </button>
        </form>

        <p className="text-sm mt-6 text-gray-600 text-center">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-blue-600 font-medium cursor-pointer hover:underline"
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  );
}
