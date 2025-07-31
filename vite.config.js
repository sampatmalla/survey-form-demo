import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "/survey-form-demo",
  // server: {
  //   allowedHosts: ["cd159b8322ff.ngrok-free.app"],
  // },
});
