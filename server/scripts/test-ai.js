// test-chat.js - Run this to test your chat endpoint
// Usage: node test-chat.js

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const API_URL = 'http://localhost:6000/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTY1NTNmNzUyOWNiNTE5MjRhNzIwYSIsImlhdCI6MTc2MTE1Nzk0MCwiZXhwIjoxNzYxMTU4ODQwfQ.wGULCNREdMARgE8pEkPPX2TY3OD_picZHlVD5KzDiP8'; // Replace with actual token from login

async function testTextMessage() {
  console.log('\n🧪 Test 1: Sending text message...\n');
  
  const formData = new FormData();
  formData.append('message', 'Hello, what can you help me with?');
  formData.append('conversationHistory', JSON.stringify([]));
  
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('Response:', data.message.substring(0, 100) + '...');
    } else {
      console.log('❌ Failed!');
      console.log('Error:', data);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

async function testImageUpload(imagePath) {
  console.log('\n🧪 Test 2: Uploading image...\n');
  
  if (!fs.existsSync(imagePath)) {
    console.log('❌ Image file not found:', imagePath);
    return;
  }
  
  const formData = new FormData();
  formData.append('message', 'Analyze this medicine bill');
  formData.append('conversationHistory', JSON.stringify([]));
  formData.append('image', fs.createReadStream(imagePath));
  
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('Response:', data.message.substring(0, 100) + '...');
      if (data.extractedMedicines) {
        console.log('Extracted medicines:', data.extractedMedicines.length);
      }
    } else {
      console.log('❌ Failed!');
      console.log('Error:', data);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

async function testScheduleQuery() {
  console.log('\n🧪 Test 3: Querying medicine schedule...\n');
  
  const formData = new FormData();
  formData.append('message', 'What medicines do I have scheduled?');
  formData.append('conversationHistory', JSON.stringify([]));
  
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('Response:', data.message.substring(0, 200) + '...');
    } else {
      console.log('❌ Failed!');
      console.log('Error:', data);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('🤖 Testing AI Chat Endpoint');
  console.log('='.repeat(50));
  
  if (TEST_TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('\n⚠️  Please update TEST_TOKEN in the script first!');
    console.log('Login to get a token, then update line 8.');
    return;
  }
  
  await testTextMessage();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testScheduleQuery();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Uncomment and provide image path to test
  // await testImageUpload('./test-prescription.jpg');
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests completed!');
  console.log('='.repeat(50) + '\n');
}

runTests();