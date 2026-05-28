import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { reactCompiler: false },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
