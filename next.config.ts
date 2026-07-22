import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(staticExport && {
    output: "export",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
