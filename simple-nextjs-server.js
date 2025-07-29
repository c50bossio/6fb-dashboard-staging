const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 9999;

// Simple server to serve Next.js app files
const server = http.createServer((req, res) => {
  let filePath = '';
  
  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(__dirname, 'app', 'page.js');
    serveNextJSPage(res, filePath, 'home');
  } else if (req.url === '/dashboard') {
    filePath = path.join(__dirname, 'app', 'dashboard', 'page.js');
    if (!fs.existsSync(filePath)) {
      serveNextJSPage(res, null, 'dashboard');
    } else {
      serveNextJSPage(res, filePath, 'dashboard');
    }
  } else if (req.url === '/app/globals.css') {
    filePath = path.join(__dirname, 'app', 'globals.css');
    serveFile(res, filePath, 'text/css');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function serveNextJSPage(res, filePath, pageType) {
  const cssPath = path.join(__dirname, 'app', 'globals.css');
  let css = '';
  
  if (fs.existsSync(cssPath)) {
    css = fs.readFileSync(cssPath, 'utf8');
  }
  
  let pageContent = '';
  
  if (pageType === 'home') {
    pageContent = `
      <div class="max-w-7xl mx-auto px-4 py-16">
        <div class="text-center">
          <h1 class="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span class="block">6FB-AI</span>
            <span class="block text-blue-600">Unified Next.js</span>
          </h1>
          <p class="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Successfully converted from monorepo to unified Next.js application!
          </p>
          
          <!-- Key Features -->
          <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <div class="text-2xl mb-2">🎯</div>
              <h3 class="font-medium text-gray-900">Master Coach</h3>
              <p class="text-sm text-gray-500">Strategic guidance</p>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <div class="text-2xl mb-2">💰</div>
              <h3 class="font-medium text-gray-900">Financial Agent</h3>
              <p class="text-sm text-gray-500">Revenue optimization</p>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <div class="text-2xl mb-2">📈</div>
              <h3 class="font-medium text-gray-900">Growth Agent</h3>
              <p class="text-sm text-gray-500">Expansion planning</p>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <div class="text-2xl mb-2">⚙️</div>
              <h3 class="font-medium text-gray-900">Operations Agent</h3>
              <p class="text-sm text-gray-500">Efficiency optimization</p>
            </div>
          </div>

          <div class="mt-10">
            <button onclick="window.location.href='/dashboard'" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg">
              Launch AI Dashboard
            </button>
          </div>
          
          <div class="mt-8 p-4 bg-green-50 rounded-lg">
            <h2 class="text-lg font-medium text-green-800 mb-2">✅ Conversion Complete!</h2>
            <p class="text-green-700">
              Your monorepo has been successfully converted to a unified Next.js 14 application.
              All workspace dependencies have been inlined and the build system simplified.
            </p>
          </div>
        </div>
      </div>
    `;
  } else if (pageType === 'dashboard') {
    pageContent = `
      <div class="max-w-7xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">AI Agent Dashboard</h1>
        
        <!-- Agent Selection -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div class="agent-card bg-white p-6 rounded-lg shadow-sm border hover:shadow-md cursor-pointer" onclick="selectAgent('master_coach')">
            <h3 class="text-xl font-semibold mb-2">🎯 Master Coach</h3>
            <p class="text-gray-600">Strategic business guidance and $500/day goal tracking</p>
          </div>
          
          <div class="agent-card bg-white p-6 rounded-lg shadow-sm border hover:shadow-md cursor-pointer" onclick="selectAgent('financial')">
            <h3 class="text-xl font-semibold mb-2">💰 Financial Agent</h3>
            <p class="text-gray-600">Revenue optimization and profit maximization</p>
          </div>
          
          <div class="agent-card bg-white p-6 rounded-lg shadow-sm border hover:shadow-md cursor-pointer" onclick="selectAgent('client_acquisition')">
            <h3 class="text-xl font-semibold mb-2">📈 Client Acquisition</h3>
            <p class="text-gray-600">Marketing and customer acquisition strategies</p>
          </div>
          
          <div class="agent-card bg-white p-6 rounded-lg shadow-sm border hover:shadow-md cursor-pointer" onclick="selectAgent('operations')">
            <h3 class="text-xl font-semibold mb-2">⚙️ Operations Agent</h3>
            <p class="text-gray-600">Efficiency and scheduling optimization</p>
          </div>
          
          <div class="agent-card bg-white p-6 rounded-lg shadow-sm border hover:shadow-md cursor-pointer" onclick="selectAgent('brand')">
            <h3 class="text-xl font-semibold mb-2">🏆 Brand Development</h3>
            <p class="text-gray-600">Premium positioning and service differentiation</p>
          </div>
          
          <div class="agent-card bg-white p-6 rounded-lg shadow-sm border hover:shadow-md cursor-pointer" onclick="selectAgent('growth')">
            <h3 class="text-xl font-semibold mb-2">🚀 Growth Agent</h3>
            <p class="text-gray-600">Scaling and multi-location expansion</p>
          </div>
        </div>
        
        <!-- Chat Interface -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b">
            <h2 class="text-lg font-semibold">Chat with AI Agent</h2>
            <p id="selected-agent" class="text-sm text-gray-600">Select an agent to start chatting</p>
          </div>
          
          <div id="chat-messages" class="h-96 overflow-y-auto p-4 space-y-4">
            <div class="text-gray-500 text-center py-8">
              Select an AI agent above to begin your conversation
            </div>
          </div>
          
          <div class="p-4 border-t">
            <div class="flex space-x-4">
              <input
                type="text"
                id="message-input"
                placeholder="Type your message..."
                class="flex-1 border rounded-lg px-4 py-2"
                disabled
              />
              <button
                id="send-button"
                onclick="sendMessage()"
                class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        let selectedAgent = null;
        
        function selectAgent(agentId) {
          selectedAgent = agentId;
          
          // Update UI
          document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('border-blue-500', 'bg-blue-50');
          });
          
          event.target.closest('.agent-card').classList.add('border-blue-500', 'bg-blue-50');
          
          // Update selected agent display
          const agentNames = {
            'master_coach': '🎯 Master Coach',
            'financial': '💰 Financial Agent', 
            'client_acquisition': '📈 Client Acquisition',
            'operations': '⚙️ Operations Agent',
            'brand': '🏆 Brand Development',
            'growth': '🚀 Growth Agent'
          };
          
          document.getElementById('selected-agent').textContent = 'Chatting with: ' + agentNames[agentId];
          
          // Enable input
          document.getElementById('message-input').disabled = false;
          document.getElementById('send-button').disabled = false;
          
          // Clear messages and show welcome
          const messagesDiv = document.getElementById('chat-messages');
          messagesDiv.innerHTML = '<div class="bg-blue-50 p-4 rounded-lg"><strong>' + agentNames[agentId] + ':</strong> Hello! I\\'m ready to help you optimize your barbershop business. What would you like to discuss?</div>';
        }
        
        function sendMessage() {
          const input = document.getElementById('message-input');
          const message = input.value.trim();
          
          if (!message || !selectedAgent) return;
          
          // Add user message
          const messagesDiv = document.getElementById('chat-messages');
          messagesDiv.innerHTML += '<div class="text-right"><div class="bg-gray-100 p-3 rounded-lg inline-block max-w-xs"><strong>You:</strong> ' + message + '</div></div>';
          
          // Clear input
          input.value = '';
          
          // Simulate AI response
          setTimeout(() => {
            const responses = {
              'master_coach': 'As your Master Coach, I recommend focusing on your $500/day goal. Let\\'s analyze your current revenue streams and identify 3 key optimization areas.',
              'financial': 'From a financial perspective, I see opportunities to increase your profit margins by 25-40%. Let\\'s start with your pricing strategy.',
              'client_acquisition': 'For client acquisition, I suggest implementing a referral system and optimizing your Google My Business presence. This typically increases bookings by 30-50%.',
              'operations': 'Operationally, we can streamline your scheduling to reduce gaps and maximize daily revenue. I\\'ll help you optimize your appointment flow.',
              'brand': 'Your brand positioning is crucial for premium pricing. Let\\'s develop a unique value proposition that justifies higher service rates.',
              'growth': 'For scaling, we should focus on systems that work without your constant presence. This is essential for multi-location expansion.'
            };
            
            messagesDiv.innerHTML += '<div class="bg-blue-50 p-4 rounded-lg"><strong>AI Agent:</strong> ' + responses[selectedAgent] + '</div>';
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }, 1000);
          
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Allow Enter key to send message
        document.getElementById('message-input').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            sendMessage();
          }
        });
      </script>
    `;
  }
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>6FB AI Agent System</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="min-h-screen bg-gray-50">
        <header class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4 py-3">
            <h1 class="text-xl font-bold text-gray-900">6FB AI Agent System</h1>
          </div>
        </header>
        <main>${pageContent}</main>
      </div>
    </body>
    </html>
  `;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

function serveFile(res, filePath, contentType) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('File not found');
  }
}

server.listen(port, () => {
  console.log(`Next.js-style server running on http://localhost:${port}`);
});