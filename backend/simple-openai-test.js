// simple-openai-test.js

require('dotenv').config();
const OpenAI = require('openai');

// Create OpenAI client using your env key
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

(async () => {
  try {
    console.log("OPENAI_API_KEY present in Node?", !!process.env.OPENAI_API_KEY);

    // Simple request: list models
    const response = await client.models.list();

    console.log("✅ Node successfully talked to OpenAI.");
    console.log("Some models:", response.data.slice(0, 5).map(m => m.id));
  } catch (err) {
    console.error("❌ Error talking to OpenAI from Node:");
    console.error("Status:", err.status);
    console.error("Message:", err.message);
    if (err.response?.data) {
      console.error("Details:", err.response.data);
    }
  }
})();
