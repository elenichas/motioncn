import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { MotionConfig } from "motion/react"
import App from "./App"
import { EmbedView } from "./canvas/list-view"

const params = new URLSearchParams(location.search)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {params.has("embed") ? (
      <MotionConfig reducedMotion={params.get("static") === "1" ? "always" : "user"}>
        <EmbedView params={params} />
      </MotionConfig>
    ) : (
      <App />
    )}
  </StrictMode>,
)
