/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lifeos/core', '@lifeos/db', '@lifeos/ai', '@lifeos/agents'],
  // pglite loads its own WASM binary via internal path resolution that breaks once
  // bundled — keep it as a real Node require() at runtime instead.
  serverExternalPackages: ['@electric-sql/pglite']
}

export default nextConfig
