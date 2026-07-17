import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, "../../.env");

const parseEnvFile = (filePath) => {
  const values = {};

  if (!fs.existsSync(filePath)) {
    return values;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

/**
 * Always read credentials fresh from server/.env file on disk.
 */
export const getCloudinaryCredentials = () => {
  const envFile = parseEnvFile(ENV_PATH);

  const cloudName = String(envFile.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(envFile.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(envFile.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary variables missing in server/.env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
    );
  }

  if (!/^\d+$/.test(apiKey)) {
    throw new Error(
      `CLOUDINARY_API_KEY must be numbers only. Got "${apiKey.slice(0, 8)}...". API Key and Secret are swapped in .env`,
    );
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  };
};

export const applyCloudinaryConfig = () => {
  const credentials = getCloudinaryCredentials();

  delete process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_CLOUD_NAME = credentials.cloud_name;
  process.env.CLOUDINARY_API_KEY = credentials.api_key;
  process.env.CLOUDINARY_API_SECRET = credentials.api_secret;

  cloudinary.config(true); // reset
  cloudinary.config({
    cloud_name: credentials.cloud_name,
    api_key: credentials.api_key,
    api_secret: credentials.api_secret,
    secure: true,
  });

  return credentials;
};

const initial = applyCloudinaryConfig();

console.log("Cloudinary config loaded:", {
  cloud_name: initial.cloud_name,
  api_key: `${initial.api_key.slice(0, 4)}...${initial.api_key.slice(-4)}`,
  env_file: ENV_PATH,
});

export default cloudinary;
