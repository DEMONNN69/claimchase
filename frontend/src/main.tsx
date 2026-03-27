import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n"; // Import i18n configuration
import "./index.css";

// Remove old service workers so users don't get stale auth flow bundles.
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.getRegistrations().then((registrations) => {
		registrations.forEach((registration) => {
			registration.unregister();
		});
	});
}

createRoot(document.getElementById("root")!).render(<App />);
