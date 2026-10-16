const path = require('node:path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, next) => next(path.extname(file.originalname).toLowerCase() === '.xlsx' ? null : new ApiError(422, 'Upload an Excel .xlsx file. Use Save As in Excel to convert older .xls files.', 'IMPORT_FILE_TYPE'), true),
}).single('file');

const providerImportUpload = (req, res, next) => upload(req, res, (error) => {
  if (!error) return next();
  if (error instanceof ApiError) return next(error);
  if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Excel files must be 25 MB or smaller.', 'IMPORT_FILE_TOO_LARGE'));
  return next(new ApiError(422, 'Upload one Excel .xlsx file using the file field.', 'IMPORT_UPLOAD_INVALID'));
});

module.exports = providerImportUpload;
