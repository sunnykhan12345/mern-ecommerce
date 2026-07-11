import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const fileFilter = (_req, file, callback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(
    new Error("Only JPG, JPEG, PNG, and WEBP images are allowed"),
    false,
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadProfileImage = (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Profile image must be smaller than 2 MB",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || "Profile image upload failed",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid profile image",
    });
  });
};

export default upload;
