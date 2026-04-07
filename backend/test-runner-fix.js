/**
 * Test Script for Code Runner Fix
 * Tests real code execution for all supported languages
 */

const runner = require('./utils/runner');

const testCases = [
  {
    name: 'Python - Simple Print',
    language: 'python',
    code: 'print("Hello from Python!")\nprint(2 + 2)',
    stdin: '',
    expectedContains: 'Hello from Python'
  },
  {
    name: 'Python - Input',
    language: 'python',
    code: 'name = input("Enter name: ")\nprint(f"Hello, {name}!")',
    stdin: 'John',
    expectedContains: 'Hello, John'
  },
  {
    name: 'JavaScript - Simple',
    language: 'javascript',
    code: 'console.log("Hello from JavaScript!");\nconsole.log(2 + 2);',
    stdin: '',
    expectedContains: 'Hello from JavaScript'
  },
  {
    name: 'JavaScript - Array',
    language: 'javascript',
    code: 'const arr = [1, 2, 3, 4, 5];\nconst sum = arr.reduce((a, b) => a + b, 0);\nconsole.log("Sum:", sum);',
    stdin: '',
    expectedContains: 'Sum: 15'
  },
  {
    name: 'Java - Simple',
    language: 'java',
    code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n        System.out.println(2 + 2);\n    }\n}',
    stdin: '',
    expectedContains: 'Hello from Java'
  },
  {
    name: 'C++ - Simple',
    language: 'cpp',
    code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello from C++" << endl;\n    cout << 2 + 2 << endl;\n    return 0;\n}',
    stdin: '',
    expectedContains: 'Hello from C++'
  },
  {
    name: 'Python - Error Handling',
    language: 'python',
    code: 'x = 10\ny = 0\nresult = x / y',
    stdin: '',
    expectedContains: 'ZeroDivisionError'
  }
];

async function runTests() {
  console.log('🧪 Testing Code Runner Implementation\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    try {
      console.log(`\n📝 Test: ${test.name}`);
      console.log(`   Language: ${test.language}`);
      
      const result = await runner.runCode(test.code, test.language, test.stdin);
      
      const output = result.stdout + result.stderr;
      const success = output.includes(test.expectedContains);
      
      if (success) {
        console.log(`   ✅ PASSED`);
        console.log(`   Output: ${output.substring(0, 100)}...`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Expected to contain: "${test.expectedContains}"`);
        console.log(`   Got: ${output.substring(0, 100)}`);
        failed++;
      }
      
      console.log(`   Execution time: ${result.executionTime}ms`);
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! Code execution is working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check the output above.`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
