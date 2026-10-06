import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    root: __dirname,
  },
  // The Financial Analysis page was replaced by Trends
  async redirects() {
    return [{ source: '/financial-analysis', destination: '/trends', permanent: true }];
  },
};

export default nextConfig;
