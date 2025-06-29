/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  images: {
    domains: ['localhost'],
  },
  env: {
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  },
}

module.exports = nextConfig