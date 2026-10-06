import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import App from "./app/App.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  // reducedMotion="user" honours the OS setting across every motion component,
  // so the staggered grids stop animating for people who asked them not to.
  <MotionConfig reducedMotion="user">
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </MotionConfig>
);
