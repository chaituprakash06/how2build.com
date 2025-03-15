// API service for How2Build Assistant

// Define response structure
export interface ChatResponse {
    message: string;
    modelData?: any;
    steps?: any[];
    error?: boolean;
  }
  
  // Environment detection
  const isProduction = import.meta.env.PROD;
  const isLocalDev = !isProduction;
  
  export async function sendChatRequest(message: string): Promise<ChatResponse> {
    console.log(`Processing chat request in ${isProduction ? 'production' : 'development'} mode`);
    
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
    console.log('Calling chat API endpoint');
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the response contains an error
    if (data.error) {
      throw new Error(data.message || 'Unknown error from API');
    }
    
    return data;
  }