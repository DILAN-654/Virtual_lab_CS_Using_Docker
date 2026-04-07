(function (global) {
    function normalizeLanguageToken(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/c\s*\+\+/g, ' cpp ')
            .replace(/c\s+plus\s+plus/g, ' cpp ')
            .replace(/java\s*script/g, ' javascript ')
            .replace(/\bjs\b/g, ' javascript ')
            .replace(/\bpy\b/g, ' python ')
            .replace(/[^a-z0-9\s#+]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeInput(userInput) {
        return normalizeLanguageToken(userInput);
    }

    function getEntries() {
        return Array.isArray(global.chatbotData) ? global.chatbotData : [];
    }

    function scoreKeywordGroup(normalizedInput, keywordGroup) {
        const keywords = Array.isArray(keywordGroup) ? keywordGroup : [keywordGroup];
        if (!keywords.length) return -1;

        const matched = keywords.every((keyword) => normalizedInput.includes(normalizeInput(keyword)));
        if (!matched) return -1;

        const joinedLength = keywords.join('').length;
        return (keywords.length * 100) + joinedLength;
    }

    function findBestDatasetMatch(normalizedInput) {
        let bestMatch = null;

        getEntries().forEach((entry) => {
            const groups = Array.isArray(entry.keywords) ? entry.keywords : [];

            groups.forEach((group) => {
                const score = scoreKeywordGroup(normalizedInput, group);
                if (score < 0) return;

                const totalScore = score + Number(entry.priority || 0);
                if (!bestMatch || totalScore > bestMatch.score) {
                    bestMatch = {
                        entry,
                        score: totalScore
                    };
                }
            });
        });

        return bestMatch ? bestMatch.entry : null;
    }

    function detectTopic(normalizedInput) {
        const topics = [
            'factorial',
            'fibonacci',
            'palindrome',
            'prime',
            'vote',
            'reverse string',
            'calculator'
        ];

        return topics.find((topic) => {
            const keywords = topic.split(' ');
            return keywords.every((keyword) => normalizedInput.includes(keyword));
        }) || null;
    }

    function findContextualCodeEntry(topic, language) {
        const normalizedLanguage = normalizeInput(language);
        if (!topic || !normalizedLanguage) return null;

        return getEntries().find((entry) => (
            entry.type === 'code' &&
            entry.topic === topic &&
            normalizeInput(entry.language) === normalizedLanguage
        )) || null;
    }

    function appendSuggestions(response, suggestions) {
        if (!Array.isArray(suggestions) || !suggestions.length) {
            return response;
        }

        return `${response}\n\nTry one of these:\n${suggestions.map((item) => `- ${item}`).join('\n')}`;
    }

    function getBotResponse(userInput, options) {
        const normalizedInput = normalizeInput(userInput);
        const context = options || {};

        if (!normalizedInput) {
            return {
                text: 'Please type a question so I can help.',
                suggestions: ['factorial python', 'fibonacci java', 'palindrome c']
            };
        }

        const directMatch = findBestDatasetMatch(normalizedInput);
        if (directMatch && directMatch.type === 'code') {
            return {
                text: directMatch.response,
                suggestions: directMatch.suggestions || [],
                matchedEntry: directMatch
            };
        }

        const detectedTopic = detectTopic(normalizedInput);
        if (detectedTopic && context.language) {
            const contextualMatch = findContextualCodeEntry(detectedTopic, context.language);
            if (contextualMatch) {
                return {
                    text: `Using your current editor language, here is a ${detectedTopic} example.\n\n${contextualMatch.response}`,
                    suggestions: contextualMatch.suggestions || [],
                    matchedEntry: contextualMatch
                };
            }
        }

        if (directMatch) {
            return {
                text: appendSuggestions(directMatch.response, directMatch.suggestions),
                suggestions: directMatch.suggestions || [],
                matchedEntry: directMatch
            };
        }

        return {
            text: global.chatbotFallbackMessage || 'Sorry, I did not understand that.',
            suggestions: ['factorial python', 'fibonacci java', 'palindrome c']
        };
    }

    global.staticChatbot = {
        chatbotData: getEntries(),
        normalizeInput,
        getBotResponse
    };
})(window);
