import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    root: __dirname,
  },
  // @libsql/client ships native bindings per-platform; keep it external so
  // the standalone build's file tracer copies its node_modules instead of
  // webpack trying (and failing) to bundle the native addon.
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
