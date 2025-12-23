/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bravo.ticketsnow.co.il',
      },
      {
        protocol: 'https',
        hostname: 'bravo.israelinfo.co.il',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
    ],
  },
}

module.exports = nextConfig
