<script lang="ts">
  import { onMount } from 'svelte';

  let searchQuery = '';
  let activeSection = 'overview';
  let stats = {
    totalEndpoints: 23,
    activeUsers: 1247,
    averageResponse: '120ms',
    uptime: '99.9%'
  };

  const sections = [
    { id: 'overview', title: 'Overview', icon: '🏠' },
    { id: 'quickstart', title: 'Quick Start', icon: '⚡' },
    { id: 'api-reference', title: 'API Reference', icon: '📖' },
    { id: 'guides', title: 'Guides & Tutorials', icon: '🎓' },
    { id: 'tools', title: 'Tools & SDKs', icon: '🔧' },
    { id: 'community', title: 'Community', icon: '👥' },
    { id: 'support', title: 'Support', icon: '💬' }
  ];

  const quickstartGuides = [
    {
      title: 'Build a Scripture Reader in 5 Minutes',
      description: 'Create a simple web app that displays Scripture with translation helps',
      difficulty: 'Beginner',
      time: '5 min',
      tags: ['HTML', 'JavaScript', 'REST API'],
      href: '/docs/quickstarts/scripture-reader-quickstart'
    },
    {
      title: 'Add Translation Helps to Your App',
      description: 'Integrate translation resources into existing React/Vue applications',
      difficulty: 'Intermediate',
      time: '15 min',
      tags: ['React', 'Vue', 'Components'],
      href: '/docs/quickstarts/translation-workflow-quickstart'
    },
    {
      title: 'AI Assistant Integration',
      description: 'Connect AI assistants to biblical resources using MCP',
      difficulty: 'Advanced',
      time: '30 min',
      tags: ['MCP', 'AI', 'Claude', 'TypeScript'],
      href: '/docs/quickstarts/ai-assistant-quickstart'
    },
    {
      title: 'Translation Checking Tool',
      description: 'Build tools for Mother Tongue Translators to verify accuracy',
      difficulty: 'Advanced',
      time: '45 min',
      tags: ['Translation', 'QA', 'Workflow'],
      href: '/docs/quickstarts/translation-checking-quickstart'
    },
    {
      title: 'Offline-First Mobile Apps',
      description: 'Create PWAs that work without internet connectivity',
      difficulty: 'Expert',
      time: '60 min',
      tags: ['PWA', 'Offline', 'Mobile', 'Service Workers'],
      href: '/docs/quickstarts/offline-mobile-quickstart'
    }
  ];

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/fetch-scripture',
      description: 'Fetch scripture text in ULT/UST translations',
      category: 'Scripture'
    },
    {
      method: 'GET',
      path: '/api/fetch-translation-notes',
      description: 'Get cultural and linguistic translation notes',
      category: 'Helps'
    },
    {
      method: 'GET',
      path: '/api/fetch-translation-questions',
      description: 'Get comprehension and checking questions',
      category: 'Helps'
    },
    {
      method: 'GET',
      path: '/api/fetch-translation-academy',
      description: 'Get Translation Academy training materials',
      category: 'Helps'
    },
    {
      method: 'GET',
      path: '/api/get-translation-word',
      description: 'Look up biblical word definitions',
      category: 'Words'
    },
    {
      method: 'GET',
      path: '/api/browse-translation-words',
      description: 'Search the translation words database',
      category: 'Words'
    },
    {
      method: 'GET',
      path: '/api/fetch-translation-word-links',
      description: 'Get Translation Word Links (TWL) for passages',
      category: 'Words'
    },
    {
      method: 'GET',
      path: '/api/get-languages',
      description: 'Get list of available languages',
      category: 'Metadata'
    },
    {
      method: 'GET',
      path: '/api/get-available-books',
      description: 'Get available books for a language',
      category: 'Metadata'
    },
    {
      method: 'GET',
      path: '/api/language-coverage',
      description: 'Check language resource availability',
      category: 'Metadata'
    },
    {
      method: 'GET',
      path: '/api/extract-references',
      description: 'Extract scripture references from text',
      category: 'Utilities'
    },
    {
      method: 'GET',
      path: '/api/resource-container-links',
      description: 'Resolve resource container relationships',
      category: 'Utilities'
    }
  ];

  const tools = [
                        {
                      name: 'Interactive API Explorer',
                      description: 'Test API endpoints directly in your browser',
                      type: 'Web Tool',
                      href: '/test'
                    },
    {
      name: 'MCP Server',
      description: 'Model Context Protocol server for AI assistants',
      type: 'Server',
      href: 'https://github.com/translation-tools/mcp-server'
    },
    {
      name: 'JavaScript SDK',
      description: 'Official SDK for web applications',
      type: 'SDK',
      href: '/docs/sdk/javascript'
    },
    {
      name: 'Postman Collection',
      description: 'Pre-configured API requests for testing',
      type: 'Collection',
      href: '/downloads/translation-tools.postman_collection.json'
    }
  ];

  onMount(() => {
    // Auto-scroll to section if hash is present
    const hash = window.location.hash.slice(1);
    if (hash) {
      activeSection = hash;
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  });

  function setActiveSection(sectionId: string) {
    activeSection = sectionId;
    window.history.pushState({}, '', `#${sectionId}`);
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-100';
      case 'Intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'Advanced': return 'text-orange-600 bg-orange-100';
      case 'Expert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getMethodColor(method: string) {
    switch (method) {
      case 'GET': return 'text-green-600 bg-green-100';
      case 'POST': return 'text-blue-600 bg-blue-100';
      case 'PUT': return 'text-yellow-600 bg-yellow-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  $: filteredGuides = quickstartGuides.filter(guide => 
    !searchQuery || 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );
</script>

<svelte:head>
  <title>Developer Portal - Translation Tools</title>
  <meta name="description" content="Build powerful biblical translation applications with our comprehensive API and resources" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold text-gray-900">Translation Tools</h1>
          <span class="ml-2 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">Developer Portal</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input
              type="text"
              placeholder="Search documentation..."
              bind:value={searchQuery}
              class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          
          <a href="/test" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Try API
          </a>
        </div>
      </div>
    </div>
  </header>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Sidebar Navigation -->
      <aside class="lg:w-64 flex-shrink-0">
        <nav class="bg-white rounded-lg shadow-sm p-4 sticky top-24">
          <ul class="space-y-2">
            {#each sections as section}
              <li>
                <button
                  class="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3
                    {activeSection === section.id 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'}"
                  on:click={() => setActiveSection(section.id)}
                >
                  <span class="text-lg">{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              </li>
            {/each}
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1">
        <!-- Overview Section -->
        {#if activeSection === 'overview'}
          <section id="overview" class="space-y-8">
            <!-- Hero -->
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-8">
              <h1 class="text-3xl md:text-4xl font-bold mb-4">
                Build Biblical Translation Apps
              </h1>
              <p class="text-xl mb-6 opacity-90">
                Access comprehensive biblical resources including ULT/UST scripture, translation notes, word definitions, and more through our powerful REST API.
              </p>
              <div class="flex flex-wrap gap-4">
                <button
                   on:click={() => setActiveSection('quickstart')}
                   class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Get Started
                </button>
                <a href="/test" 
                   class="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                  Try the API
                </a>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-blue-600">{stats.totalEndpoints}</div>
                <div class="text-gray-600">API Endpoints</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-green-600">{stats.activeUsers}</div>
                <div class="text-gray-600">Active Developers</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-purple-600">{stats.averageResponse}</div>
                <div class="text-gray-600">Avg Response</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-yellow-600">{stats.uptime}</div>
                <div class="text-gray-600">Uptime</div>
              </div>
            </div>

            <!-- Key Features -->
            <div class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Why Translation Tools?</h2>
              <div class="grid md:grid-cols-3 gap-8">
                <div class="text-center">
                  <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Fast & Reliable</h3>
                  <p class="text-gray-600">Sub-second response times with 99.9% uptime and global CDN distribution.</p>
                </div>
                <div class="text-center">
                  <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Comprehensive</h3>
                  <p class="text-gray-600">Complete biblical resources including ULT/UST, notes, questions, and word studies.</p>
                </div>
                <div class="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div class="text-center">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Developer Friendly</h3>
                  <p class="text-gray-600">RESTful API, interactive docs, SDKs, and comprehensive quickstart guides.</p>
                </div>
              </div>
            </div>
          </section>
        {/if}

        <!-- Quick Start Section -->
        {#if activeSection === 'quickstart'}
          <section id="quickstart" class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-4">Quick Start Guides</h1>
              <p class="text-xl text-gray-600">
                Get up and running quickly with step-by-step tutorials for common integration scenarios.
              </p>
            </div>

            <!-- Search/Filter -->
            {#if searchQuery}
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-blue-800">
                  Showing {filteredGuides.length} result{filteredGuides.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              </div>
            {/if}

            <!-- Guides Grid -->
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {#each filteredGuides as guide}
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start mb-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getDifficultyColor(guide.difficulty)}">
                      {guide.difficulty}
                    </span>
                    <span class="text-sm text-gray-500">{guide.time}</span>
                  </div>
                  
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">
                    <a href={guide.href} class="hover:text-blue-600 transition-colors">
                      {guide.title}
                    </a>
                  </h3>
                  
                  <p class="text-gray-600 mb-4 text-sm leading-relaxed">
                    {guide.description}
                  </p>
                  
                  <div class="flex flex-wrap gap-2 mb-4">
                    {#each guide.tags as tag}
                      <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {tag}
                      </span>
                    {/each}
                  </div>
                  
                  <a href={guide.href} 
                     class="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Start Guide
                    <svg class="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              {/each}
            </div>

            <!-- Quick Start Steps -->
            <div class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Get Started in 3 Steps</h2>
              <div class="grid md:grid-cols-3 gap-8">
                <div class="text-center">
                  <div class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Choose Your Path</h3>
                  <p class="text-gray-600">Select a quickstart guide that matches your project needs and technical stack.</p>
                </div>
                <div class="text-center">
                  <div class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Follow the Guide</h3>
                  <p class="text-gray-600">Complete step-by-step instructions with working code examples and explanations.</p>
                </div>
                <div class="text-center">
                  <div class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    3
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Build & Deploy</h3>
                  <p class="text-gray-600">Customize the examples for your use case and deploy your biblical translation app.</p>
                </div>
              </div>
            </div>
          </section>
        {/if}

        <!-- API Reference Section -->
        {#if activeSection === 'api-reference'}
          <section id="api-reference" class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-4">API Reference</h1>
              <p class="text-xl text-gray-600">
                Complete documentation for all Translation Tools API endpoints.
              </p>
            </div>

            <!-- API Overview -->
            <div class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">API Overview</h2>
              <div class="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Base URL</h3>
                  <code class="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                    https://translation.tools/api
                  </code>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Authentication</h3>
                  <p class="text-gray-600">No authentication required for public endpoints. Rate limiting applies.</p>
                </div>
              </div>
            </div>

            <!-- Endpoint Categories -->
            <div class="grid md:grid-cols-2 gap-6">
              {#each ['Scripture', 'Helps', 'Words', 'Metadata', 'Utilities'] as category}
                <div class="bg-white rounded-lg shadow-sm p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">{category} Endpoints</h3>
                  <div class="space-y-3">
                    {#each apiEndpoints.filter(ep => ep.category === category) as endpoint}
                      <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div class="flex items-center space-x-3">
                          <span class="px-2 py-1 text-xs font-mono rounded {getMethodColor(endpoint.method)}">
                            {endpoint.method}
                          </span>
                          <code class="text-sm font-mono text-gray-700">{endpoint.path}</code>
                        </div>
                        <a href="/api-docs#{endpoint.path.replace('/', '')}" 
                           class="text-blue-600 hover:text-blue-700 text-sm">
                          Docs
                        </a>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>

            <!-- Interactive Docs -->
            <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 border border-green-200">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-semibold text-gray-900 mb-2">Interactive API Documentation</h3>
                  <p class="text-gray-600">Explore and test all endpoints with live examples and response schemas.</p>
                </div>
                <a href="/api-docs" 
                   class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                  Open API Docs
                </a>
              </div>
            </div>
          </section>
        {/if}

        <!-- Tools & SDKs Section -->
        {#if activeSection === 'tools'}
          <section id="tools" class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-4">Tools & SDKs</h1>
              <p class="text-xl text-gray-600">
                Development tools, SDKs, and utilities to accelerate your integration.
              </p>
            </div>

            <!-- Tools Grid -->
            <div class="grid md:grid-cols-2 gap-6">
              {#each tools as tool}
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">{tool.name}</h3>
                      <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{tool.type}</span>
                    </div>
                    <a href={tool.href} 
                       class="text-blue-600 hover:text-blue-700">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <p class="text-gray-600 text-sm mb-4">{tool.description}</p>
                  <a href={tool.href} 
                     class="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Access Tool
                    <svg class="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              {/each}
            </div>

            <!-- Coming Soon -->
            <div class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Coming Soon</h2>
              <div class="grid md:grid-cols-3 gap-6">
                <div class="text-center p-6 border border-gray-200 rounded-lg">
                  <div class="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Mobile SDK</h3>
                  <p class="text-gray-600 text-sm">Native SDKs for iOS and Android applications</p>
                </div>
                <div class="text-center p-6 border border-gray-200 rounded-lg">
                  <div class="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">GraphQL API</h3>
                  <p class="text-gray-600 text-sm">Flexible GraphQL interface for complex queries</p>
                </div>
                <div class="text-center p-6 border border-gray-200 rounded-lg">
                  <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">VSCode Extension</h3>
                  <p class="text-gray-600 text-sm">IDE integration for development workflows</p>
                </div>
              </div>
            </div>
          </section>
        {/if}

        <!-- Community Section -->
        {#if activeSection === 'community'}
          <section id="community" class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-4">Developer Community</h1>
              <p class="text-xl text-gray-600">
                Connect with other developers building biblical translation tools.
              </p>
            </div>

            <!-- Community Stats -->
            <div class="grid md:grid-cols-4 gap-6">
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-blue-600">1.2k+</div>
                <div class="text-gray-600">Developers</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-green-600">45</div>
                <div class="text-gray-600">Countries</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-purple-600">180+</div>
                <div class="text-gray-600">Apps Built</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-yellow-600">25</div>
                <div class="text-gray-600">Languages</div>
              </div>
            </div>

            <!-- Community Links -->
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <a href="https://github.com/translation-tools" 
                 class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                  <div class="bg-gray-900 text-white w-12 h-12 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">GitHub</h3>
                    <p class="text-gray-600 text-sm">Source code and contributions</p>
                  </div>
                </div>
              </a>

              <a href="https://discord.gg/translation-tools" 
                 class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                  <div class="bg-indigo-600 text-white w-12 h-12 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Discord</h3>
                    <p class="text-gray-600 text-sm">Real-time chat and support</p>
                  </div>
                </div>
              </a>

              <a href="https://forum.translation.tools" 
                 class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                  <div class="bg-orange-600 text-white w-12 h-12 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Forum</h3>
                    <p class="text-gray-600 text-sm">Discussions and Q&A</p>
                  </div>
                </div>
              </a>

              <a href="https://twitter.com/translation_tools" 
                 class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                  <div class="bg-blue-400 text-white w-12 h-12 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Twitter</h3>
                    <p class="text-gray-600 text-sm">Updates and announcements</p>
                  </div>
                </div>
              </a>

              <a href="mailto:developers@translation.tools" 
                 class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                  <div class="bg-green-600 text-white w-12 h-12 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Email</h3>
                    <p class="text-gray-600 text-sm">Direct developer support</p>
                  </div>
                </div>
              </a>

              <a href="/showcase" 
                 class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                  <div class="bg-purple-600 text-white w-12 h-12 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Showcase</h3>
                    <p class="text-gray-600 text-sm">Apps built by the community</p>
                  </div>
                </div>
              </a>
            </div>
          </section>
        {/if}

        <!-- Support Section -->
        {#if activeSection === 'support'}
          <section id="support" class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-4">Developer Support</h1>
              <p class="text-xl text-gray-600">
                Get help, report issues, and access comprehensive documentation.
              </p>
            </div>

            <!-- Support Options -->
            <div class="grid md:grid-cols-2 gap-8">
              <div class="bg-white rounded-lg shadow-sm p-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">📚 Documentation</h2>
                <p class="text-gray-600 mb-6">Comprehensive guides and API documentation to help you build successfully.</p>
                <div class="space-y-3">
                  <a href="/docs/quickstarts" class="block text-blue-600 hover:text-blue-700">→ Quickstart Guides</a>
                  <a href="/api-docs" class="block text-blue-600 hover:text-blue-700">→ API Reference</a>
                  <a href="/docs/architecture" class="block text-blue-600 hover:text-blue-700">→ Architecture Guide</a>
                  <a href="/docs/troubleshooting" class="block text-blue-600 hover:text-blue-700">→ Troubleshooting</a>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">💬 Community Support</h2>
                <p class="text-gray-600 mb-6">Connect with other developers and get help from the community.</p>
                <div class="space-y-3">
                  <a href="https://discord.gg/translation-tools" class="block text-blue-600 hover:text-blue-700">→ Discord Chat</a>
                  <a href="https://forum.translation.tools" class="block text-blue-600 hover:text-blue-700">→ Developer Forum</a>
                  <a href="https://github.com/translation-tools/translation-helps-mcp/discussions" class="block text-blue-600 hover:text-blue-700">→ GitHub Discussions</a>
                  <a href="https://stackoverflow.com/questions/tagged/translation-tools" class="block text-blue-600 hover:text-blue-700">→ Stack Overflow</a>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">🐛 Bug Reports</h2>
                <p class="text-gray-600 mb-6">Found an issue? Help us improve by reporting bugs and feature requests.</p>
                <div class="space-y-3">
                  <a href="https://github.com/translation-tools/translation-helps-mcp/issues/new?template=bug_report.md" class="block text-blue-600 hover:text-blue-700">→ Report a Bug</a>
                  <a href="https://github.com/translation-tools/translation-helps-mcp/issues/new?template=feature_request.md" class="block text-blue-600 hover:text-blue-700">→ Request a Feature</a>
                  <a href="/status" class="block text-blue-600 hover:text-blue-700">→ Service Status</a>
                  <a href="/docs/debugging" class="block text-blue-600 hover:text-blue-700">→ Debugging Guide</a>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">🏢 Enterprise Support</h2>
                <p class="text-gray-600 mb-6">Need dedicated support for your organization or commercial application?</p>
                <div class="space-y-3">
                  <a href="mailto:enterprise@translation.tools" class="block text-blue-600 hover:text-blue-700">→ Contact Sales</a>
                  <a href="/enterprise" class="block text-blue-600 hover:text-blue-700">→ Enterprise Plans</a>
                  <a href="/sla" class="block text-blue-600 hover:text-blue-700">→ Service Level Agreement</a>
                  <a href="/consulting" class="block text-blue-600 hover:text-blue-700">→ Professional Services</a>
                </div>
              </div>
            </div>

            <!-- FAQ -->
            <div class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Is the API free to use?</h3>
                  <p class="text-gray-600">Yes, the Translation Tools API is free for public use with rate limiting. Enterprise plans are available for high-volume applications.</p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Do I need an API key?</h3>
                  <p class="text-gray-600">No API key is required for public endpoints. However, rate limits apply and API keys provide higher limits and usage analytics.</p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">What languages are supported?</h3>
                  <p class="text-gray-600">Currently, we primarily support English resources (ULT/UST) with translation helps. Additional strategic languages are being added regularly.</p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Can I use this for commercial applications?</h3>
                  <p class="text-gray-600">Yes, the API can be used in commercial applications. For high-volume or enterprise use, please contact us for appropriate licensing.</p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">How do I report API issues?</h3>
                  <p class="text-gray-600">Report bugs on GitHub, join our Discord for real-time help, or check our status page for known issues.</p>
                </div>
              </div>
            </div>
          </section>
        {/if}
      </main>
    </div>
  </div>
</div>

<style>
  /* Custom styles for better mobile experience */
  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style> 