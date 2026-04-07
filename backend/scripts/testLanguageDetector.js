/**
 * Test Language Detection Utility
 */

const { detectLanguage, getSupportedLanguages, isLanguageSupported } = require('../utils/languageDetector');

console.log('🔍 LANGUAGE DETECTION UTILITY TEST\n');

// Test 1: Detection by extension
console.log('=== Test 1: Detection by File Extension ===');
const testFiles = [
    { filename: 'hello.py', code: '' },
    { filename: 'Main.java', code: '' },
    { filename: 'program.cpp', code: '' },
    { filename: 'script.js', code: '' },
    { filename: 'unknown.txt', code: '' }
];

testFiles.forEach(test => {
    const result = detectLanguage(test.filename, test.code);
    console.log(`\n📄 ${test.filename}`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Method: ${result.method}`);
});

// Test 2: Detection by code pattern
console.log('\n\n=== Test 2: Detection by Code Pattern ===');

const codeTests = [
    {
        filename: 'script1',
        code: `def hello_world():
    print("Hello, World!")
    return True`
    },
    {
        filename: 'Main',
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}`
    },
    {
        filename: 'prog',
        code: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello" << endl;
    return 0;
}`
    },
    {
        filename: 'app',
        code: `const greet = () => {
    console.log("Hello, World!");
};
greet();`
    }
];

codeTests.forEach(test => {
    const result = detectLanguage(test.filename, test.code);
    console.log(`\n📝 Code Pattern Test`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Method: ${result.method}`);
});

// Test 3: Supported languages
console.log('\n\n=== Test 3: Supported Languages ===');
const supported = getSupportedLanguages();
console.log(JSON.stringify(supported, null, 2));

// Test 4: Language validation
console.log('\n\n=== Test 4: Language Validation ===');
const languagesToTest = ['python', 'java', 'cpp', 'javascript', 'rust', 'go'];
languagesToTest.forEach(lang => {
    const isSupported = isLanguageSupported(lang);
    console.log(`${isSupported ? '✅' : '❌'} ${lang}`);
});

console.log('\n✅ All tests completed!');
