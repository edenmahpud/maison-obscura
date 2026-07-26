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
      // Next serves everything in `public/` as `Cache-Control: public, max-age=0`
      // (it can't know when those files change). With no `s-maxage`, Render's CDN
      // refuses to cache them, so every byte of every video streamed from the
      // single origin instance on every request — videos stalled mid-buffer or
      // never started. The old Static Site never hit this because Render served
      // it with `s-maxage=300` behind Cloudflare.
      //
      // `max-age=0` keeps browsers revalidating, so a replaced asset is picked up
      // as soon as the edge copy expires; `s-maxage` is what actually lets the CDN
      // absorb the video traffic. Trade-off: a replaced asset can serve stale from
      // the edge for up to a day — bust it by renaming the file.
      async headers() {
        return [
          {
            source: "/assets/:path*",
            headers: [
              {
                key: "Cache-Control",
                value:
                  "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
              },
            ],
          },
        ];
      },
    };

export default nextConfig;
