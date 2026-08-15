import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles.css";
import { OrbitApp } from "@/app/App";

createRoot(document.getElementById("root")!).render(<StrictMode><OrbitApp mode="sidepanel" /></StrictMode>);
