import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxy = { "/api": process.env.API_URL ?? "http://localhost:8000" };

export default defineConfig({
    plugins: [react()],
    server: { port: 3000, proxy },
    preview: { port: 3000, proxy },
    build: { chunkSizeWarningLimit: 2000 },
});
