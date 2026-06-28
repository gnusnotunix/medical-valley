import axios from "axios";

/**
 * Single Axios instance used by every service module.
 *
 * Today `VITE_USE_MOCK=true` and every `services/*.service.ts` module reads
 * from `src/api/mock/*` instead of calling `http`. Once the FastAPI backend
 * from the TZ is live, flip the flag and point `baseURL` at it — no
 * component or page needs to change, since they only ever talk to the
 * service layer, never to `http` or the mock files directly.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  timeout: 60_000,
});

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK !== "false";
