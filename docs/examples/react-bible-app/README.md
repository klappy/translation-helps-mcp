# React Bible Translation App

A comprehensive React application demonstrating integration with the unfoldingWord Translation Helps API. This example showcases best practices for building Bible translation tools that support Mother Tongue Translators using Strategic Languages.

## 🌟 Features

### Core Functionality
- **Dual Translation Display**: Side-by-side ULT/GLT (literal) and UST/GST (simplified) Scripture texts
- **Translation Helps Integration**: Notes, Words, and Questions with tabbed interface
- **Smart Search**: Auto-complete Scripture references with popular passages
- **Strategic Language Support**: Multi-language interface with resource availability indicators
- **Word Lookup**: Click any word to get biblical term definitions
- **Performance Monitoring**: Real-time API metrics and cache statistics

### Technical Features
- **Responsive Design**: Mobile-first design that works on all devices
- **Error Handling**: Comprehensive error boundaries with recovery options
- **Performance Optimization**: Intelligent caching and request coalescing
- **Accessibility**: WCAG-compliant with keyboard navigation and screen reader support
- **Offline Ready**: Service worker integration for basic offline functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Internet connection for API calls

### Installation

```bash
# Clone or download this example
cd react-bible-app

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
# Create optimized production build
npm run build

# Serve production build locally (optional)
npx serve -s build
```

## 📖 Usage Examples

### Basic Scripture Lookup
```javascript
// The app automatically loads John 3:16 on startup
// Try these examples:
- "Romans 8:28" - Single verse with theological depth
- "Psalm 23" - Full chapter with poetic language  
- "Matthew 5:3-12" - Verse range (Beatitudes)
- "Genesis 1:1-5" - Creation narrative
```

### Language Switching
1. Click the language selector in the header
2. Choose from Strategic Languages (English, Spanish, French, Portuguese)
3. Resources automatically reload in the selected language

### Translation Helps Navigation
1. **Notes Tab**: Cultural context and explanations
2. **Words Tab**: Biblical term definitions with categories
3. **Questions Tab**: Comprehension validation questions

### Performance Monitoring
- Click the performance indicator in the header to expand metrics
- View response times, cache hit rates, and error statistics
- Get personalized performance recommendations

## 🏗️ Architecture

### Component Structure
```
src/
├── App.js                 # Main application component
├── components/
│   ├── ScriptureDisplay   # ULT/UST text display with word highlighting
│   ├── TranslationHelps   # Tabbed interface for notes/words/questions
│   ├── ScriptureSearch    # Smart search with auto-complete
│   ├── LanguageSelector   # Strategic language picker
│   ├── PerformanceMonitor # Real-time metrics dashboard
│   └── ErrorBoundary      # Error handling and recovery
├── services/
│   └── TranslationAPI     # API client with caching and error handling
├── hooks/
│   ├── useLocalStorage    # Persistent state management
│   └── usePerformanceTracking # Performance metrics collection
└── assets/                # Images and static files
```

### Data Flow
1. **User Input**: Scripture reference entered via search
2. **API Calls**: Parallel requests for scripture, notes, words, questions
3. **Caching**: Responses cached in memory with TTL
4. **State Management**: React hooks for component state
5. **Performance Tracking**: Metrics collected for monitoring
6. **Error Handling**: Graceful degradation on failures

### API Integration

The app uses the `TranslationAPI` service class which provides:

```javascript
// Initialize API client
const api = new TranslationAPI({
  baseURL: 'https://api.translation.tools',
  timeout: 10000,
  cacheTimeout: 300000 // 5 minutes
});

// Fetch comprehensive translation helps
const helps = await api.getComprehensiveHelps('John 3:16', 'en', {
  includeScripture: true,
  includeNotes: true,
  includeWords: true,
  includeQuestions: true
});
```

## 🎨 Customization

### Styling
- Modify `src/App.css` for overall layout and theming
- Component-specific styles in `src/components/*.css`
- CSS custom properties in `src/index.css` for easy theming

### API Configuration
```javascript
// In src/services/TranslationAPI.js
const api = new TranslationAPI({
  baseURL: 'https://your-api-endpoint.com',
  timeout: 15000,
  cacheTimeout: 600000, // 10 minutes
  retryAttempts: 3
});
```

### Adding New Languages
```javascript
// In src/components/LanguageSelector.js
const languageMetadata = {
  'sw': { 
    flag: '🇹🇿', 
    nativeName: 'Kiswahili', 
    region: 'East Africa' 
  },
  // Add your language here
};
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### Test Structure
- **Unit Tests**: Individual component testing
- **Integration Tests**: API service testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load and stress testing

### Example Test
```javascript
// ScriptureDisplay.test.js
import { render, screen } from '@testing-library/react';
import ScriptureDisplay from './ScriptureDisplay';

