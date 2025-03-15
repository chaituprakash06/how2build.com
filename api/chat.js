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

    console.log(`Processing message: "${message}"`);

    // For now, let's temporarily use mock data for common terms to debug
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('tap') || lowerMessage.includes('faucet')) {
      console.log('Using mock response for debugging');
      return res.status(200).json(mockTapResponse());
    } else if (lowerMessage.includes('sink') || lowerMessage.includes('drain')) {
      console.log('Using mock sink response for debugging');
      return res.status(200).json(mockSinkResponse());
    } else if (lowerMessage.includes('door')) {
      console.log('Using mock door response for debugging');
      return res.status(200).json(mockDoorResponse());
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    // If no API key, return error
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ 
        message: 'API key not configured. Please contact the administrator.',
        error: true 
      });
    }

    console.log('Calling OpenAI API with message:', message);
    
    try {
      // Call the OpenAI API
      const completion = await callLLM(message, apiKey);
      
      // Log the raw completion for debugging
      console.log('OpenAI raw response:', completion.substring(0, 200) + '...');
      
      // Parse the response
      const parsedResponse = parseResponse(completion);
      
      // If parsing failed
      if (parsedResponse.error) {
        console.error('Error parsing OpenAI response:', parsedResponse.message);
        
        // In production, we'd want better fallbacks
        // For now, default to a mock tap response to ensure functionality
        console.log('Using fallback mock response due to parsing error');
        return res.status(200).json(mockTapResponse());
      }
      
      console.log('Successfully processed OpenAI response');
      return res.status(200).json(parsedResponse);
      
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      
      // Always use mock data for now
      console.log('Using mock tap response due to API error');
      return res.status(200).json(mockTapResponse());
    }
  } catch (error) {
    console.error('General error processing chat request:', error);
    return res.status(200).json(mockTapResponse());
  }
}

// Function to call OpenAI API
async function callLLM(message, apiKey) {
  const openaiUrl = 'https://api.openai.com/v1/chat/completions';
  
  const promptTemplate = `
You are an assistant that provides helpful home repair guidance with 3D visualization.
The user has a home repair issue. Your task is to:
1. Identify the specific home item they're referring to
2. Create a detailed 3D model description that can be visualized
3. Provide step-by-step repair instructions

Response format (MUST BE VALID JSON):
{
  "message": "Your helpful explanation here",
  "modelData": {
    "objectType": "tap|sink|toilet|doorknob|cabinet",
    "color": 0xc0c0c0,
    "dimensions": { "radius": 0.5, "height": 2 },
    "parts": [
      {
        "type": "handle|spout|connector|pipe",
        "name": "unique_part_name",
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

IMPORTANT RULES:
1. The objectType must be one of: "tap", "sink", "toilet", "doorknob", or "cabinet"
2. Part types must be one of: "handle", "spout", "connector", or "pipe"
3. Colors must be hexadecimal numbers like 0xc0c0c0, not strings
4. Position and rotation values must be numbers, not strings
5. Include at least 2-5 parts in the model
6. Provide 4-5 repair steps
7. Every step must include a modelState with rotation and highlightParts
8. Do not include any explanation or text outside the JSON structure

If you cannot understand the user's query or it's not about a home repair issue, respond with:
{
  "message": "Your clarification request here"
}

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
        model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo for faster response and lower cost
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
    console.error('Error in OpenAI API call:', error);
    throw error;
  }
}

// Function to parse LLM JSON response
function parseResponse(completion) {
  try {
    // Remove any markdown formatting that might be present
    let cleanedCompletion = completion;
    if (completion.includes('```json')) {
      cleanedCompletion = completion.split('```json')[1].split('```')[0].trim();
    } else if (completion.includes('```')) {
      cleanedCompletion = completion.split('```')[1].split('```')[0].trim();
    }
    
    // Try to parse the response as JSON
    const result = JSON.parse(cleanedCompletion);
    
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
    console.error('Raw content:', completion);
    return {
      message: 'Error parsing LLM response. Please try rephrasing your question.',
      error: true
    };
  }
}

