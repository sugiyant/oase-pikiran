import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://op.sugiyanto.com",
  output: "server",
  adapter: cloudflare(),
  integrations: [sitemap()],
  build: { format: "directory" }
});
