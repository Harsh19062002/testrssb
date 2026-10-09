// ─── Google Apps Script Code Template ────────────────────────────────────────
// Copy this ENTIRE file content and paste it into:
//   Google Sheets → Extensions → Apps Script → (delete everything) → paste → Deploy
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable */
// @ts-nocheck

const GAS_TEMPLATE = `
// ─────────────────────────────────────────────────────────────────────────────
// SnapCompress — Google Apps Script Backend
// Paste this into: Google Sheets > Extensions > Apps Script
// Then: Deploy > New deployment > Web App
//        Execute as: Me  |  Who has access: Anyone
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var uploaderName   = data.uploaderName   || data.name || "Anonymous";
    var fileName       = data.fileName       || ("file_" + new Date().getTime());
    var fileType       = data.fileType       || "photo";
    var base64Data     = data.base64Data     || "";
    var originalSize   = data.originalSize   || "N/A";
    var compressedSize = data.compressedSize || "N/A";
    var reductionPct   = (data.reductionPercentage !== undefined)
                           ? data.reductionPercentage + "%"
                           : "N/A";

    // Strip the data-URL prefix if present  e.g. "data:image/jpeg;base64,..."
    var base64Content = (base64Data.indexOf(",") !== -1)
      ? base64Data.split(",")[1]
      : base64Data;

    // Resolve MIME type
    var mimeType  = MimeType.JPEG;
    var lowerName = fileName.toLowerCase();
    if      (fileType === "pdf" || lowerName.endsWith(".pdf")) { mimeType = MimeType.PDF; }
    else if (lowerName.endsWith(".png"))  { mimeType = MimeType.PNG; }
    else if (lowerName.endsWith(".webp")) { mimeType = "image/webp"; }

    // Save to Google Drive
    var blob       = Utilities.newBlob(Utilities.base64Decode(base64Content), mimeType, fileName);
    var folders    = DriveApp.getFoldersByName("Compressed Uploads");
    var folder     = folders.hasNext() ? folders.next() : DriveApp.createFolder("Compressed Uploads");
    var driveFile  = folder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var driveUrl   = driveFile.getUrl();

    // Get sheet — works whether bound or standalone
    var ss, sheet;
    try {
      ss    = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getActiveSheet();
    } catch (sheetErr) {
      var ssFiles = DriveApp.getFilesByName("SnapCompress Upload Log");
      ss    = ssFiles.hasNext()
                ? SpreadsheetApp.openById(ssFiles.next().getId())
                : SpreadsheetApp.create("SnapCompress Upload Log");
      sheet = ss.getActiveSheet();
    }

    // Ensure sheet headers exist & include Uploader Name column
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Uploader Name", "File Name", "File Type", "Original Size", "Compressed Size", "Reduction %", "Google Drive Link"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e8f0fe");
    } else if (sheet.getRange(1, 2).getValue() !== "Uploader Name") {
      sheet.insertColumnBefore(2);
      sheet.getRange(1, 2).setValue("Uploader Name");
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e8f0fe");
    }

    sheet.appendRow([
      new Date().toLocaleString(),
      uploaderName,
      fileName, fileType,
      originalSize, compressedSize, reductionPct,
      driveUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", driveUrl: driveUrl }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "SnapCompress Apps Script is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export default GAS_TEMPLATE;
