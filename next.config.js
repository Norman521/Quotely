// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    outputFileTracingIncludes: {
      // include the SQLite file in these serverless bundles
      "/app/api/search/route": ["./data/quotes.db"],
      "/app/api/debug-count/route": ["./data/quotes.db"], // if you added it
      "/app/api/debug-info/route": ["./data/quotes.db"]   // if you added it
    },
  },
};
