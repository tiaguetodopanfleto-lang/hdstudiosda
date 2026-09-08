import type { NextConfig } from 'next';
const config:NextConfig={
 serverExternalPackages:['@netlify/database'],
 experimental:{cpus:2},
 async rewrites(){return [{source:'/comprar/:id',destination:'/comprar?produto=:id'}]}
};
export default config;
