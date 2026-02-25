import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Code, Key, Lock, Send, Database, Shield, Zap } from 'lucide-react';

function EndpointCard({ method, path, description, authRequired, requestBody, responseExample, headers }) {
  const [showRequest, setShowRequest] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const methodColors = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded text-xs font-bold ${methodColors[method]}`}>
                {method}
              </span>
              <code className="text-sm font-mono text-gray-900 dark:text-gray-100">{path}</code>
              {authRequired && (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Lock className="w-3 h-3" />
                  Auth Required
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
          </div>
        </div>

        {headers && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Headers:</h4>
            <div className="bg-white dark:bg-gray-900 rounded p-2 space-y-1">
              {headers.map((header, idx) => (
                <div key={idx} className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400">{header.name}</span>: {header.value}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {requestBody && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowRequest(!showRequest)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-between items-center"
          >
            Request Body
            <span className="text-xs">{showRequest ? '▼' : '▶'}</span>
          </button>
          {showRequest && (
            <div className="px-4 pb-4">
              <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify(requestBody, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {responseExample && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowResponse(!showResponse)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-between items-center"
          >
            Response Example
            <span className="text-xs">{showResponse ? '▼' : '▶'}</span>
          </button>
          {showResponse && (
            <div className="px-4 pb-4">
              <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify(responseExample, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function APIDocumentationPage() {
  useEffect(() => {
    document.title = 'API Documentation - NoteBurner';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <Code className="inline w-10 h-10 mr-3 text-amber-500" />
            API Documentation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Integrate NoteBurner's secure messaging into your applications
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">REST API</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">JSON over HTTPS</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">Secure</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">API Key Authentication</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">Rate Limited</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">100-100k req/day</div>
                </div>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Getting Started
            </h2>
            <ol className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>
                  <Link to="/api-keys" className="underline hover:text-amber-600 dark:hover:text-amber-300">
                    Create an API Key
                  </Link> in your account dashboard
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Include your API key in the <code className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">X-API-Key</code> header</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Make requests to <code className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">https://noteburner.work/api/v1</code></span>
              </li>
            </ol>
          </div>
        </div>

        {/* Base URL */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Base URL</h2>
          <code className="block bg-gray-900 dark:bg-black text-gray-100 p-4 rounded font-mono text-sm">
            https://noteburner.work/api/v1
          </code>
        </div>

        {/* Authentication */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Authentication</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            All API requests require authentication using an API key. Include your API key in the request header:
          </p>
          <code className="block bg-gray-900 dark:bg-black text-gray-100 p-4 rounded font-mono text-sm mb-4">
            X-API-Key: nb_your_api_key_here
          </code>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>⚠️ Security:</strong> Never expose your API key in client-side code or public repositories. 
              Use environment variables and keep your keys secure.
            </p>
          </div>
        </div>

        {/* Endpoints */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Endpoints</h2>

          {/* Messages */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Messages
            </h3>

            <EndpointCard
              method="POST"
              path="/api/v1/messages"
              description="Create a new encrypted message"
              authRequired={true}
              headers={[
                { name: 'X-API-Key', value: 'your_api_key' },
                { name: 'Content-Type', value: 'application/json' }
              ]}
              requestBody={{
                encryptedData: 'base64_encrypted_content',
                iv: 'initialization_vector',
                salt: 'password_salt',
                maxViews: 1,
                expiresIn: 86400,
                passwordProtected: true
              }}
              responseExample={{
                success: true,
                message: {
                  token: 'msg_abc123xyz',
                  url: 'https://noteburner.work/m/msg_abc123xyz',
                  expires_at: '2026-02-26T12:00:00Z'
                }
              }}
            />

            <EndpointCard
              method="GET"
              path="/api/v1/messages"
              description="List your messages (paginated)"
              authRequired={true}
              headers={[
                { name: 'X-API-Key', value: 'your_api_key' }
              ]}
              responseExample={{
                messages: [
                  {
                    token: 'msg_abc123',
                    created_at: '2026-02-25T10:00:00Z',
                    expires_at: '2026-02-26T10:00:00Z',
                    view_count: 0,
                    max_views: 1,
                    burned: false
                  }
                ],
                pagination: {
                  total: 42,
                  limit: 50,
                  offset: 0,
                  has_more: false
                }
              }}
            />

            <EndpointCard
              method="GET"
              path="/api/v1/messages/:token"
              description="Get message metadata (does not decrypt content)"
              authRequired={true}
              headers={[
                { name: 'X-API-Key', value: 'your_api_key' }
              ]}
              responseExample={{
                message: {
                  token: 'msg_abc123',
                  created_at: '2026-02-25T10:00:00Z',
                  expires_at: '2026-02-26T10:00:00Z',
                  view_count: 0,
                  max_views: 1,
                  burned: false,
                  has_password: true,
                  has_file: false
                }
              }}
            />
          </div>

          {/* API Keys Management */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              API Keys (Session Auth)
            </h3>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> API key management endpoints require session authentication (login required), not API key auth.
              </p>
            </div>

            <EndpointCard
              method="GET"
              path="/api/api-keys"
              description="List all your API keys"
              authRequired={true}
              headers={[
                { name: 'X-Session-Token', value: 'session_token_from_login' }
              ]}
              responseExample={{
                keys: [
                  {
                    id: 'key_123',
                    name: 'Production Server',
                    rate_limit: 10000,
                    active: true,
                    created_at: '2026-01-01T00:00:00Z',
                    last_used_at: '2026-02-25T10:00:00Z',
                    requests_today: 543,
                    requests_month: 15234
                  }
                ]
              }}
            />

            <EndpointCard
              method="POST"
              path="/api/api-keys"
              description="Create a new API key"
              authRequired={true}
              headers={[
                { name: 'X-Session-Token', value: 'session_token_from_login' },
                { name: 'Content-Type', value: 'application/json' }
              ]}
              requestBody={{
                name: 'Production Server',
                rate_limit: 10000
              }}
              responseExample={{
                success: true,
                key: 'nb_abc123xyz789_this_is_shown_only_once',
                api_key: {
                  id: 'key_123',
                  name: 'Production Server',
                  rate_limit: 10000,
                  active: true,
                  created_at: '2026-02-25T12:00:00Z'
                }
              }}
            />

            <EndpointCard
              method="DELETE"
              path="/api/api-keys/:id"
              description="Revoke an API key"
              authRequired={true}
              headers={[
                { name: 'X-Session-Token', value: 'session_token_from_login' }
              ]}
              responseExample={{
                success: true,
                message: 'API key revoked'
              }}
            />
          </div>

          {/* Teams */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Teams (Enterprise)
            </h3>

            <EndpointCard
              method="POST"
              path="/api/teams"
              description="Create a new team workspace"
              authRequired={true}
              headers={[
                { name: 'X-Session-Token', value: 'session_token_from_login' },
                { name: 'Content-Type', value: 'application/json' }
              ]}
              requestBody={{
                name: 'Engineering Team',
                plan: 'enterprise'
              }}
              responseExample={{
                success: true,
                team: {
                  id: 'team_abc123',
                  name: 'Engineering Team',
                  plan: 'enterprise',
                  max_members: 100,
                  created_at: '2026-02-25T12:00:00Z'
                }
              }}
            />

            <EndpointCard
              method="GET"
              path="/api/teams"
              description="List your teams"
              authRequired={true}
              headers={[
                { name: 'X-Session-Token', value: 'session_token_from_login' }
              ]}
              responseExample={{
                teams: [
                  {
                    id: 'team_abc123',
                    name: 'Engineering Team',
                    plan: 'enterprise',
                    max_members: 100,
                    member_count: 12,
                    my_role: 'admin',
                    created_at: '2026-02-25T12:00:00Z'
                  }
                ]
              }}
            />
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rate Limits</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Free Tier</span>
              <code className="text-sm bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded">100 requests/day</code>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Team Plan</span>
              <code className="text-sm bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded">1,000 requests/day</code>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Enterprise</span>
              <code className="text-sm bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded">10,000 requests/day</code>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 dark:text-gray-300">Enterprise+</span>
              <code className="text-sm bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded">100,000 requests/day</code>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Rate limits reset daily at midnight UTC. Exceeding your limit returns a 429 status code.
          </p>
        </div>

        {/* Error Codes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Error Codes</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-sm font-mono">400</code>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Bad Request</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Invalid request parameters or missing required fields</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-sm font-mono">401</code>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Unauthorized</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Invalid or missing API key</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-sm font-mono">403</code>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Forbidden</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">API key valid but lacks required permissions</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-sm font-mono">404</code>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Not Found</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resource doesn't exist or has been deleted</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-sm font-mono">429</code>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Rate Limit Exceeded</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Too many requests - wait until rate limit resets</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-sm font-mono">500</code>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Internal Server Error</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Something went wrong on our end - contact support if persistent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Code Examples</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">JavaScript (Node.js)</h3>
            <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`const API_KEY = 'nb_your_api_key_here';
const BASE_URL = 'https://noteburner.work/api/v1';

async function createMessage(encryptedData) {
  const response = await fetch(\`\${BASE_URL}/messages\`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      encryptedData: encryptedData,
      iv: 'your_iv',
      salt: 'your_salt',
      maxViews: 1,
      expiresIn: 86400
    })
  });
  
  const data = await response.json();
  console.log('Message URL:', data.message.url);
  return data;
}`}
            </pre>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Python</h3>
            <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`import requests

API_KEY = 'nb_your_api_key_here'
BASE_URL = 'https://noteburner.work/api/v1'

def create_message(encrypted_data):
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'encryptedData': encrypted_data,
        'iv': 'your_iv',
        'salt': 'your_salt',
        'maxViews': 1,
        'expiresIn': 86400
    }
    
    response = requests.post(
        f'{BASE_URL}/messages',
        headers=headers,
        json=payload
    )
    
    data = response.json()
    print(f"Message URL: {data['message']['url']}")
    return data`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">cURL</h3>
            <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`curl -X POST https://noteburner.work/api/v1/messages \\
  -H "X-API-Key: nb_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "encryptedData": "base64_encrypted_content",
    "iv": "initialization_vector",
    "salt": "password_salt",
    "maxViews": 1,
    "expiresIn": 86400
  }'`}
            </pre>
          </div>
        </div>

        {/* Support */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Need Help?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Questions about the API? We're here to help!
          </p>
          <div className="flex gap-3">
            <Link
              to="/support"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
            >
              Contact Support
            </Link>
            <Link
              to="/api-keys"
              className="px-4 py-2 border border-amber-500 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
            >
              Manage API Keys
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
