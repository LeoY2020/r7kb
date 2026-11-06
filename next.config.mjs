/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
// 部署构建写入独立目录，避免覆盖 npm run dev 正在使用的 .next 缓存
const distDir = process.env.NEXT_DIST_DIR || '.next';

const nextConfig = {
  // 静态导出：`npm run build` 后产物在 out/，可直接放到任意静态托管
  output: 'export',
  distDir,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
