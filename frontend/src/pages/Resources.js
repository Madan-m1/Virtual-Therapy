import { useEffect, useState } from "react";
import API from "../services/api";

// Static resources as fallback
const staticResources = [
  {
    _id: "static-1",
    title: "Managing Anxiety",
    category: "Anxiety",
    description: "Learn practical breathing and grounding techniques to manage anxiety symptoms.",
    link: "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
    type: "external"
  },
  {
    _id: "static-2",
    title: "Understanding Depression",
    category: "Depression",
    description: "Understand symptoms, causes, and ways to seek help for depression.",
    link: "https://www.who.int/news-room/fact-sheets/detail/depression",
    type: "external"
  },
  {
    _id: "static-3",
    title: "Stress Management Techniques",
    category: "Stress",
    description: "Simple daily practices to reduce stress and improve mental well-being.",
    link: "https://www.apa.org/topics/stress",
    type: "external"
  },
  {
    _id: "static-4",
    title: "Sleep & Mental Health",
    category: "Sleep",
    description: "How sleep impacts mental health and tips for better sleep hygiene.",
    link: "https://www.sleepfoundation.org/mental-health",
    type: "external"
  },
];

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    API.get("/resources")
      .then(res => {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.resources || [];
        setResources(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load resources", err);
        // Use static resources as fallback
        setResources(staticResources);
        setIsLoading(false);
      });
  }, []);

  // Group resources by category for better organization
  const groupedResources = resources.reduce((acc, item) => {
    const category = item.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧠 Mental Health Resources</h1>
        <div className="text-center mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500">Loading resources...</p>
        </div>
      </div>
    );
  }

  // If no resources (even after fallback), show simplified message
  if (resources.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">🧠 Mental Health Resources</h2>
        <p className="text-gray-500 text-center mb-8">
          No resources available from the server.
        </p>
        {/* Show static resources as backup */}
        <div className="grid md:grid-cols-2 gap-6">
          {staticResources.map((res) => (
            <div
              key={res._id}
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
            >
              <span className="text-xs bg-blue-100 px-3 py-1 rounded-full">
                {res.category}
              </span>
              <h3 className="text-xl font-semibold mt-3">{res.title}</h3>
              <p className="text-gray-600 mt-2">{res.description}</p>
              <a
                href={res.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 mt-3 inline-block"
              >
                Learn more →
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If we have resources but want simple display (no grouping)
  const hasMultipleCategories = Object.keys(groupedResources).length > 1;
  
  // For simple cases with few categories or all same category, show flat layout
  if (!hasMultipleCategories) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">🧠 Mental Health Resources</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {resources.map((r) => (
            <div
              key={r._id}
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
            >
              {/* Category and type tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs bg-blue-100 px-3 py-1 rounded-full">
                  {r.category || "General"}
                </span>
                {r.type && r.type !== "external" && (
                  <span className="text-xs bg-green-100 px-3 py-1 rounded-full">
                    {r.type}
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-semibold mt-1">{r.title}</h3>
              <p className="text-gray-600 mt-2">{r.description}</p>

              {/* Unified resource display logic */}
              <div className="mt-4">
                {r.type === "video" && (
                  <div className="mt-4">
                    {r.url && (r.url.includes("youtube.com") || r.url.includes("vimeo.com") || r.url.includes("youtu.be")) ? (
                      <div className="mt-3">
                        <iframe
                          className="w-full h-48 rounded-lg"
                          src={r.url}
                          title={r.title}
                          allowFullScreen
                        />
                        <p className="text-sm text-gray-500 mt-2">Video resource</p>
                      </div>
                    ) : (
                      <a 
                        href={r.content || r.url || r.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span className="mr-2">▶️</span> Watch Video
                      </a>
                    )}
                  </div>
                )}
                
                {r.type === "article" && r.content && (
                  <div className="mt-3">
                    <div className="bg-gray-50 p-4 rounded-lg mb-3">
                      <p className="text-gray-700">{r.content.substring(0, 150)}...</p>
                    </div>
                    {(r.url || r.link) && (
                      <a 
                        href={r.url || r.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span className="mr-2">📄</span> Read Full Article
                      </a>
                    )}
                  </div>
                )}
                
                {(r.type === "article" && (r.url || r.link)) && !r.content && (
                  <a 
                    href={r.url || r.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span className="mr-2">📄</span> Read Full Article
                  </a>
                )}
                
                {r.type === "exercise" && r.content && (
                  <div className="mt-3">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-sans text-gray-700">{r.content}</pre>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Practice exercise</p>
                  </div>
                )}
                
                {(!r.type || r.type === "external") && (r.url || r.link) && (
                  <a 
                    href={r.url || r.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span className="mr-2">🔗</span> View Resource
                  </a>
                )}
                
                {/* Simple link fallback */}
                {!r.type && r.link && !r.url && !r.content && (
                  <a 
                    href={r.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span className="mr-2">🔗</span> View Resource
                  </a>
                )}
                
                {/* Simple text link fallback */}
                {!r.type && r.link && (r.url || r.content) && (
                  <a 
                    href={r.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 mt-3 inline-block hover:text-blue-800"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show categorized view for multiple categories
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧠 Mental Health Resources</h1>
      
      {/* Category-based organization */}
      {Object.entries(groupedResources).map(([category, categoryResources]) => (
        <div key={category} className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 pb-2 border-b border-gray-200">
            {category}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categoryResources.map(r => (
              <div 
                key={r._id} 
                className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition-shadow duration-300 border border-gray-100"
              >
                {/* Category and type tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs bg-blue-100 px-3 py-1 rounded-full">
                    {r.category || "General"}
                  </span>
                  {r.type && r.type !== "external" && (
                    <span className="text-xs bg-green-100 px-3 py-1 rounded-full">
                      {r.type}
                    </span>
                  )}
                </div>
                
                <h2 className="text-xl font-semibold text-gray-800 mb-3">{r.title}</h2>
                
                <p className="text-gray-600 mb-4">{r.description}</p>
                
                {/* Display content if available */}
                {r.content && (
                  <div className="mt-3 mb-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-sans text-gray-700">
                        {r.content.length > 200 ? `${r.content.substring(0, 200)}...` : r.content}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Unified resource display logic */}
                <div className="mt-4">
                  {r.type === "video" && (
                    <div className="mt-4">
                      {r.url && (r.url.includes("youtube.com") || r.url.includes("vimeo.com") || r.url.includes("youtu.be")) ? (
                        <div className="mt-3">
                          <iframe
                            className="w-full h-48 rounded-lg"
                            src={r.url}
                            title={r.title}
                            allowFullScreen
                          />
                          <p className="text-sm text-gray-500 mt-2">Video resource</p>
                        </div>
                      ) : (
                        <a 
                          href={r.content || r.url || r.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <span className="mr-2">▶️</span> Watch Video
                        </a>
                      )}
                    </div>
                  )}
                  
                  {r.type === "article" && r.content && (
                    <div className="mt-3">
                      <div className="bg-gray-50 p-4 rounded-lg mb-3">
                        <p className="text-gray-700">{r.content.substring(0, 150)}...</p>
                      </div>
                      {(r.url || r.link) && (
                        <a 
                          href={r.url || r.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <span className="mr-2">📄</span> Read Full Article
                        </a>
                      )}
                    </div>
                  )}
                  
                  {(r.type === "article" && (r.url || r.link)) && !r.content && (
                    <a 
                      href={r.url || r.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span className="mr-2">📄</span> Read Full Article
                    </a>
                  )}
                  
                  {r.type === "exercise" && r.content && (
                    <div className="mt-3">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700">{r.content}</pre>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Practice exercise</p>
                    </div>
                  )}
                  
                  {(!r.type || r.type === "external") && (r.url || r.link) && (
                    <a 
                      href={r.url || r.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span className="mr-2">🔗</span> View Resource
                    </a>
                  )}
                  
                  {/* Simple link fallback */}
                  {!r.type && r.link && !r.url && !r.content && (
                    <a 
                      href={r.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span className="mr-2">🔗</span> View Resource
                    </a>
                  )}
                  
                  {/* Simple text link fallback */}
                  {!r.type && r.link && (r.url || r.content) && (
                    <a 
                      href={r.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 mt-3 inline-block hover:text-blue-800"
                    >
                      Learn more →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}