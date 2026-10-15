import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Landing } from "./components/Landing";
import "./styles.css";

// "/" is the landing page; "/app" (and the old "/app.html") is the app.
const isApp = /^\/app(?:\.html)?\/?$/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(<StrictMode>{isApp ? <App /> : <Landing />}</StrictMode>);
