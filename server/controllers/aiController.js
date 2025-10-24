import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import fs from 'fs';
import Medicine from '../models/Medicine.js';

// Initialize Gemini model
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-exp',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
});

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are MediBot, a helpful medical assistant that helps users manage their medicine schedules. 

Your capabilities:
1. Analyze uploaded medicine bills/prescriptions to extract medicine information
2. Answer questions about medicine schedules
3. Add medicines to schedules (only after user confirmation)
4. Mark medicines as taken or skipped
5. Provide medication reminders and information

CRITICAL INSTRUCTIONS FOR ADDING MEDICINES:
When a user wants to add a medicine, you MUST respond with a special JSON command that will be parsed and executed.

COMMAND FORMAT:
When user confirms adding a medicine with phrases like:
- "add it"
- "I confirm"
- "yes"
- "schedule it"
- "add them"

You MUST respond with EXACTLY this format:
{
  "action": "add_medicine",
  "medicines": [
    {
      "name": "Medicine Name",
      "dosage": "amount",
      "frequency": "once daily/twice daily/etc",
      "times": ["09:00", "21:00"],
      "foodTiming": "before/after/with/anytime",
      "description": "additional notes"
    }
  ],
  "confirmation_message": "Your friendly confirmation message here"
}

WHEN USER ASKS ABOUT THEIR MEDICINES:
If user asks questions like:
- "What medicines do I have?"
- "Show my schedule"
- "Do you know my medicines?"
- "What meds am I taking?"

You MUST respond with:
{
  "action": "get_schedule",
  "confirmation_message": "Let me check your medicine schedule..."
}

EXAMPLE CONVERSATION:
User: "Add aspirin 2.5mg at 9am after lunch and I confirm it"
You MUST respond with:
{
  "action": "add_medicine",
  "medicines": [
    {
      "name": "Aspirin",
      "dosage": "2.5mg",
      "frequency": "once daily",
      "times": ["09:00"],
      "foodTiming": "after",
      "description": "Take after lunch"
    }
  ],
  "confirmation_message": "Got it! I'm adding Aspirin 2.5mg at 9:00 AM (after lunch) to your schedule."
}

RULES:
- If user mentions medicine details AND confirms in the same message, output the JSON command immediately
- If user only asks to add without details, ask for details first (normal text response)
- If user provides details but doesn't confirm, ask for confirmation (normal text response)
- Always use 24-hour format for times (e.g., "09:00", "14:00", "21:00")
- Default to "once daily" if frequency unclear
- Default to "anytime" for foodTiming if not specified
- Current date/time: ${new Date().toLocaleString()}

FOR NON-MEDICINE-ADDING RESPONSES:
Just respond normally with text. Only use the JSON format when actually adding medicines.`;

// Parse medicine bill image using Gemini Vision
const analyzeMedicineBill = async (imagePath) => {
  try {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    // Use the same model instance with vision capabilities
    const visionModel = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-exp',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.3, // Lower temperature for more accurate OCR
    });

    const message = new HumanMessage({
      content: [
        {
          type: 'text',
          text: `Analyze this medicine bill/prescription image and extract the following information for each medicine:
- Medicine name
- Dosage (amount per dose)
- Frequency (how many times per day)
- Timing (suggested times to take, in 24-hour format like "08:00", "14:00", "20:00")
- Food timing (before/after/with food, or anytime if not specified)
- Any special instructions

Format your response as a JSON array of medicines. Example:
[
  {
    "name": "Paracetamol",
    "dosage": "500mg",
    "frequency": "twice daily",
    "times": ["08:00", "20:00"],
    "foodTiming": "after",
    "description": "Take after meals for 5 days"
  }
]

If you cannot clearly read the information, respond with an empty array and explain what's unclear.`,
        },
        {
          type: 'image_url',
          image_url: `data:image/jpeg;base64,${base64Image}`,
        },
      ],
    });

    console.log('🖼️ Analyzing image with Gemini Vision...');
    const response = await visionModel.invoke([message]);
    console.log('📸 Vision response received:', response.content.substring(0, 200));
    
    // Extract JSON from response
    const content = response.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const medicines = JSON.parse(jsonMatch[0]);
      console.log('💊 Extracted medicines:', medicines.length);
      return medicines;
    }
    
    console.log('⚠️ Could not parse JSON from vision response');
    return { error: 'Could not parse medicine information from image', rawResponse: content };
  } catch (error) {
    console.error('❌ Error analyzing medicine bill:', error);
    console.error('Error stack:', error.stack);
    return { error: error.message };
  }
};

// Execute medicine addition
const addMedicines = async (userId, medicines) => {
  const results = [];
  
  for (const med of medicines) {
    try {
      const newMedicine = new Medicine({
        user: userId,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        times: med.times,
        foodTiming: med.foodTiming || 'anytime',
        description: med.description || '',
        history: []
      });
      
      const savedMedicine = await newMedicine.save();
      results.push({
        success: true,
        medicine: savedMedicine,
        name: med.name
      });
    } catch (error) {
      results.push({
        success: false,
        name: med.name,
        error: error.message
      });
    }
  }
  
  return results;
};

