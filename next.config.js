/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["docxtemplater", "pizzip", "mammoth", "html-to-docx"],
  },
};

module.exports = nextConfig;
