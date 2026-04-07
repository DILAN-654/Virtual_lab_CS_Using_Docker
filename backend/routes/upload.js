// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const router = express.Router();
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const isCsv = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) return cb(new Error('Only CSV files are allowed'));
    cb(null, true);
  }
});

function escapeCsvValue(value) {
  const s = value == null ? '' : String(value);
  // Quote if needed
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.post('/file', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const filePath = req.file.path; // full path to uploaded file

  // Process CSV directly in Node (keeps Docker image lightweight and avoids python/pandas deps).
  const rows = [];
  const MAX_ROWS = 5;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (rows.length < MAX_ROWS) rows.push(row);
    })
    .on('error', (err) => {
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({ success: false, message: err.message || 'Failed to parse CSV' });
    })
    .on('end', () => {
      try { fs.unlinkSync(filePath); } catch {}

      if (!rows.length) {
        return res.json({ success: true, output: '' });
      }

      const headers = Object.keys(rows[0]);
      const lines = [headers.join(',')];
      for (const r of rows) {
        lines.push(headers.map((h) => escapeCsvValue(r[h])).join(','));
      }

      return res.json({ success: true, output: lines.join('\n') });
    });
});

module.exports = router;
