import type { NextConfig } from 'next';
const config:NextConfig={serverExternalPackages:['@netlify/database'],experimental:{cpus:2}};
export default config;
