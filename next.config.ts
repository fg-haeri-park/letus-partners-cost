import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 클라이언트 페이지 마이그레이션 완료 전까지 빌드 시 타입 오류 무시
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
