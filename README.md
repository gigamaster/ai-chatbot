<a href="https://github.com/gigamaster/ai-chatbot">
  <img alt="AI Chatbot - Codemo Digital Nomad" src="app/(chat)/au-chatbot-codemo.png">
  <h1 align="center">AI Chatbot for Codemo Digital Nomad</h1>
</a>

<p align="center">
  An AI-Chatbot - Part of the <a href="https://github.com/gigamaster/codemo">Codemo</a> suite of tools for Digital Nomads
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#how-to-use"><strong>How To Use</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#security"><strong>Local storage</strong></a>
</p>

Codemo provides a suite of open-source tools designed for digital nomads on GitHub,   
featuring an AI-powered chatbot that operates on free tiers, stores data locally,  
and adheres to European data privacy standards.

## Features

- Next.js App Router
  - Advanced routing for seamless navigation and performance
  - React Components (RSCs) and Actions for client-side
- AI Generic
  - Unified API for generating code, debugging, and technical explanations
  - Hooks for building dynamic code collaboration interfaces
  - Supports multiple AI models optimized for code understanding
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Code Collaboration Features
  - Real-time code editing with [CodeMirror](https://codemirror.net/)
  - Syntax highlighting for multiple programming languages
  - Code execution and debugging capabilities
- Data Persistence
  - Data Persistence
  - Local database for saving chat history and user data
  - Local storage for efficient data privacy
  - Simple and secure authentication with lock option

## Model Providers

Codemo AI-chatbot uses an AI Gateway to access multiple AI models through a unified interface.  
Its default configuration is set to access these models using the OpenAI libraries and the REST API.


### AI Gateway Authentication

You need to provide an AI Gateway API key by setting the provider `API_KEY` and endpoint URL `baseUrl`.  
This ensures that the AI Gateway can authenticate and connect to the appropriate services.

**Configure AI providers**

To use the AI chatbot, you need to configure at least one AI provider in the settings:

1. Go to the **Settings** page
2. Navigate to the **Providers** section
3. Add a new AI provider by specifying:
   - Provider name (e.g., OpenAI, Anthropic, Google)
   - Model name (e.g., gpt-4, claude-3-opus, gemini-pro)
   - Base URL for the API endpoint
   - API key for authentication

**AI Model**  

You can switch to direct LLM providers like [OpenAI Codex](https://openai.com/blog/openai-codex), [Anthropic Claude Code](https://anthropic.com), [Google Gemini](https://ai.google.dev/gemini-api/docs/openai),  
and other models from the multi-modal frontend to access the best models for your specific needs.

**Token Usage Tracking**

You can also enable or disable token usage tracking in the settings: 

- Toggle **Data Stream Provider Usage** to control whether token usage  
  information is collected and displayed
- When enabled, you'll see token consumption statistics in the chat interface and settings page

Once configured, you can select your preferred provider and model when starting a new chat.

## How to Use

### User account 

To begin, simply create your account and set a password.  
This process automatically creates a local database and  
encrypts your data for protection against unauthorized access.

### Chatting with AI-chatbot

To chat with AI-chatbot, follow these steps:
1. **Start a New Chat**:
   - Click the "New Chat" button in the sidebar
   - Alternatively, you can use the "New Chat" option in the user menu



### Locking the Application

Codemo AI-chatbot includes a security feature that allows you to lock the application  
to protect your data on shared computers:

1. **Set up a password**:
   - Open the user menu by clicking on your user avatar in the sidebar
   - You'll need to log in or create an account first
   - When the lock screen appears, enter a new password to set it up

2. **Lock the application**:
   - Once a password is set, you can lock the application in two ways:
     - Click the lock icon button in the header (top right corner)
     - Use the "Lock Now" option in the user menu
   - The application will immediately lock and display the lock screen

3. **Unlock the application**:
   - Enter your password on the lock screen to unlock the application
   - Press Enter or click the "Unlock" button to proceed

### Using Developer Tools

Codemo AI-chatbot provides access to additional developer tools through the tools menu:

1. Click the code icon in the header
2. Choose from the available tools:
   - **Live Code Editor**: Opens an interactive coding environment
   - **Codemo Digital Nomad**: Access tools designed for digital nomads

Both tools open in a new browser tab for your convenience.


## Security

### API Key Security Explanation

It's a valid concern about API key exposure, but let me clarify how the application actually handles this:

### How AI-chatbot Application Handles API Keys

1. **Client-Side Storage Only**: Your API keys are stored in the browser's IndexedDB, not in the frontend code itself
2. **No Hardcoded Keys**: There are no API keys hardcoded in the JavaScript files that get exposed to users
3. **Encrypted Storage**: The application uses bcrypt hashing for additional security

### Security Model

AI-chatbot application follows a secure pattern for client-side applications:

1. **User-Provided Keys**: Users enter their own API keys in the settings
2. **Local Storage**: Keys are stored locally in IndexedDB, encrypted with bcrypt
3. **Direct API Calls**: The frontend makes direct calls to Google's API with the user's own key

### Is This Secure?

For a client-side application like AI-chatbot, this approach is actually quite secure:

✅ **Keys aren't exposed in code** - They're stored in each user's browser only  
✅ **No server-side storage** - You don't store other people's API keys  
✅ **User control** - Users control their own keys and can revoke them anytime  
✅ **Standard practice** - This is how most client-side AI apps should work  

### Comparison to Server-Side Proxy Approach

The AI providers often mention proxying through a backend, but that approach has different trade-offs:

**Client-Side Approach** (Our implementation):
- ✅ Users control their own API costs
- ✅ No hiden server costs for users
- ✅ No liability for storing others' keys
- ✅ Direct access to latest model features

**Server-Side Proxy Approach**:
- ❌ You'd need to store/manage others' API keys
- ❌ You'd incur server costs
- ❌ You'd be liable for key security
- ❌ Users can't access new model features immediately

### Best Practices Already Implemented

1. **Local Storage**: Keys stay in the user's browser
2. **User Authentication**: Local authentication context ensures proper key usage
3. **Encrypted Storage**: bcrypt hashing adds an extra security layer
4. **No Server Storage**: You never see or store other people's API keys

Our implementation is actually following security best practices for a client-side AI application.  
The concern raised by the AI providers would be more relevant for applications that store and use  
others' API keys on a server, which AI-chatbot application doesn't do.  
The AI chatbot is working correctly and securely!

## Running locally

Using pnpm:

1. Install the required dependencies: `pnpm install`
2. Run the development server: `pnpm dev`

```
pnpm install
pnpm dev
```

AI-chatbot should now be running on [localhost:3000](http://localhost:3000).


### License

AI-chatbot for Codemo is licensed under the Apache License, Version 2.0
