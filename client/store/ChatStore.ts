// src/store/ChatStore.ts
import { create } from 'zustand';
import apiClient from '../api/apiClient';
import NotificationService from '../services/NotificationService'; // ✅ ADD THIS IMPORT

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
  extractedMedicines?: ExtractedMedicine[];
}

interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  foodTiming: string;
  description?: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (text: string, imageUri?: string) => Promise<void>;
  clearChat: () => void;
  initializeChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  console.log("Initializing ChatStore...");
  
  return {
    messages: [],
    isLoading: false,
    error: null,

    initializeChat: () => {
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: "Hi! I'm MediBot, your medicine assistant. You can:\n\n• Upload a medicine bill/prescription\n• Ask about your medicine schedule\n• Mark medicines as taken or skipped\n• Get reminders about your medications\n\nHow can I help you today?",
        timestamp: new Date(),
      };
      set({ messages: [welcomeMessage] });
    },

    sendMessage: async (text: string, imageUri?: string) => {
      if (!text.trim() && !imageUri) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text.trim() || '[Image uploaded]',
        timestamp: new Date(),
        image: imageUri,
      };

      set((state) => ({
        messages: [...state.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      try {
        const formData = new FormData();
        
        // Add message text
        formData.append(
          'message',
          text.trim() || 'I uploaded a medicine bill. Can you analyze it?'
        );

        // Add conversation history (last 10 messages for context)
        // Only include role and content to reduce payload size
        const conversationHistory = get().messages
          .slice(-10)
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
        
        formData.append('conversationHistory', JSON.stringify(conversationHistory));

        console.log("➡️ Sending message:", {
          text: text.trim(),
          hasImage: !!imageUri,
          historyLength: conversationHistory.length,
        });

        // Add image if provided
        if (imageUri) {
          const uriParts = imageUri.split('.');
          const fileType = uriParts[uriParts.length - 1];

          const file = {
            uri: imageUri,
            name: `medicine-bill-${Date.now()}.${fileType}`,
            type: `image/${fileType}`,
          };

          formData.append('image', file as any);
        }

        // Make API request
        const response = await apiClient.post('/chat', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log("✅ Received response:", {
          hasMessage: !!response.data.message,
          hasToolResults: !!response.data.toolResults,
          hasExtractedMedicines: !!response.data.extractedMedicines,
        });

        // Create assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          extractedMedicines: response.data.extractedMedicines,
        };

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isLoading: false,
        }));

        // Log tool results if any
        if (response.data.toolResults) {
          console.log("🔧 Tools executed:", response.data.toolResults);
        }

        // ✅✅✅ ADD THIS SECTION - Schedule notifications if medicines were added ✅✅✅
        if (response.data.toolResults) {
          const addMedicineResult = response.data.toolResults.find(
            (tool: any) => tool.toolName === 'add_medicine'
          );

          if (addMedicineResult && addMedicineResult.result.success) {
            console.log('🎯 AI added medicines, scheduling notifications...');
            
            const addedMedicines = addMedicineResult.result.medicines
              .filter((m: any) => m.success)
              .map((m: any) => m.medicine);

            let successCount = 0;
            for (const med of addedMedicines) {
              try {
                await NotificationService.scheduleMedicineReminders(
                  med.name,
                  med.times,
                  med._id || med.id
                );
                successCount++;
                console.log(`✅ Scheduled notifications for ${med.name}`);
              } catch (error) {
                console.error(`❌ Failed to schedule notifications for ${med.name}:`, error);
              }
            }

            // Optionally add a system message to chat
            if (successCount > 0) {
              const notificationConfirmMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: `✅ Successfully scheduled ${successCount} reminder notification${successCount > 1 ? 's' : ''}!`,
                timestamp: new Date(),
              };

              set((state) => ({
                messages: [...state.messages, notificationConfirmMessage],
              }));
            }
          }
        }
        // ✅✅✅ END OF NOTIFICATION SCHEDULING SECTION ✅✅✅

      } catch (error: any) {
        console.error('❌ Error sending message:', error);
        console.error('Error response:', error.response?.data);
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, errorMessage],
          isLoading: false,
          error: error.response?.data?.error || error.message || 'Failed to send message',
        }));
      }
    },

    clearChat: () => {
      get().initializeChat();
    },
  };
});