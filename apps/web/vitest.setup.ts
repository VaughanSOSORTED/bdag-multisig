import "@testing-library/jest-dom/vitest";

process.env.NEXT_PUBLIC_RPC_URL ??= "https://rpc.test.local";
process.env.NEXT_PUBLIC_CHAIN_ID ??= "1404";
process.env.NEXT_PUBLIC_API_URL ??= "http://localhost:4000";
