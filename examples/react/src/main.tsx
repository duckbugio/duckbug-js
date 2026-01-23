import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DuckBugProviderComponent } from "./DuckBugContext";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
createRoot(rootElement).render(
  <StrictMode>
    <DuckBugProviderComponent>
      <App />
    </DuckBugProviderComponent>
  </StrictMode>,
);
