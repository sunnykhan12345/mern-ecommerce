import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (file, folder = "ecommerce/users") => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No image file was received."));
    }

    if (!file.buffer) {
      return reject(new Error("Image buffer was not received from Multer."));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: false,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          console.error("CLOUDINARY UPLOAD ERROR:", error);
          return reject(
            new Error(error.message || "Cloudinary upload failed."),
          );
        }

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error("Cloudinary did not return an image URL and public ID."),
          );
        }

        console.log("CLOUDINARY IMAGE UPLOADED:", {
          url: result.secure_url,
          public_id: result.public_id,
        });

        return resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    uploadStream.end(file.buffer);
  });
};

export default uploadToCloudinary;
