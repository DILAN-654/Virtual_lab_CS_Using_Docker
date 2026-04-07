/**
 * Language Detection Controller
 * Provides API endpoints for detecting programming languages
 */

const { detectLanguage, getSupportedLanguages, isLanguageSupported } = require('../utils/languageDetector');

/**
 * @desc    Detect language from filename and/or code
 * @route   POST /api/tools/detect-language
 * @access  Private
 */
exports.detectLanguageFromCode = async (req, res) => {
    try {
        const { filename, code } = req.body;

        // Validation
        if (!filename) {
            return res.status(400).json({
                success: false,
                message: 'Filename is required'
            });
        }

        // Detect language
        const result = detectLanguage(filename, code || '');

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Language detection failed'
        });
    }
};

/**
 * @desc    Get supported languages
 * @route   GET /api/tools/supported-languages
 * @access  Public
 */
exports.getSupportedLanguagesEndpoint = async (req, res) => {
    try {
        const languages = getSupportedLanguages();

        res.status(200).json({
            success: true,
            count: languages.length,
            data: languages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch supported languages'
        });
    }
};

/**
 * @desc    Validate if language is supported
 * @route   POST /api/tools/validate-language
 * @access  Public
 */
exports.validateLanguage = async (req, res) => {
    try {
        const { language } = req.body;

        if (!language) {
            return res.status(400).json({
                success: false,
                message: 'Language parameter is required'
            });
        }

        const isSupported = isLanguageSupported(language);

        res.status(200).json({
            success: true,
            language: language,
            isSupported: isSupported
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Validation failed'
        });
    }
};
