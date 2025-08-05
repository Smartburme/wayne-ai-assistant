export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        if (url.pathname === '/api/chat') {
            if (request.method === 'POST') {
                try {
                    const body = await request.json();
                    const messages = body.messages || [];
                    
                    // Here you would typically call your AI API
                    // This is a mock response for demonstration
                    const response = {
                        response: "I'm WAYNE AI, your personal assistant. How can I help you today?"
                    };
                    
                    return new Response(JSON.stringify(response), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({ error: "Invalid request" }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            
            return new Response('Method not allowed', { status: 405 });
        }
        
        // Serve static files
        return env.ASSETS.fetch(request);
    }
};
