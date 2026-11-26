import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully dynamic, authenticated application: every page reads the session.
  serverExternalPackages: ["pdfkit", "exceljs", "@prisma/client", "bcryptjs"],
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
