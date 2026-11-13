import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    root: __dirname,
  },
  // The Trip Planner, Trends and Financial Analysis pages were merged into Sandbox
  async redirects() {
    return ['/trip-planner', '/trends', '/financial-analysis'].map((source) => ({
      source,
      destination: '/sandbox',
      permanent: true,
    }));
  },
};

export default nextConfig;
