import crypto from "crypto";
import { getCloudinaryCredentials } from "../config/cloudinary.js";

/**
 * Upload via Cloudinary REST API with credentials from server/.env.
 * Bypasses the cloudinary SDK so stale env/config cannot swap the API key.
 */
const uploadToCloudinary = async (file, folder = "ecommerce/users") => {
  if (!file) {
    throw new Error("No image file was received.");
  }

  if (!file.buffer) {
    throw new Error("Image buffer was not received from Multer.");
  }

  const { cloud_name, api_key, api_secret } = getCloudinaryCredentials();

  console.log("Cloudinary upload using api_key:", {
    api_key: `${api_key.slice(0, 4)}...${api_key.slice(-4)}`,
    cloud_name,
  });

  const timestamp = Math.round(Date.now() / 1000);

  // Cloudinary signature: alphabetically sorted params + api_secret
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${api_secret}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign)
    .digest("hex");

  const form = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.mimetype || "application/octet-stream",
  });

  form.append("file", blob, file.originalname || "profile.jpg");
  form.append("api_key", api_key);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("CLOUDINARY UPLOAD ERROR:", data);
    throw new Error(
      data?.error?.message || "Cloudinary upload failed.",
    );
  }

  if (!data?.secure_url || !data?.public_id) {
    throw new Error("Cloudinary did not return an image URL and public ID.");
  }

  console.log("CLOUDINARY IMAGE UPLOADED:", {
    url: data.secure_url,
    public_id: data.public_id,
  });

  return {
    url: data.secure_url,
    secure_url: data.secure_url,
    public_id: data.public_id,
  };
};

export default uploadToCloudinary;
