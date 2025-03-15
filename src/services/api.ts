// API service for How2Build Assistant

// Define response structure
export interface ChatResponse {
    message: string;
    modelData?: any;
    steps?: any[];
    error?: boolean;
  }
  
  // Environment detection - fixed to avoid TypeScript error
  const isProduction = typeof import.meta.env !== 'undefined' ? import.meta.env.PROD : true;
  console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);
  
  export async function sendChatRequest(message: string): Promise<ChatResponse> {
    console.log(`Processing chat request`);
    
    try {
      // Always try to call the API
      return await callChatApi(message);
    } catch (error) {
      console.error('Error in chat processing:', error);
      
      // Return error message without default response
      return {
        message: `I'm sorry, I encountered an error processing your request. ${error instanceof Error ? error.message : 'Please try again later.'}`,
        error: true
      };
    }
  }
  
  // Function to call the actual API
  async function callChatApi(message: string): Promise<ChatResponse> {
    // Simple implementation if API service is missing
    console.log('Calling chat API endpoint');
    
    try {
      // Use the full URL to avoid relative path issues
      const apiUrl = window.location.origin + '/api/chat';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', response.status, errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }