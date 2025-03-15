// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).end();
    }
  
    try {
      const { message } = req.body;
      
      // API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a home repair assistant that provides step-by-step guidance with 3D visualizations.
              Respond with JSON in this format:
              {
                "message": "Human-readable message",
                "modelData": {
                  "objectType": "tap/pipe/etc",
                  "parts": [
                    {"type": "handle", "position": {"x": 0, "y": 0, "z": 0}, "color": "0xff0000", "name": "hotHandle"}
                  ]
                },
                "steps": [
                  {
                    "title": "Step title",
                    "description": "Step description",
                    "modelState": {
                      "rotation": [0, 0, 0],
                      "highlightParts": ["hotHandle"],
                      "hideParts": []
                    }
                  }
                ]
              }`
            },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });
      
      const responseData = await response.json();
      
      // Parse the content from the assistant
      try {
        const content = responseData.choices[0].message.content;
        const parsedContent = JSON.parse(content);
        return res.status(200).json(parsedContent);
      } catch (e) {
        console.error('Error parsing response:', e);
        return res.status(500).json({ 
          message: 'I had trouble processing that. Could you rephrase your question?'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ 
        message: 'Something went wrong. Please try again later.'
      });
    }
  }