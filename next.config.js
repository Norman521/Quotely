// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  // Ensure the SQLite file is bundled with these API routes
  outputFileTracingIncludes: {
    "/app/api/search/route": ["./data/quotes.db"],
    "/app/api/debug-count/route": ["./data/quotes.db"], // if you added it
    "/app/api/debug-info/route": ["./data/quotes.db"]   // if you added it
  },
};
