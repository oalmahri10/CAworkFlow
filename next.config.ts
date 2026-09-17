import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SQLite database files and uploaded documents live inside the
  // project root (prisma/*.db, var/documents/**) so they're easy to find
  // and back up. Without this, webpack's dev-mode file watcher treats every
  // database write — which happens on nearly every request — as a source
  // change and triggers a Fast Refresh rebuild, which in turn can race with
  // and interrupt in-flight client-side navigations (observed as
  // router.replace() appearing to "not work" right after a form submit).
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/prisma/*.db",
        "**/prisma/*.db-journal",
        "**/var/documents/**",
        "**/var/test-documents/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
