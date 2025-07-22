# Translation Helps API - Example Applications

This directory contains comprehensive example applications demonstrating integration with the unfoldingWord Translation Helps API. These examples showcase different use cases, technology stacks, and implementation patterns for building Bible translation tools that support Mother Tongue Translators.

## 📚 Available Examples

### 🌐 [React Bible Translation App](./react-bible-app/)
**Technology**: React 18, JavaScript, CSS  
**Use Case**: Web application for Bible translation  
**Target Users**: Mother Tongue Translators, translation teams, web developers  

**Features**:
- Dual translation display (ULT/GLT and UST/GST)
- Interactive translation helps (notes, words, questions)
- Strategic Language selector with resource indicators
- Smart search with auto-complete
- Performance monitoring dashboard
- Mobile-responsive design
- Error boundaries and graceful degradation

**Key Demonstrations**:
- Client-side caching strategies
- Real-time performance tracking
- Responsive UI design patterns
- Error handling best practices
- API integration with React hooks

### 🖥️ [Node.js CLI Tool](./nodejs-cli-tool/)
**Technology**: Node.js, Commander.js, Chalk  
**Use Case**: Command-line interface for translation work  
**Target Users**: Developers, power users, automation scripts  

**Features**:
- Comprehensive command structure for all API endpoints
- Multiple output formats (text, JSON, Markdown, CSV)
- Intelligent caching (memory + file)
- Bulk download capabilities
- Export tools for study guides and translation kits
- Interactive mode for guided usage
- Configuration management

**Key Demonstrations**:
- Server-side API integration
- File system caching
- CLI design patterns
- Batch processing
- Export functionality

## 🚀 Quick Start Guide

### Choose Your Path

**🎯 New to Translation Tools?**
Start with the [React Bible App](./react-bible-app/) - it provides a visual interface that's easy to understand and explore.

**💻 Developer/Technical User?**
Try the [CLI Tool](./nodejs-cli-tool/) - it offers powerful automation capabilities and is great for integration with existing workflows.

**🏗️ Building Your Own App?**
Review both examples to understand different implementation approaches, then adapt the patterns to your specific technology stack.

### Installation Priority

1. **React App** (Visual learners, web developers)
2. **CLI Tool** (Command-line users, automation needs)

## 🏗️ Implementation Patterns

### API Integration Patterns

**React Pattern - Service Layer**:
```javascript
// Centralized API service with caching
class TranslationAPI {
  async fetchScripture(reference, language) {
    // Check cache first
    const cached = this.getCachedData(key);
    if (cached) return cached;
    
    // Make API request
    const response = await fetch(this.buildURL(endpoint, params));
    
    // Cache and return
    this.setCachedData(key, response.data);
    return response.data;
  }
}
```

**CLI Pattern - Request with Retry**:
```javascript
// Node.js with retry logic and file caching
async request(endpoint, params) {
  // Try memory cache
  let data = this.memoryCache.get(key);
  if (data) return data;
  
  // Try file cache
  data = await this.getFromFileCache(key);
  if (data) return data;
  
  // API request with retry
  return this.makeRequestWithRetry(endpoint, params);
}
```

### Error Handling Patterns

