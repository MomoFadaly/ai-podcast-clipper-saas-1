/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  images: {
    domains: ['localhost'],
  },
  env: {
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  },
  typescript: {
    // We want TypeScript to check everything
    ignoreBuildErrors: false,
  },
  eslint: {
    // We want ESLint to check everything
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig