import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Babylon.js shader loading errors (they're harmless warnings)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch dynamically imported module') &&
      (event.reason.message.includes('.vertex') || event.reason.message.includes('.fragment'))) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
