import path from 'path';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(path.resolve(process.cwd(), '..'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '42220',
  },
};

export default nextConfig;