test('renders ULT and UST translations', () => {
  const mockScripture = {
    scripture: {
      citation: 'John 3:16',
      ult: { text: 'Literal translation...' },
      ust: { text: 'Simplified translation...' }
    }
  };
  
  render(<ScriptureDisplay scripture={mockScripture} />);
  
  expect(screen.getByText('Literal translation...')).toBeInTheDocument();
  expect(screen.getByText('Simplified translation...')).toBeInTheDocument();
});
```

## 🔧 Troubleshooting

### Common Issues

**API Connection Failed**
```bash
# Check network connectivity
curl https://api.translation.tools/api/health

# Verify CORS settings
# Ensure your development server allows the API origin
```

**Slow Performance**
- Check the Performance Monitor for metrics
- Clear browser cache if hit rate is low
- Verify internet connection speed
- Consider using a different Strategic Language

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear React cache
rm -rf build
npm run build
```

**Language Not Loading**
- Verify the language code is correct (ISO 639-1)
- Check if resources are available for that language
- Use the Language Coverage API to confirm availability

### Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('debug', 'translation-app:*');

// View performance data
console.log(app.getPerformanceStats());

// Export tracking data
console.log(app.exportTrackingData());
```

## 📊 Performance Optimization

### Recommended Practices
1. **Caching Strategy**: Enable browser cache and service workers
2. **Bundle Optimization**: Use code splitting for large components
3. **Image Optimization**: Compress images and use WebP format
4. **API Optimization**: Batch requests when possible
5. **Memory Management**: Clear unused cache entries

### Performance Metrics
- **Target Response Time**: < 500ms for Scripture, < 800ms for Translation Helps
- **Cache Hit Rate**: > 70% for optimal performance
- **Error Rate**: < 1% for reliable operation
- **Bundle Size**: < 2MB gzipped for fast loading

## 🌐 Deployment

### Environment Variables
```bash
# .env.production
REACT_APP_API_BASE_URL=https://api.translation.tools
REACT_APP_ANALYTICS_ID=your-analytics-id
REACT_APP_ERROR_REPORTING_URL=your-error-service
```

### Deployment Platforms

**Netlify**
```bash
# Build command
npm run build

# Publish directory
build

# Environment variables set in Netlify dashboard
```

**Vercel**
```bash
# Deploy with Vercel CLI
npx vercel --prod
```

**AWS S3 + CloudFront**
```bash
# Build and sync to S3
npm run build
aws s3 sync build/ s3://your-bucket-name
```

### Production Checklist
- [ ] API endpoint configured correctly
- [ ] Error reporting enabled
- [ ] Analytics tracking implemented
- [ ] Performance monitoring active
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Service worker registered

## 🤝 Contributing

### Development Setup
```bash
# Fork the repository
git clone your-fork-url
cd react-bible-app

# Create feature branch
git checkout -b feature/your-feature-name

# Install dependencies
npm install

# Start development
npm start
```

### Code Standards
- **ESLint**: Automated code quality checks
- **Prettier**: Consistent code formatting
- **TypeScript**: Type safety (optional migration)
- **Jest**: Unit testing framework
- **Testing Library**: Component testing utilities

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation as needed
4. Ensure all tests pass
5. Submit pull request with description

## 📚 Additional Resources

### unfoldingWord Documentation
- [Translation Helps API](../../../api/interactive-docs.html)
- [Strategic Languages Guide](../../../docs/UW_TRANSLATION_RESOURCES_GUIDE.md)
- [Translation Academy](https://www.unfoldingword.academy/)

### React Resources
- [React Documentation](https://react.dev/)
- [Testing Library](https://testing-library.com/)
- [React Accessibility](https://react.dev/learn/accessibility)

### Translation Resources
- [Door43 Content Service](https://git.door43.org/)
- [unfoldingWord Catalog](https://www.unfoldingword.org/catalog/)
- [Translation Notes](https://www.unfoldingword.org/tn/)

## 📄 License

This example application is licensed under the MIT License. See [LICENSE](../../../LICENSE) for details.

## 🙏 Acknowledgments

- **unfoldingWord** for providing comprehensive Bible translation resources
- **Door43 Community** for maintaining high-quality content
- **React Team** for the excellent development framework
- **Translation Community** for feedback and testing

---

**Ready to build your own Bible translation tool?** This example provides a solid foundation for creating production-ready applications that serve Mother Tongue Translators worldwide.

For questions or support, visit our [GitHub Discussions](https://github.com/unfoldingword/translation-helps-mcp/discussions).
