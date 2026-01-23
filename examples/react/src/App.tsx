import { useState } from "react";
import { useDuckBug } from "./DuckBugContext";

function App() {
  const duck = useDuckBug();
  const [count, setCount] = useState(0);

  const handleLog = () => {
    duck.log("User action", { action: "log_button_click", count });
    setCount((c) => c + 1);
  };

  const handleDebug = () => {
    duck.debug("Debug info", { timestamp: Date.now(), count });
  };

  const handleWarn = () => {
    duck.warn("Warning message", { warning: "This is a test warning", count });
  };

  const handleError = () => {
    duck.error("Error message", { error: "This is a test error", count });
  };

  const handleFatal = () => {
    duck.fatal("Fatal message", { error: "Critical issue", count });
  };

  const handleQuack = () => {
    const testError = new Error("Test error from React example");
    testError.stack = `Error: Test error from React example
    at App.tsx:${Math.floor(Math.random() * 50) + 1}:1`;
    duck.quack("REACT_ERROR", testError);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>DuckBug.js React Example</h1>
      <p>Click the buttons below to test different log levels:</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <button
          type="button"
          onClick={handleLog}
          style={{ padding: "0.5rem 1rem" }}
        >
          Log ({count})
        </button>
        <button
          type="button"
          onClick={handleDebug}
          style={{ padding: "0.5rem 1rem" }}
        >
          Debug
        </button>
        <button
          type="button"
          onClick={handleWarn}
          style={{ padding: "0.5rem 1rem" }}
        >
          Warn
        </button>
        <button
          type="button"
          onClick={handleError}
          style={{ padding: "0.5rem 1rem" }}
        >
          Error
        </button>
        <button
          type="button"
          onClick={handleFatal}
          style={{ padding: "0.5rem 1rem" }}
        >
          Fatal
        </button>
        <button
          type="button"
          onClick={handleQuack}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#ff6b6b",
            color: "white",
          }}
        >
          Quack (Send Error)
        </button>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
        }}
      >
        <p>
          <strong>Note:</strong> Make sure to set VITE_DUCKBUG_DSN in your .env
          file
        </p>
        <p>Check your DuckBug.io dashboard to see the logs and errors.</p>
      </div>
    </div>
  );
}

export default App;
