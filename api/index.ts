// Vercel Function entry. Vercel turns files in api/ into functions; vercel.json rewrites
// every /api/* request here, and the Hono app routes it.
export { default } from "../src/server/app.js";
