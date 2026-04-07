/**
 * Code Execution Diagnostic Tool
 * 
 * Purpose: Quickly diagnose why code execution output isn't appearing
 * Usage: Run this in browser console while on code-editor.html page
 * 
 * This will check:
 * - Servers running
 * - API connectivity
 * - Response format
 * - Token validity
 */

async function diagnoseCodeExecution() {
    console.clear();
    console.log('%c🔍 Code Execution Diagnostic Tool', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
    console.log('='.repeat(50) + '\n');
    
    const results = {
        issues: [],
        warnings: [],
        success: []
    };
    
    // ============================================
    // 1. Check Frontend State
    // ============================================
    console.log('%c1️⃣  Frontend State Check', 'font-weight: bold; color: #2196F3;');
    
    // Check if we're on code editor page
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor) {
        results.success.push('✓ Code editor element found');
        console.log('✓ Code editor element found');
    } else {
        results.issues.push('✗ Code editor not found - wrong page?');
        console.log('%c✗ Code editor not found', 'color: red;');
    }
    
    // Check current task ID
    window.currentAssignedTaskId = window.currentAssignedTaskId || new URLSearchParams(window.location.search).get('taskId');
    if (window.currentAssignedTaskId) {
        results.success.push(`✓ Task ID present: ${window.currentAssignedTaskId}`);
        console.log('✓ Task ID:', window.currentAssignedTaskId);
    } else {
        results.issues.push('✗ Task ID not found');
        console.log('%c✗ Task ID not found', 'color: red;');
    }
    
    // Check token
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
        results.success.push(`✓ Auth token present (${token.substring(0, 20)}...)`);
        console.log('✓ Auth token present');
    } else {
        results.issues.push('✗ No auth token - not logged in?');
        console.log('%c✗ No auth token', 'color: red;');
    }
    
    // Check API object
    if (window.api && typeof window.api.runAssignedTask === 'function') {
        results.success.push('✓ API client loaded');
        console.log('✓ API client available');
    } else {
        results.issues.push('✗ API client not loaded');
        console.log('%c✗ API client not loaded', 'color: red;');
    }
    
    console.log('\n');
    
    // ============================================
    // 2. Test Backend Connectivity
    // ============================================
    console.log('%c2️⃣  Backend Connectivity Check', 'font-weight: bold; color: #2196F3;');
    
    try {
        const backendCheck = await fetch('http://localhost:5000/api/health', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (backendCheck.ok) {
            results.success.push('✓ Backend server responding');
            console.log('✓ Backend server responding on port 5000');
        } else {
            results.warnings.push(`⚠ Backend returned status ${backendCheck.status}`);
            console.log(`%c⚠ Backend status: ${backendCheck.status}`, 'color: orange;');
        }
    } catch (error) {
        results.issues.push('✗ Cannot reach backend - is it running?');
        console.log('%c✗ Cannot reach backend on port 5000', 'color: red;');
        console.log('  Error:', error.message);
    }
    
    console.log('\n');
    
    // ============================================
    // 3. Test API Endpoint
    // ============================================
    console.log('%c3️⃣  API Endpoint Test', 'font-weight: bold; color: #2196F3;');
    
    if (window.currentAssignedTaskId && token) {
        try {
            console.log(`Testing: POST /api/assigned-tasks/${window.currentAssignedTaskId}/run`);
            
            const testCode = `print("test")`;
            const apiTest = await fetch(`http://localhost:5000/api/assigned-tasks/${window.currentAssignedTaskId}/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: testCode,
                    language: 'python',
                    stdin: ''
                })
            });
            
            const responseText = await apiTest.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { raw: responseText };
            }
            
            console.log('Response status:', apiTest.status);
            console.log('Response:', responseData);
            
            if (apiTest.ok && responseData.success) {
                results.success.push('✓ API endpoint working');
                results.success.push(`✓ Code execution successful: "${responseData.data.stdout.trim()}"`);
                console.log('%c✓ API endpoint working correctly!', 'color: green;');
                console.log('Output:', responseData.data.stdout);
            } else if (apiTest.status === 401) {
                results.issues.push('✗ Unauthorized - token may be expired');
                console.log('%c✗ Unauthorized (401) - re-login needed', 'color: red;');
            } else if (apiTest.status === 404) {
                results.issues.push('✗ Endpoint not found (404)');
                console.log('%c✗ Endpoint not found (404)', 'color: red;');
            } else {
                results.warnings.push(`⚠ API returned: ${responseData.message || 'unknown error'}`);
                console.log('%c⚠ API error:', 'color: orange;', responseData);
            }
        } catch (error) {
            results.issues.push(`✗ API test failed: ${error.message}`);
            console.log('%c✗ API test failed:', 'color: red;', error.message);
        }
    }
    
    console.log('\n');
    
    // ============================================
    // 4. Check Frontend Function
    // ============================================
    console.log('%c4️⃣  Frontend Function Check', 'font-weight: bold; color: #2196F3;');
    
    if (typeof runCode === 'function') {
        results.success.push('✓ runCode() function exists');
        console.log('✓ runCode() function exists');
    } else {
        results.issues.push('✗ runCode() function not found');
        console.log('%c✗ runCode() function not found', 'color: red;');
    }
    
    if (window.currentLanguage) {
        results.success.push(`✓ Language detected: ${window.currentLanguage}`);
        console.log('✓ Language:', window.currentLanguage);
    } else {
        results.warnings.push('⚠ Language not set (may auto-detect)');
        console.log('%c⚠ Language not set', 'color: orange;');
    }
    
    console.log('\n');
    
    // ============================================
    // 5. Summary
    // ============================================
    console.log('%c📊 Summary', 'font-weight: bold; color: #FF9800; font-size: 14px;');
    console.log('='.repeat(50));
    
    if (results.issues.length === 0) {
        console.log('%c✅ ALL CHECKS PASSED!', 'color: green; font-size: 12px; font-weight: bold;');
        console.log('\nYour code execution should work!');
        console.log('\nTry:');
        console.log('1. Enter code in the editor');
        console.log('2. Click the Run button or press Ctrl+Enter');
        console.log('3. Output should appear in the Output tab');
    } else {
        console.log('%c❌ ISSUES FOUND:', 'color: red; font-size: 12px; font-weight: bold;');
        results.issues.forEach(issue => console.log('  ' + issue));
    }
    
    if (results.warnings.length > 0) {
        console.log('\n%c⚠️  Warnings:', 'color: orange; font-weight: bold;');
        results.warnings.forEach(warning => console.log('  ' + warning));
    }
    
    console.log('\n%cSuggestions:', 'font-weight: bold;');
    if (!token) {
        console.log('• Re-login at /login.html');
    }
    if (results.issues.some(i => i.includes('Backend'))) {
        console.log('• Start backend: cd backend && npm start');
    }
    if (results.issues.some(i => i.includes('CodeEditor'))) {
        console.log('• You might not be on the code editor page');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('%cDiagnostic complete!', 'color: #4CAF50; font-weight: bold;');
    
    return results;
}

// Run the diagnostic
diagnoseCodeExecution();
