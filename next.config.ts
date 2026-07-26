import type { NextConfig } from "next";

// Static export was used for Render's "Static Site" hosting, but a static
// export forces `images.unoptimized`, so every image shipped at full raw size.
// Render now runs this as a Node Web Service (`next start`, see render.yaml),
// which lets Next optimize images on the fly and serve modern formats.
// The STATIC_EXPORT branch is kept only as a fallback for any static host.
const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = staticExport
  ? {
      output: "export",
      images: { unoptimized: true },
    }
  : {
      images: {
        // Serve AVIF/WebP automatically from the existing PNG/JPG sources.
        formats: ["image/avif", "image/webp"],
      },
    };

export default nextConfig;
