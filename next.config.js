/** @type {import('next').NextConfig} */
const MCP_BROKER_URL = (process.env.MCP_API_URL || process.env.ECOBE_MVP_URL || '')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '')

const HALOGRID_CONSOLE_URL = (
  process.env.HALOGRID_CONSOLE_URL ||
  'https://console.co2router.com'
).replace(/\/$/, '')

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    MCP_API_URL: MCP_BROKER_URL,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/console',
          destination: `${HALOGRID_CONSOLE_URL}/`,
        },
        {
          source: '/console/:path*',
          destination: `${HALOGRID_CONSOLE_URL}/:path*`,
        },
      ],
    }
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]

    const halogridCsp =
      "default-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'self'; " +
      "img-src 'self' data: blob:; " +
      "media-src 'self'; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "script-src 'self' 'unsafe-inline'; " +
      "connect-src 'self'"

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/keeper-console.html',
        headers: [
          ...securityHeaders,
          { key: 'Content-Security-Policy', value: halogridCsp },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
