import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { buildShaperAiPromptSpec, selectShaperOllamaModel, textFromGeneratedPayload } from './src/shaper/model/shaperAiGeneration';

const OLLAMA_GENERATE_TIMEOUT_MS = 60000;
const SHAPER_AI_PROVIDER_AGENT = 'agent';
const SHAPER_AI_PROVIDER_GEMINI = 'gemini';
const SHAPER_AI_PROVIDER_OLLAMA = 'ollama';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'save-vectors-api',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/api/save-vectors')) {
              console.log(`[Plugin Middleware] Matches /api/save-vectors: method=${req.method}, url=${req.url}`);
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                  try {
                    const filePath = path.resolve(__dirname, 'src/components/Mapper/data/middle_earth_vectors.json');
                    fs.writeFileSync(filePath, body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                  } catch (e: any) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                  }
                });
                return;
              }
            }
            if (req.url && req.url.startsWith('/api/ai-generate')) {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body);
                    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                    const promptSpec = buildShaperAiPromptSpec(parsed.target, parsed.context);
                    const { target, prompt, responseSchema } = promptSpec;
                    const provider = (env.SHAPER_AI_PROVIDER || process.env.SHAPER_AI_PROVIDER || SHAPER_AI_PROVIDER_AGENT).toLowerCase();
                    const agentRequest = {
                      ...parsed,
                      target,
                      roomNumber: parsed.roomNumber || '',
                      context: parsed.context,
                      prompt,
                      responseSchema,
                      provider: SHAPER_AI_PROVIDER_AGENT,
                      createdAt: new Date().toISOString()
                    };

                    if (provider === SHAPER_AI_PROVIDER_GEMINI && apiKey) {
                      console.log(`🤖 [AI_GENERATION] Generating ${target} instantly using GEMINI_API_KEY...`);
                      try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                              responseMimeType: "application/json",
                              responseSchema
                            }
                          })
                        });

                        if (response.ok) {
                          const resData: any = await response.json();
                          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
                          if (text) {
                            const result = JSON.parse(text);
                            const resPath = path.resolve(__dirname, 'src/shaper/ai_response.json');
                            fs.writeFileSync(resPath, JSON.stringify(result));
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, instant: true }));
                            return;
                          }
                        } else {
                          console.error(`Gemini API error status: ${response.status}`);
                        }
                      } catch (geminiError) {
                        console.error('Gemini API request failed:', geminiError);
                      }
                    }
                    
                    // Optional local fallback for development; production-quality prose should use the agent/MCP bridge.
                    let ollamaRunning = false;
                    let ollamaModel = '';
                    let activeOllamaHost = '127.0.0.1:11434'; // Use 127.0.0.1 by default for reliable IPv4 resolution

                    if (provider === SHAPER_AI_PROVIDER_OLLAMA) {
                      try {
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), 1000);
                        const ollamaTags = await fetch(`http://${activeOllamaHost}/api/tags`, { signal: controller.signal });
                        clearTimeout(id);
                        if (ollamaTags.ok) {
                          const tagsData: any = await ollamaTags.json();
                          ollamaModel = selectShaperOllamaModel(tagsData, env.OLLAMA_MODEL);
                          if (ollamaModel) {
                            ollamaRunning = true;
                          }
                        }
                      } catch (e) {
                        // Fallback to localhost if 127.0.0.1 fails
                        try {
                          const controller = new AbortController();
                          const id = setTimeout(() => controller.abort(), 1000);
                          const ollamaTags = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
                          clearTimeout(id);
                          if (ollamaTags.ok) {
                            const tagsData: any = await ollamaTags.json();
                            ollamaModel = selectShaperOllamaModel(tagsData, env.OLLAMA_MODEL);
                            if (ollamaModel) {
                              ollamaRunning = true;
                              activeOllamaHost = 'localhost:11434';
                            }
                          }
                        } catch (err2) {}
                      }
                    }

                    if (ollamaRunning && ollamaModel) {
                      console.log(`🤖 [AI_GENERATION] Generating ${target} instantly using local Ollama model: ${ollamaModel}...`);
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), OLLAMA_GENERATE_TIMEOUT_MS);
                      try {
                        const response = await fetch(`http://${activeOllamaHost}/api/generate`, {
                          method: 'POST',
                          signal: controller.signal,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            model: ollamaModel,
                            prompt,
                            stream: false,
                            format: 'json',
                            options: {
                              temperature: 0.7,
                              num_predict: 220
                            }
                          })
                        });
                        clearTimeout(timeoutId);

                        if (response.ok) {
                          const resData: any = await response.json();
                          if (resData.response) {
                            let responseText = resData.response.trim();
                            
                            // Clean up markdown code blocks if present
                            if (responseText.includes('```')) {
                              const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                              if (match) {
                                responseText = match[1].trim();
                              }
                            }
                            
                            let result;
                            try {
                              result = JSON.parse(responseText);
                            } catch (parseErr) {
                              const startIdx = responseText.indexOf('{');
                              const endIdx = responseText.lastIndexOf('}');
                              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                                try {
                                  result = JSON.parse(responseText.substring(startIdx, endIdx + 1));
                                } catch (innerErr) {
                                  result = responseText;
                                }
                              } else {
                                result = responseText;
                              }
                            }

                            // If result is just a string, wrap it in the expected schema format
                            if (typeof result === 'string') {
                              if (target === 'room-name') {
                                result = { name: result, preposition: 'on' };
                              } else if (target === 'door-description') {
                                result = { exitDescription: result };
                              } else {
                                result = { description: result };
                              }
                            } else if (result && typeof result === 'object') {
                              // Normalize keys to exact frontend expectation
                              if (target === 'room-name') {
                                const finalName = textFromGeneratedPayload(result, ['name', 'Name', 'title', 'Title']);
                                const finalPrep = textFromGeneratedPayload(result, ['preposition', 'Preposition', 'prep', 'Prep']) || 'in';
                                result = { name: finalName, preposition: finalPrep };
                              } else if (target === 'door-description') {
                                const finalDesc = textFromGeneratedPayload(result, ['exitDescription', 'ExitDescription', 'description', 'Description', 'text', 'Text']);
                                result = { exitDescription: finalDesc };
                              } else {
                                const finalDesc = textFromGeneratedPayload(result, ['description', 'Description', 'desc', 'Desc', 'text', 'Text']);
                                result = { description: finalDesc };
                              }
                            }

                            const resPath = path.resolve(__dirname, 'src/shaper/ai_response.json');
                            fs.writeFileSync(resPath, JSON.stringify(result));
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, instant: true }));
                            return;
                          } else {
                            console.error('Ollama response missing "response" field:', resData);
                          }
                        } else {
                          console.error(`Ollama generation error status: ${response.status}`, await response.text());
                        }
                      } catch (ollamaErr) {
                        clearTimeout(timeoutId);
                        console.error('Ollama generation request failed:', ollamaErr);
                        res.writeHead(504, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Local Ollama generation timed out or failed.' }));
                        return;
                      }
                    }

                    // Default bridge: Codex/Antigravity reads this request via MCP and writes ai_response.json.
                    const reqPath = path.resolve(__dirname, 'src/shaper/ai_request.json');
                    const resPath = path.resolve(__dirname, 'src/shaper/ai_response.json');
                    if (fs.existsSync(resPath)) fs.unlinkSync(resPath);
                    fs.writeFileSync(reqPath, JSON.stringify(agentRequest, null, 2));
                    console.log(`\n🤖 [AI_REQUEST_PENDING] No local API key or local Ollama server detected. Request written to src/shaper/ai_request.json for Room ${parsed.roomNumber || 'unknown'}.`);
                    console.log(`👉 Please instruct your AI agent in the chat: "generate description" or similar to process it.`);
                    console.log(`💡 [AI_TIP] Add GEMINI_API_KEY=your_key to your .env.local file or start Ollama for instant one-click generation!\n`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, provider: SHAPER_AI_PROVIDER_AGENT }));
                  } catch (e: any) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                  }
                });
                return;
              }
            }
            if (req.url && req.url.startsWith('/api/shaper-sync')) {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                  try {
                    const parsed = JSON.parse(body);
                    const filePath = path.resolve(__dirname, 'projects/active.shaper.json');
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                  } catch (e: any) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                  }
                });
                return;
              }
            }
            if (req.url && req.url.startsWith('/api/ai-poll')) {
              try {
                const resPath = path.resolve(__dirname, 'src/shaper/ai_response.json');
                if (fs.existsSync(resPath)) {
                  const content = fs.readFileSync(resPath, 'utf8');
                  const parsed = JSON.parse(content);
                  const reqPath = path.resolve(__dirname, 'src/shaper/ai_request.json');
                  if (fs.existsSync(reqPath)) fs.unlinkSync(reqPath);
                  fs.unlinkSync(resPath);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, data: parsed }));
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, pending: true }));
                }
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
              }
              return;
            }
            next();
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon-1.png', 'icon-512.png', 'favicon.ico'],
        manifest: {
          name: 'MUME - Multi-Users in Middle-earth',
          short_name: 'MUME',
          description: 'A premium web client for MUME (Multi-Users in Middle-earth) — the classic MUD.',
          start_url: '/',
          display: 'standalone',
          background_color: '#000000',
          theme_color: '#000000',
          orientation: 'any',
          scope: '/',
          icons: [
            {
              src: 'icon-1.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cache application shell and assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,jpeg}'],
          // Exclude very large terrain images from precache (cached at runtime below)
          globIgnores: [
            '**/assets/map/m_peaks/**',
            '**/assets/map/hills/**',
            '**/assets/Pictures/middle_earth.png',
          ],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit for background JPEG
          // Don't cache API/WebSocket calls
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/ws/],
          runtimeCaching: [
            {
              // Cache map assets
              urlPattern: /\/assets\/map\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              // Cache parchment textures and backgrounds
              urlPattern: /\.(png|jpe?g|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-assets',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
