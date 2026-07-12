import multer from "multer";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!allowedImageTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."),
      false,
    );
  }

  return callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

export default upload;