// Main chat handler
export const handleChat = async (req, res) => {
  try {
    const message = req.body?.message || '';
    const conversationHistory = req.body?.conversationHistory 
      ? JSON.parse(req.body.conversationHistory) 
      : [];
    
    const userId = req.user.id;
    const imageFile = req.file;

    console.log('Chat request:', { 
      hasMessage: !!message, 
      hasImage: !!imageFile, 
      userId,
      conversationHistoryLength: conversationHistory.length,
      message: message.substring(0, 100)
    });

    let userMessage = message;
    let extractedMedicines = null;

    // If image is uploaded, analyze it first
    if (imageFile) {
      console.log('Analyzing uploaded medicine bill...');
      extractedMedicines = await analyzeMedicineBill(imageFile.path);
      
      // Delete the temporary file
      fs.unlinkSync(imageFile.path);

      if (extractedMedicines.error) {
        userMessage += `\n\n[Image uploaded but analysis failed: ${extractedMedicines.error}]`;
      } else if (Array.isArray(extractedMedicines) && extractedMedicines.length > 0) {
        userMessage += `\n\n[Medicine bill analyzed. Found ${extractedMedicines.length} medicine(s): ${extractedMedicines.map(m => m.name).join(', ')}]`;
      } else {
        userMessage += '\n\n[Image uploaded but no medicines detected clearly]';
      }
    }

    // Build conversation messages for LangChain
    const messages = [];
    
    // Build system prompt with extracted medicines context if available
    let systemPrompt = SYSTEM_PROMPT;
    if (extractedMedicines && Array.isArray(extractedMedicines) && extractedMedicines.length > 0) {
      systemPrompt += `\n\nCONTEXT: The user just uploaded a medicine bill. I analyzed it and found:\n${JSON.stringify(extractedMedicines, null, 2)}\n\nPresent these medicines to the user in a friendly way and ask if they want to add them to their schedule. If they confirm, use the JSON command format to add them.`;
    }
    
    // Add system prompt (MUST be first for Gemini)
    messages.push(new SystemMessage(systemPrompt));

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)));
      } else {
        messages.push(new AIMessage(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)));
      }
    }

    // Add current user message
    messages.push(new HumanMessage(userMessage));

    console.log('📤 Sending to AI:', messages.length, 'messages');

    // Get AI response
    const response = await model.invoke(messages);
    const aiContent = response.content;

    console.log('📥 AI Response:', aiContent.substring(0, 200));

    // Check if AI wants to add medicines (JSON command format)
    let commandMatch = aiContent.match(/\{[\s\S]*"action"\s*:\s*"(add_medicine|get_schedule)"[\s\S]*\}/);
    
    if (commandMatch) {
      console.log('🔧 Detected command');
      
      try {
        const command = JSON.parse(commandMatch[0]);
        
        // Handle add_medicine command
        if (command.action === 'add_medicine' && command.medicines) {
          console.log('💊 Adding medicines:', command.medicines.map(m => m.name));
          
          const addResults = await addMedicines(userId, command.medicines);
          const successCount = addResults.filter(r => r.success).length;
          const failCount = addResults.filter(r => !r.success).length;
          
          console.log('✅ Added:', successCount, 'Failed:', failCount);
          
          let responseMessage = command.confirmation_message || "I've added the medicine(s) to your schedule!";
          
          if (failCount > 0) {
            const failedNames = addResults.filter(r => !r.success).map(r => r.name).join(', ');
            responseMessage += `\n\n⚠️ However, I couldn't add: ${failedNames}`;
          }
          
          return res.json({
            message: responseMessage,
            toolResults: [{
              toolName: 'add_medicine',
              result: {
                success: successCount > 0,
                addedCount: successCount,
                failedCount: failCount,
                medicines: addResults
              }
            }],
            extractedMedicines: extractedMedicines && Array.isArray(extractedMedicines) ? extractedMedicines : null,
          });
        }
        
        // Handle get_schedule command
        if (command.action === 'get_schedule') {
          console.log('📋 Fetching medicine schedule');
          
          const medicines = await Medicine.find({ user: userId }).sort({ createdAt: -1 });
          
          console.log('📊 Found medicines:', medicines.length);
          
          let responseMessage = '';
          
          if (medicines.length === 0) {
            responseMessage = "You don't have any medicines in your schedule yet. Would you like to add some?";
          } else {
            responseMessage = `Here are your current medicines:\n\n`;
            
            medicines.forEach((med, index) => {
              responseMessage += `${index + 1}. **${med.name}**\n`;
              responseMessage += `   📊 Dosage: ${med.dosage}\n`;
              responseMessage += `   🔄 Frequency: ${med.frequency}\n`;
              responseMessage += `   🕐 Times: ${med.times.join(', ')}\n`;
              responseMessage += `   🍽️ Food timing: ${med.foodTiming}\n`;
              if (med.description) {
                responseMessage += `   📝 Note: ${med.description}\n`;
              }
              responseMessage += '\n';
            });
          }
          
          return res.json({
            message: responseMessage,
            toolResults: [{
              toolName: 'get_schedule',
              result: {
                success: true,
                count: medicines.length,
                medicines: medicines
              }
            }],
          });
        }
        
      } catch (parseError) {
        console.error('❌ Failed to parse command:', parseError);
        // Fall through to normal response
      }
    }

    // Normal response (no command detected)
    return res.json({
      message: aiContent,
      extractedMedicines: extractedMedicines && Array.isArray(extractedMedicines) ? extractedMedicines : null,
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
};