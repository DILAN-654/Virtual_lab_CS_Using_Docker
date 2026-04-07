// Test script to verify AI service configuration
require('dotenv').config();
const aiService = require('./utils/aiService');

async function testAIService() {
    console.log('🤖 Testing AI Service Configuration...\n');
    
    // Check configuration
    console.log('1. Checking AI Provider Configuration...');
    console.log(`   Provider: ${process.env.AI_PROVIDER || 'openai'}`);
    console.log(`   Primary model: ${process.env.OPENAI_MODEL || 'gpt-5.3-codex'}`);
    console.log(`   Backup model: ${process.env.OPENAI_FALLBACK_MODEL || 'gpt-5-mini'}`);
    
    if (process.env.AI_PROVIDER === 'openai' || !process.env.AI_PROVIDER) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && apiKey !== 'your-openai-api-key-here') {
            console.log('   ✅ OpenAI API Key: Configured');
            console.log(`   Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
        } else {
            console.log('   ❌ OpenAI API Key: Not configured');
            console.log('   Please add OPENAI_API_KEY to your .env file');
            process.exit(1);
        }
    } else if (process.env.AI_PROVIDER === 'anthropic') {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (apiKey && apiKey !== 'your-anthropic-api-key-here') {
            console.log('   ✅ Anthropic API Key: Configured');
        } else {
            console.log('   ❌ Anthropic API Key: Not configured');
            process.exit(1);
        }
    }
    
    // Test AI service with a simple query
    console.log('\n2. Testing AI Service Connection...');
    try {
        const response = await aiService.sendMessage(
            'Hello! Can you confirm you are working? Just reply with "Yes, I am working correctly."',
            {}
        );
        console.log('   ✅ AI Service Response:');
        console.log(`   ${response}`);
        console.log('\n✅ AI Service is working correctly!');
    } catch (error) {
        console.log('   ❌ AI Service Error:');
        console.log(`   ${error.message}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Details: ${JSON.stringify(error.response.data)}`);
        }
        process.exit(1);
    }
    
    process.exit(0);
}

testAIService().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

