import type { NextConfig } from "next";
import path from "path";

const apkDownloadUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    if (!apkDownloadUrl) return [];
    return [
      {
        source: "/download/android",
        destination: apkDownloadUrl,
        permanent: false,
      },
      {
        source: "/notes-by-winner.apk",
        destination: apkDownloadUrl,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
