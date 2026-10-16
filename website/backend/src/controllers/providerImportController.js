const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { importProviders, createProviderTemplate } = require('../services/providerImportService');

const importWorkers = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(422, 'Choose an Excel .xlsx file to import.', 'IMPORT_FILE_REQUIRED');
  const result = await importProviders(req.file.buffer);
  res.json({ success: true, ...result });
});
const downloadTemplate = asyncHandler(async (_req, res) => {
  const buffer = await createProviderTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Service_Providers_Import.xlsx"');
  res.send(buffer);
});

module.exports = { importWorkers, downloadTemplate };
