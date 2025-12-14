import { useState } from "react";
import API from "../services/api";

export default function AdminResources() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "article",
    category: "general",
    url: "",
  });

  const submit = async () => {
    await API.post("/resources", form);
    alert("Resource added");
  };

  return (
    <div className="p-6">
      <h2 className="text-xl mb-4">Add Resource</h2>
      <input placeholder="Title" onChange={e => setForm({...form,title:e.target.value})} />
      <textarea placeholder="Description" onChange={e => setForm({...form,description:e.target.value})} />
      <input placeholder="Resource URL" onChange={e => setForm({...form,url:e.target.value})} />
      <button onClick={submit} className="bg-blue-600 text-white px-4 py-2">
        Add
      </button>
    </div>
  );
}
