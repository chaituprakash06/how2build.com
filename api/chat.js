// Vercel Serverless Function for How2Build's chat API

export default async function handler(req, res) {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'ok' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed, only POST requests are accepted', 
      error: true 
    });
  }

  try {
    // Get the message from the request body
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        message: 'Message is required', 
        error: true 
      });
    }

    // For now, let's use a mock response to verify functionality
    // This eliminates dependency on OpenAI API key issues
    if (message.toLowerCase().includes('tap') || message.toLowerCase().includes('broken tap') || message.toLowerCase().includes('fix tap')) {
      return res.status(200).json(mockTapResponse());
    } else {
      return res.status(200).json({ 
        message: "I understand you're having a home repair issue. Could you please provide more details specifically about a faucet, tap, sink, or other fixture you need help with?",
      });
    }

    /* Uncomment this for real API integration
    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    // If no API key, return error
    if (!apiKey) {
      return res.status(500).json({ 
        message: 'API key not configured. Please contact the administrator.', 
        error: true 
      });
    }

    // Call the OpenAI API
    console.log('Calling LLM API with message:', message);
    const completion = await callLLM(message, apiKey);
    
    // Parse the response and return it
    const parsedResponse = parseResponse(completion);
    
    // If parsing failed
    if (parsedResponse.error) {
      return res.status(500).json(parsedResponse);
    }
    
    return res.status(200).json(parsedResponse);
    */
  } catch (error) {
    console.error('Error processing chat request:', error);
    return res.status(500).json({ 
      message: `Error processing your request: ${error.message}`, 
      error: true 
    });
  }
}

// Function to generate mock tap repair response
function mockTapResponse() {
  return {
    message: "I understand you're having an issue with a broken tap. Let me help you fix it with these step-by-step instructions.",
    modelData: {
      objectType: 'tap',
      color: 0xc0c0c0,
      dimensions: { radius: 0.5, height: 2 },
      parts: [
        {
          type: 'handle',
          name: 'left_handle',
          color: 0xbbbbbb,
          position: { x: -0.8, y: 0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          type: 'handle',
          name: 'right_handle',
          color: 0xbbbbbb,
          position: { x: 0.8, y: 0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          type: 'spout',
          name: 'spout',
          radius: 0.2,
          length: 1.5,
          color: 0xc0c0c0,
          position: { x: 0, y: 0.5, z: 0.5 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 }
        }
      ]
    },
    steps: [
      {
        title: "Turn Off Water Supply",
        description: "First, locate and shut off the water supply valves beneath the sink.",
        modelState: {
          rotation: [0, 0, 0],
          highlightParts: ['base']
        }
      },
      {
        title: "Remove Handle",
        description: "Using a screwdriver, carefully remove the handle cap and unscrew the handle.",
        modelState: {
          rotation: [0, 0.5, 0],
          highlightParts: ['left_handle']
        }
      },
      {
        title: "Replace Washer",
        description: "Inspect and replace the worn-out washer with a new one of the same size.",
        modelState: {
          rotation: [0, 0, 0],
          highlightParts: ['left_handle']
        }
      },
      {
        title: "Reassemble and Test",
        description: "Reassemble the tap, turn the water back on, and check for leaks.",
        modelState: {
          rotation: [0, 0, 0],
          highlightParts: []
        }
      }
    ]
  };
}

// These functions can be uncommented later when using the real OpenAI API
/*
// Function to call OpenAI API
async function callLLM(message, apiKey) {
  const openaiUrl = 'https://api.openai.com/v1/chat/completions';
  
  const promptTemplate = `
You are an assistant that provides helpful home repair guidance with 3D visualization.
The user has a home repair issue. Your task is to:
1. Identify the specific home item they're referring to
2. Create a detailed 3D model description that can be visualized
3. Provide step-by-step repair instructions

The response should be formatted as valid JSON with the following structure:
{
  "message": "Your helpful explanation here",
  "modelData": {
    "objectType": "tap|sink|toilet|etc", 
    "color": 0xc0c0c0,
    "dimensions": { "radius": 0.5, "height": 2 },
    "parts": [
      {
        "type": "handle|spout|etc",
        "name": "unique_name",
        "color": 0xbbbbbb,
        "position": { "x": 0, "y": 0, "z": 0 },
        "rotation": { "x": 0, "y": 0, "z": 0 }
      }
    ]
  },
  "steps": [
    {
      "title": "Step Title",
      "description": "Step instruction",
      "modelState": {
        "rotation": [0, 0, 0],
        "highlightParts": ["part_name"],
        "hideParts": []
      }
    }
  ]
}

If you cannot understand the user's query or it's not about a home repair issue, respond with a message asking for clarification without providing any default 3D model.

USER ISSUE: ${message}
`;

  try {
    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // or your preferred model
        messages: [{ role: 'user', content: promptTemplate }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Function to parse LLM JSON response
function parseResponse(completion) {
  try {
    // Try to parse the response as JSON
    const result = JSON.parse(completion);
    
    // Validate essential fields
    if (!result.message) {
      return {
        message: 'Invalid response format from LLM, missing message field',
        error: true
      };
    }
    
    // For non-repair responses (when LLM determines query isn't about repairs)
    if (!result.modelData) {
      // This is acceptable - the LLM might just respond with a text message
      // if the query wasn't about home repairs
      return {
        message: result.message
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing LLM response as JSON:', error);
    return {
      message: 'Error parsing LLM response. Please try rephrasing your question.',
      error: true
    };
  }
}
*/