**React Pattern - Error Boundaries**:
```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    this.reportError(error, errorInfo);
    this.setState({ hasError: true });
  }
  
  render() {
    if (this.state.hasError) {
      return <FallbackUI onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

**CLI Pattern - Graceful Failures**:
```javascript
async function scriptureCommand(reference, options) {
  const spinner = ora('Fetching Scripture...').start();
  
  try {
    const data = await api.fetchScripture(reference);
    spinner.succeed('Scripture retrieved');
    displayScripture(data, options);
  } catch (error) {
    spinner.fail('Failed to fetch Scripture');
    console.error(chalk.red(error.message));
    suggestAlternatives(error);
    process.exit(1);
  }
}
```

### Caching Strategies

**Client-Side (React)**:
- Memory cache with TTL
- localStorage for persistence
- Request deduplication
- Background refresh

**Server-Side (CLI)**:
- In-memory cache (node-cache)
- File system cache
- Cache invalidation strategies
- Configurable cache directories

### Performance Optimization

**React Optimizations**:
- Component memoization with React.memo
- Custom hooks for data fetching
- Lazy loading for large components
- Performance monitoring hooks

**CLI Optimizations**:
- Parallel API requests
- Stream processing for large datasets
- Progress indicators for user feedback
- Configurable timeouts and retries

## 📊 Feature Comparison

| Feature | React App | CLI Tool | Notes |
|---------|-----------|----------|-------|
| Scripture Display | ✅ Visual | ✅ Text | React shows side-by-side ULT/UST |
| Translation Notes | ✅ Tabbed UI | ✅ Formatted | Both support multiple formats |
| Word Lookup | ✅ Click words | ✅ Command | React has interactive clicking |
| Language Selection | ✅ Dropdown | ✅ Flag option | React shows flags and coverage |
| Caching | ✅ Browser | ✅ File system | Different persistence strategies |
| Offline Support | ⚠️ Limited | ✅ Full | CLI has comprehensive offline mode |
| Export Formats | ❌ | ✅ Multiple | CLI supports PDF, HTML, Markdown |
| Batch Operations | ❌ | ✅ Yes | CLI designed for bulk processing |
| Mobile Support | ✅ Responsive | ❌ | React optimized for mobile |
| Integration | ✅ Web | ✅ Scripts | Different integration contexts |

## 🛠️ Technology Integration

### Frontend Frameworks

**React Integration** ✅ (Example provided)
```javascript
import { TranslationAPI } from './services/TranslationAPI';
const api = new TranslationAPI();
const scripture = await api.fetchScripture('John 3:16');
```

**Vue.js Integration** (Pattern)
```javascript
// Similar service-based approach
import { translationAPI } from '@/services/translation';
export default {
  async created() {
    this.scripture = await translationAPI.fetchScripture(this.reference);
  }
}
```

**Angular Integration** (Pattern)
```typescript
// Service with dependency injection
@Injectable()
export class TranslationService {
  constructor(private http: HttpClient) {}
  
  fetchScripture(reference: string): Observable<ScriptureResponse> {
    return this.http.get<ScriptureResponse>(`/api/fetch-scripture?reference=${reference}`);
  }
}
```

### Backend Integration

**Node.js Integration** ✅ (Example provided)
```javascript
const TranslationAPI = require('./lib/TranslationAPI');
const api = new TranslationAPI();
const data = await api.getComprehensiveHelps('Romans 8:28');
```

**Python Integration** (Pattern)
```python
import requests

class TranslationAPI:
    def fetch_scripture(self, reference, language='en'):
        response = requests.get(f'{self.base_url}/api/fetch-scripture', 
                              params={'reference': reference, 'language': language})
        return response.json()
