import 'dotenv/config';

export const BOT_NAME       = "BOT GURU";
export const OWNER_NAME     = "Guru";
export const OWNER_NUMBER   = process.env.OWNER_NUMBER || "2547xxxxxxxx";
export const PREFIX         = process.env.PREFIX || ".";
export const SESSION_FOLDER = "./guru_session";
export const SESSION_ID     = process.env.SESSION_ID || null;
export const EMOJI          = "🧘🏾‍♂️";
export const OPENAI_KEY     = process.env.OPENAI_API_KEY || "";
