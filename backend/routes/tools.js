/**
 * Tools Routes
 * Endpoints for development tools like language detection
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    detectLanguageFromCode,
    getSupportedLanguagesEndpoint,
    validateLanguage
} = require('../controllers/toolsController');

/**
 * Language Detection Endpoints
 */

// POST - Detect language from filename and code
router.post('/detect-language', protect, detectLanguageFromCode);

// GET - Get list of supported languages
router.get('/supported-languages', getSupportedLanguagesEndpoint);

// POST - Validate if a language is supported
router.post('/validate-language', validateLanguage);

module.exports = router;
