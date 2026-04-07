/**
 * Language Detector Utility
 * Detects programming language by file extension or code pattern
 * Supports: Python, Java, C, C++, JavaScript
 */

const LANGUAGE_PATTERNS = {
    python: {
        extensions: ['py'],
        patterns: [
            /^\s*def\s+\w+\s*\(/m,           // def function_name(
            /^\s*import\s+\w+/m,              // import module
            /^\s*from\s+\w+\s+import/m,       // from module import
            /print\s*\(/,                      // print()
            /^\s*class\s+\w+\s*:/m,           // class ClassName:
            /if\s+__name__\s*==\s*['"']__main__['"']/,  // if __name__ == '__main__'
        ]
    },
    
    java: {
        extensions: ['java'],
        patterns: [
            /public\s+class\s+\w+/,           // public class ClassName
            /System\.out\.(print|println)/,   // System.out.print
            /import\s+java\./,                // import java.
            /public\s+static\s+void\s+main/,  // public static void main
            /private\s+\w+\s+\w+\s*;/,        // private type name;
            /\bthrows\s+\w+/,                 // throws Exception
        ]
    },

    c: {
        extensions: ['c'],
        patterns: [
            /#include\s*<stdio\.h>/,
            /\bprintf\s*\(/,
            /\bscanf\s*\(/,
            /\bgetchar\s*\(/,
            /\bputs\s*\(/,
            /\bint\s+main\s*\(/
        ]
    },
    
    cpp: {
        extensions: ['cpp', 'cc', 'cxx', 'c++', 'h', 'hpp'],
        patterns: [
            /#include\s+</,                   // #include <
            /std::/,                          // std::
            /int\s+main\s*\(/,                // int main(
            /cout\s*<<|cin\s*>>/,             // cout << or cin >>
            /using\s+namespace\s+std/,        // using namespace std
            /template\s*</,                   // template <
        ]
    },
    
    javascript: {
        extensions: ['js', 'mjs'],
        patterns: [
            /function\s+\w+\s*\(/,            // function name(
            /const\s+\w+\s*=/,                // const name =
            /let\s+\w+\s*=/,                  // let name =
            /console\.(log|error|warn)/,      // console.log
            /async\s+function/,               // async function
            /=>.*{/,                          // arrow function =>
            /require\s*\(/,                   // require(
        ]
    }
};

/**
 * Detect programming language from filename and/or code content
 * @param {string} filename - Name of the file
 * @param {string} codeContent - (Optional) Content of the file for pattern matching
 * @returns {object} - { language: string, confidence: number, method: string }
 */
function detectLanguage(filename, codeContent = '') {
    if (!filename) {
        return {
            language: 'unknown',
            confidence: 0,
            method: 'no_filename',
            error: 'Filename is required'
        };
    }

    // Extract file extension
    const ext = filename.split('.').pop().toLowerCase();

    // Step 1: Check by extension (highest priority)
    for (const [lang, config] of Object.entries(LANGUAGE_PATTERNS)) {
        if (config.extensions.includes(ext)) {
            return {
                language: lang,
                confidence: 100,
                method: 'extension',
                filename: filename
            };
        }
    }

    // Step 2: Check by code patterns if content provided
    if (codeContent && codeContent.trim().length > 0) {
        const scores = {};

        for (const [lang, config] of Object.entries(LANGUAGE_PATTERNS)) {
            let matches = 0;
            for (const pattern of config.patterns) {
                if (pattern.test(codeContent)) {
                    matches++;
                }
            }
            if (matches > 0) {
                scores[lang] = (matches / config.patterns.length) * 100;
            }
        }

        // Return language with highest score
        if (Object.keys(scores).length > 0) {
            const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
            return {
                language: detected[0],
                confidence: Math.round(detected[1]),
                method: 'pattern_matching',
                filename: filename,
                matchedPatterns: detected[1]
            };
        }
    }

    // Step 3: Return unknown
    return {
        language: 'unknown',
        confidence: 0,
        method: 'no_match',
        filename: filename,
        suggestion: 'Could not detect language. Supported: Python, Java, C, C++, JavaScript'
    };
}

/**
 * Get supported languages
 */
function getSupportedLanguages() {
    return Object.keys(LANGUAGE_PATTERNS).map(lang => ({
        name: lang,
        extensions: LANGUAGE_PATTERNS[lang].extensions
    }));
}

/**
 * Validate if a language is supported
 */
function isLanguageSupported(language) {
    return Object.keys(LANGUAGE_PATTERNS).includes(language.toLowerCase());
}

module.exports = {
    detectLanguage,
    getSupportedLanguages,
    isLanguageSupported,
    LANGUAGE_PATTERNS
};
