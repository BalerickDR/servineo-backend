import dotenv from 'dotenv';

dotenv.config();

export const SERVER_PORT = process.env.SERVER_PORT || 3000;
export const LOCATIONIQ_TOKEN = process.env.LOCATIONIQ_TOKEN;
export const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
export const ENV = {
  MONGO_USER: process.env.MONGO_USER,
  MONGO_PASS: process.env.MONGO_PASS,
  MONGO_HOST: process.env.MONGO_HOST,
  MONGO_DB: process.env.MONGO_DB,
};
