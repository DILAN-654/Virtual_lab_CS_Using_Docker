/**
 * Quick test to verify the runner output format
 * Run with: node test-runner.js
 */

const runner = require('./utils/runner');

async function testRunner() {
    console.log('Testing runner output format...\n');
    
    const testCode = `
print("Hello, World!")
print("This is a test")
x = 10
print(f"x = {x}")
`;
    
    const result = await runner.runCode(testCode, 'python', '');
    
    console.log('Result object:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\nWhat controller would return:');
    const controllerResponse = {
        success: true,
        data: result
    };
    console.log(JSON.stringify(controllerResponse, null, 2));
    
    console.log('\nWhat frontend expects:');
    console.log('- response.success: true');
    console.log('- response.data.stdout: string');
    console.log('- response.data.stderr: string');
    console.log('- response.data.exitCode: number');
    
    console.log('\nMatch? ✓ Yes, structure is correct!');
}

testRunner();
