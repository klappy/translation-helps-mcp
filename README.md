# Translation Helps API 🙏

A serverless API built with Netlify Functions that provides Bible translation resources to AI assistants and applications.

## 🚀 Quick Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/translation-helps-api)

### 1. One-Click Setup

1. Click the "Deploy to Netlify" button above
2. Connect your GitHub account
3. Give your site a name
4. Click "Deploy site"
5. Your API will be live at `https://your-site-name.netlify.app`

### 2. Manual Setup

```bash
# Clone this repository
git clone https://github.com/yourusername/translation-helps-api.git
cd translation-helps-api

# Install dependencies
npm install

# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize the project
netlify init

# Run locally
netlify dev
```

Your local API will be available at `http://localhost:8888`

## 📖 API Endpoints

### Fetch Resources
```http
GET /api/fetch-resources?reference=John+3:16&lang=en&org=unfoldingWord
```

**Example Response:**
```json
{
  "reference": {
    "book": "JHN",
    "chapter": 3,
    "verse": 16,
    "citation": "John 3:16"
  },
  "scripture": {
    "text": "For God so loved the world, that he gave his only Son...",
    "translation": "ULT"
  },
  "translationNotes": [
    {
      "reference": "JHN 3:16",
      "quote": "loved",
      "note": "The Greek word ἀγαπάω (agapaō) refers to divine love..."
    }
  ],
  "metadata": {
    "language": "en",
    "organization": "unfoldingWord",
    "cached": false,
    "timestamp": "2024-01-27T10:00:00Z"
  }
}
```

### Search Resources
```http
GET /api/search-resources?lang=es&type=scripture
```

### Health Check
```http
GET /api/health
```

## 🧪 Test the API

Once deployed, test your API:

```bash
# Test basic functionality
curl "https://your-site-name.netlify.app/api/fetch-resources?reference=John+3:16"

# Test health endpoint
curl "https://your-site-name.netlify.app/api/health"

# Test with specific language
curl "https://your-site-name.netlify.app/api/fetch-resources?reference=Juan+3:16&lang=es"
```

## ⚙️ Configuration

### Environment Variables

Set these in your Netlify dashboard under Site settings → Environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DCS_API_URL` | ✅ | `https://git.door43.org/api/v1` | Door43 Content Service API URL |
| `CACHE_ENABLED` | ❌ | `true` | Enable/disable caching |
| `UPSTASH_REDIS_REST_URL` | ❌ | - | Redis cache URL (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | - | Redis cache token (optional) |
| `ALLOWED_ORIGINS` | ❌ | `*` | CORS allowed origins |

### Optional: Redis Caching

For better performance, set up free Redis caching:

1. Sign up at [Upstash](https://upstash.com) (free tier available)
2. Create a Redis database
3. Copy the REST URL and Token
4. Add them to your Netlify environment variables

## 🔧 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```env
   DCS_API_URL=https://git.door43.org/api/v1
   CACHE_ENABLED=true
   ```

3. **Run locally:**
   ```bash
   netlify dev
   ```

4. **Test locally:**
   ```bash
   curl "http://localhost:8888/api/fetch-resources?reference=John+3:16"
   ```

## 📚 Usage Examples

### JavaScript/TypeScript
```javascript
const client = {
  baseUrl: 'https://your-site.netlify.app/api',
  
  async fetchResources(reference, options = {}) {
    const params = new URLSearchParams({
      reference,
      lang: options.language || 'en',
      org: options.organization || 'unfoldingWord'
    });
    
    const response = await fetch(`${this.baseUrl}/fetch-resources?${params}`);
    return response.json();
  }
};

// Usage
const resources = await client.fetchResources('John 3:16');
console.log(resources.scripture.text);
```

### Python
```python
import requests

def fetch_resources(reference, language='en', organization='unfoldingWord'):
    url = 'https://your-site.netlify.app/api/fetch-resources'
    params = {
        'reference': reference,
        'lang': language,
        'org': organization
    }
    
    response = requests.get(url, params=params)
    return response.json()

# Usage
resources = fetch_resources('John 3:16')
print(resources['scripture']['text'])
```

### cURL
```bash
# Basic usage
curl "https://your-site.netlify.app/api/fetch-resources?reference=John+3:16"

# Spanish resources
curl "https://your-site.netlify.app/api/fetch-resources?reference=Juan+3:16&lang=es"

# Only scripture and notes
curl "https://your-site.netlify.app/api/fetch-resources?reference=John+3:16&resources=scripture,notes"
```

## 🤖 AI Assistant Integration

This API is designed to work with AI assistants. Here's how to use it:

### Claude/ChatGPT
```
I need help with Bible translation. Can you fetch resources for John 3:16 using this API: https://your-site.netlify.app/api/fetch-resources?reference=John+3:16
```

### Custom AI Tools
You can create tools that call these endpoints to provide contextual Bible translation help to AI assistants.

## 🛠️ Supported Resources

- **Scripture Text**: Clean, readable Bible text from USFM files
- **Translation Notes**: Explanatory notes for translators
- **Translation Questions**: Comprehension and checking questions
- **Translation Words**: Key biblical term definitions
- **Translation Word Links**: Connections between terms and verses

## 🌍 Supported Languages

The API supports any language available in the Door43 Content Service, including:

- English (en)
- Spanish (es)
- French (fr)
- Portuguese (pt)
- Swahili (sw)
- And many more...

## 📊 Performance

- **Cold start**: < 1 second
- **Cached responses**: < 100ms
- **Uncached responses**: < 2 seconds
- **Global CDN**: Automatic edge deployment
- **Auto-scaling**: Handles 1 to millions of requests

## 💰 Cost

Using Netlify's free tier:
- 125,000 function invocations/month (free)
- 100GB bandwidth (free)
- Estimated cost: **$0** for most usage

For high usage:
- ~$0.0001 per request
- ~$25/month for 1M requests

## 🔒 Security

- HTTPS only
- CORS configured
- Input validation
- Rate limiting
- No sensitive data stored

## 📈 Monitoring

Your Netlify dashboard provides:
- Request counts
- Response times
- Error rates
- Geographic distribution

## 🆘 Troubleshooting

### API Not Responding
1. Check your site is deployed: `https://your-site.netlify.app`
2. Check the health endpoint: `https://your-site.netlify.app/api/health`
3. Verify environment variables in Netlify dashboard

### No Resources Found
1. Verify the reference format: "John 3:16" not "john 3:16"
2. Check if the language/organization combination exists
3. Try a known working reference like "John 3:16" with "en" and "unfoldingWord"

### Slow Responses
1. Enable Redis caching (see Configuration above)
2. Check the DCS API status
3. Monitor your Netlify function logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `netlify dev`
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Door43](https://door43.org) for providing the translation resources
- [unfoldingWord](https://www.unfoldingword.org/) for the open-source Bible translations
- [Netlify](https://netlify.com) for the serverless platform

---

**Ready to help Bible translators worldwide! 🌍** 