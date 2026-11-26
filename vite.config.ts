import devServer from "@hono/vite-dev-server";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // Runs the Hono app inside the Vite dev server, so `npm run dev` serves page and API on
    // the same URL. Every path that does not start with /api/ is left to Vite.
    devServer({
      entry: "src/server/app.ts",
      exclude: [/^(?!\/api\/).*/],
    }),
  ],
});
