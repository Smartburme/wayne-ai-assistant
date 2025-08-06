# WAYNE AI Assistant - Cloudflare Worker Implementation

![WAYNE AI Logo](public/assets/images/icon.png)

## Overview

WAYNE AI Assistant is a powerful conversational AI built on Cloudflare Workers, supporting multiple AI providers including OpenAI, Google Gemini, and Stability AI. This serverless implementation provides fast, scalable AI interactions with minimal latency.

## Key Features

- **Multi-AI Provider Support**: Switch between OpenAI, Gemini, and Stability AI
- **Serverless Architecture**: Deployed on Cloudflare's global network
- **Conversation History**: Persistent chat storage using KV namespaces
- **File Attachments**: Image handling via R2 storage
- **Real-time Streaming**: For responsive AI interactions

## Project Structure

```
wayne-ai-assistant/
├── public/                 # Static assets
│   ├── assets/
│   │   ├── images/         # App icons and images
│   │   └── styles/         # CSS files
│   ├── scripts/            # Compiled JavaScript
│   └── main.html           # Main application UI
├── src/
│   └── worker.js           # Cloudflare Worker logic
├── wrangler.toml           # Deployment configuration
├── package.json            # Project dependencies
└── README.md               # This file
```

## Prerequisites

- Cloudflare account
- Node.js v16+
- Wrangler CLI (`npm install -g wrangler`)

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Smartburme/wayne-ai-assistant.git
   cd wayne-ai-assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure secrets**:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put GEMINI_API_KEY 
   npx wrangler secret put STABILITY_API_KEY
   ```

4. **Configure bindings** (in wrangler.toml):
   ```toml
   kv_namespaces = [
     { binding = "CHAT_HISTORY", id = "your-kv-id" }
   ]
   
   r2_buckets = [
     { binding = "USER_FILES", bucket_name = "your-bucket-name" }
   ]
   ```

## Deployment

1. **Test locally**:
   ```bash
   npm run dev
   ```

2. **Deploy to production**:
   ```bash
   npm run deploy
   ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Main chat interface |
| `/api/history` | GET | Retrieve chat history |
| `/api/upload` | POST | File upload handler |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `STABILITY_API_KEY` | No | Stability AI API key |
| `ENV` | No | `production` or `development` |

## Development Workflow

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **View logs**:
   ```bash
   npx wrangler tail
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

## Troubleshooting

**Common Issues**:

1. **Missing Bindings**:
   - Verify bindings in wrangler.toml
   - Run `npx wrangler kv:namespace list` to check KV namespaces

2. **Authentication Errors**:
   - Confirm secrets are properly set
   - Rotate API keys if needed

3. **CORS Issues**:
   - Check `corsHeaders` in worker.js
   - Verify allowed origins

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For support or questions, please contact:
- Email: support@wayne-ai.com
- GitHub Issues: [https://github.com/Smartburme/wayne-ai-assistant/issues](https://github.com/Smartburme/wayne-ai-assistant/issues)
