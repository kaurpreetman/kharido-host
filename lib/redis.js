// // import Redis from "ioredis"
// // import dotenv from "dotenv"

// // dotenv.config();
// // export const redis = new Redis(process.env.UPSTASH_REDIS_URL);

// // Dummy export to avoid crash
export const redis = {
  get: () => null,
  set: () => null,
};