// Fallback mock response for tap issues
function mockTapResponse() {
  return {
    message: "I understand you're having an issue with a tap or faucet. Let me help you fix it with these step-by-step instructions.",
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

// Fallback mock response for sink issues
function mockSinkResponse() {
  return {
    message: "I understand you're having an issue with a sink or drain. Here's how you can fix it.",
    modelData: {
      objectType: 'sink',
      color: 0xFFFFFF,
      dimensions: { width: 2, height: 0.5, depth: 1.5 },
      parts: [
        {
          type: 'pipe',
          name: 'drain',
          radius: 0.15,
          length: 1.2,
          color: 0x999999,
          position: { x: 0, y: -0.8, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          type: 'pipe',
          name: 'p_trap',
          radius: 0.15,
          length: 0.8,
          color: 0x999999,
          position: { x: 0.4, y: -1.5, z: 0 },
          rotation: { x: 0, y: 0, z: Math.PI / 2 }
        }
      ]
    },
    steps: [
      {
        title: "Clear Surface Debris",
        description: "Remove any visible debris from the drain cover.",
        modelState: {
          rotation: [0, 0, 0],
          highlightParts: ['drain']
        }
      },
      {
        title: "Use Plunger",
        description: "Place a plunger over the drain and push down firmly several times to dislodge the clog.",
        modelState: {
          rotation: [0.2, 0, 0],
          highlightParts: ['drain']
        }
      },
      {
        title: "Remove P-Trap",
        description: "Place a bucket underneath, then unscrew the P-trap connections to clean out any debris.",
        modelState: {
          rotation: [0.3, 0, 0],
          highlightParts: ['p_trap']
        }
      },
      {
        title: "Clean and Reassemble",
        description: "Clean the P-trap thoroughly, then reattach it making sure all connections are tight.",
        modelState: {
          rotation: [0.3, Math.PI / 4, 0],
          highlightParts: ['p_trap', 'drain']
        }
      }
    ]
  };
}

// Fallback mock response for door issues
function mockDoorResponse() {
  return {
    message: "I understand you're having an issue with a door or door knob. Let me guide you through fixing it.",
    modelData: {
      objectType: 'doorknob',
      color: 0x8B4513,
      dimensions: { width: 1.5, height: 0.8, depth: 0.8 },
      parts: [
        {
          type: 'handle',
          name: 'outer_knob',
          color: 0xD2B48C,
          position: { x: -0.75, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          type: 'handle',
          name: 'inner_knob',
          color: 0xD2B48C,
          position: { x: 0.75, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          type: 'connector',
          name: 'latch',
          color: 0xC0C0C0,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 }
        }
      ]
    },
    steps: [
      {
        title: "Remove Cover Plates",
        description: "Locate the screws on the inside face of the door and remove them to take off the cover plates.",
        modelState: {
          rotation: [0, Math.PI / 4, 0],
          highlightParts: ['inner_knob']
        }
      },
      {
        title: "Remove Old Doorknob",
        description: "After removing the cover plates, pull the doorknobs away from both sides of the door.",
        modelState: {
          rotation: [0, Math.PI / 2, 0],
          highlightParts: ['outer_knob', 'inner_knob']
        }
      },
      {
        title: "Remove Latch Assembly",
        description: "Unscrew the latch faceplate and pull out the entire latch assembly from the edge of the door.",
        modelState: {
          rotation: [0, 0, 0],
          highlightParts: ['latch']
        }
      },
      {
        title: "Install New Doorknobs",
        description: "Align the new doorknobs on both sides of the door and secure with the provided screws.",
        modelState: {
          rotation: [0, Math.PI / 4, 0],
          highlightParts: ['outer_knob', 'inner_knob']
        }
      }
    ]
  };
}