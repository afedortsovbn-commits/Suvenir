import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/Suvenir",
  assetPrefix: "/Suvenir/",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/Suvenir"
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
