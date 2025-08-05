export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // API routes
    if (url.pathname === '/api/chat') {
      try {
        // Only accept POST requests
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Parse the request body
        const { message, model = 'gemini' } = await request.json();
        
        // Call the appropriate AI API
        let response;
        if (model === 'openai') {
          response = await callOpenAI(message, env.OPENAI_API_KEY);
        } else if (model === 'gemini') {
          response = await callGemini(message, env.GEMINI_API_KEY);
        } else {
          return new Response(JSON.stringify({ error: 'Invalid model specified' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(response), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Serve frontend from GitHub Pages
    return fetch('https://smartburme.github.io/wayne-ai-assistant' + url.pathname);
  }
};

async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  return await response.json();
}

async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );
  return await response.json();
}
