import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('CWD:', process.cwd());

// Explicitly point to backend/.env
const envPath = path.resolve(__dirname, '.env');
console.log('Attempting to load env from:', envPath);

const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('Dotenv Error:', result.error);
} else {
  console.log('Dotenv Loaded successfully!');
  console.log('Parsed:', result.parsed);
}

console.log('process.env.DB_HOST:', process.env.DB_HOST);