```

**PHP Integration** (Pattern)
```php
class TranslationAPI {
    public function fetchScripture($reference, $language = 'en') {
        $url = $this->baseUrl . '/api/fetch-scripture?' . http_build_query([
            'reference' => $reference,
            'language' => $language
        ]);
        return json_decode(file_get_contents($url), true);
    }
}
```

## 🎯 Use Case Scenarios

### Scenario 1: Web-Based Translation Platform
**Recommended**: React Bible App  
**Why**: Visual interface, real-time collaboration features, mobile support  
**Extensions**: Add user authentication, team management, version control

### Scenario 2: Translation Workflow Automation
**Recommended**: CLI Tool  
**Why**: Scriptable, batch operations, multiple export formats  
**Extensions**: CI/CD integration, automated quality checks, report generation

### Scenario 3: Mobile Translation App
**Recommended**: React App (with React Native adaptation)  
**Why**: Component reusability, offline caching patterns  
**Extensions**: Offline-first architecture, sync capabilities

### Scenario 4: Desktop Translation Software
**Recommended**: CLI Tool (with Electron wrapper)  
**Why**: File system access, local caching, export capabilities  
**Extensions**: Native UI, drag-and-drop, printing support

### Scenario 5: API Gateway/Proxy
**Recommended**: Node.js patterns from CLI Tool  
**Why**: Server-side caching, request aggregation, rate limiting  
**Extensions**: Authentication, analytics, custom endpoints

## 🔧 Development Guidelines

### Code Quality Standards
- **ESLint/Prettier**: Consistent code formatting
- **Error Handling**: Comprehensive try-catch with user-friendly messages
- **Testing**: Unit tests for API interactions, integration tests for workflows
- **Documentation**: Inline comments for complex logic, README for setup

### Performance Standards
- **Response Time**: < 2 seconds for most operations
- **Cache Hit Rate**: > 70% for optimal performance
- **Error Rate**: < 1% under normal conditions
- **Memory Usage**: Reasonable limits for client applications

### Security Considerations
- **Input Validation**: Sanitize all user inputs
- **API Security**: HTTPS only, proper error messages
- **Caching**: Don't cache sensitive information
- **Dependencies**: Regular security updates

## 📚 Learning Path

### Beginner Path
1. **Explore the React App** - Run it locally, try different features
2. **Examine the API calls** - Look at the TranslationAPI service
3. **Try the CLI Tool** - Start with basic commands
4. **Read the source code** - Understand implementation patterns

### Intermediate Path
1. **Modify existing features** - Add new display formats or languages
2. **Add new commands** - Extend the CLI with custom functionality
3. **Implement caching** - Add persistence to your own application
4. **Build a simple integration** - Create a basic app using the patterns

### Advanced Path
1. **Performance optimization** - Implement advanced caching strategies
2. **Error resilience** - Add retry logic and graceful degradation
3. **Scale considerations** - Handle rate limiting and bulk operations
4. **Custom architecture** - Design your own integration approach

## 🤝 Contributing

### Adding New Examples
1. Create a new directory under `docs/examples/`
2. Follow the naming convention: `technology-usecase`
3. Include comprehensive README with setup instructions
4. Demonstrate at least 3 different API endpoints
5. Show error handling and caching patterns
6. Include tests and documentation

### Example Request Templates
- **Mobile App** (React Native, Flutter, native iOS/Android)
- **Desktop App** (Electron, Tauri, native)
- **Backend Service** (Express.js, FastAPI, .NET Core)
- **Integration Library** (SDK for specific languages)
- **Specialized Tools** (translation memory, quality checking)

### Contribution Guidelines
1. Fork the repository
2. Create feature branch: `examples/new-example-name`
3. Follow existing patterns and conventions
4. Test thoroughly across different environments
5. Submit pull request with detailed description

## 📖 Additional Resources

### API Documentation
- [Interactive API Docs](../api/interactive-docs.html)
- [Quickstart Guides](../quickstart/)
- [Strategic Languages Guide](../UW_TRANSLATION_RESOURCES_GUIDE.md)

### unfoldingWord Resources
- [Translation Academy](https://www.unfoldingword.academy/)
- [Door43 Content Service](https://git.door43.org/)
- [unfoldingWord Catalog](https://www.unfoldingword.org/catalog/)

### Community
- [GitHub Discussions](https://github.com/unfoldingword/translation-helps-mcp/discussions)
- [Issue Tracker](https://github.com/unfoldingword/translation-helps-mcp/issues)
- [unfoldingWord Forum](https://forum.door43.org/)

---

**Ready to build your own translation tool?** These examples provide solid foundations for creating applications that serve Mother Tongue Translators worldwide. Choose the example that best matches your needs and technology stack, then adapt it to your specific requirements.

**Questions or need help?** Visit our [community discussions](https://github.com/unfoldingword/translation-helps-mcp/discussions) or check the individual example READMEs for detailed setup instructions.
