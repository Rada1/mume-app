import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
                    const target = parsed.target || 'room-description';

                    let prompt = '';
                    let responseSchema: any = null;

                    if (target === 'room-name') {
                      prompt = `Suggest an immersive, atmospheric room name (2-4 words) and a matching preposition (usually "in", "on", "at", "by", "under", "above") for a MUD (Multi-User Dungeon) game matching this terrain and context.
Here is the room context:
${JSON.stringify(parsed.context, null, 2)}`;
                      responseSchema = {
                        type: "OBJECT",
                        properties: {
                          name: { type: "STRING" },
                          preposition: { type: "STRING" }
                        },
                        required: ["name", "preposition"]
                      };
                    } else if (target === 'door-description') {
                      prompt = `Write an immersive, detailed MUD (Multi-User Dungeon) exit/door description for the specified door in this room.
Here is the room context:
${JSON.stringify(parsed.context, null, 2)}`;
                      responseSchema = {
                        type: "OBJECT",
                        properties: {
                          exitDescription: { type: "STRING" }
                        },
                        required: ["exitDescription"]
                      };
                    } else {
                      prompt = `Write an immersive, atmospheric room description for a MUD (Multi-User Dungeon) game. The description should be in the second person ("You are...", "You stand..."). Do not mention exits explicitly in a list, but weave them naturally into the narrative if appropriate.
Here is the room context:
${JSON.stringify(parsed.context, null, 2)}`;
                      responseSchema = {
                        type: "OBJECT",
                        properties: {
                          description: { type: "STRING" }
                        },
                        required: ["description"]
                      };
                    }

                    if (apiKey) {
                      console.log(`🤖 [AI_GENERATION] Generating ${target} instantly using GEMINI_API_KEY...`);
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
                      }
                      console.error(`Gemini API error status: ${response.status}`);
                    }
                    
                    if (!apiKey) {
                      let ollamaRunning = false;
                      let ollamaModel = '';
                      try {
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), 1000);
                        const ollamaTags = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
                        clearTimeout(id);
                        if (ollamaTags.ok) {
                          const tagsData: any = await ollamaTags.json();
                          if (tagsData.models && tagsData.models.length > 0) {
                            ollamaRunning = true;
                            ollamaModel = env.OLLAMA_MODEL || tagsData.models[0].name;
                          }
                        }
                      } catch (e) {}

                      if (ollamaRunning && ollamaModel) {
                        console.log(`🤖 [AI_GENERATION] Generating ${target} instantly using local Ollama model: ${ollamaModel}...`);
                        const extendedPrompt = `${prompt}

Respond ONLY with a JSON object in this format: ${JSON.stringify(responseSchema)}`;

                        const response = await fetch('http://localhost:11434/api/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            model: ollamaModel,
                            prompt: extendedPrompt,
                            stream: false,
                            format: 'json'
                          })
                        });

                        if (response.ok) {
                          const resData: any = await response.json();
                          if (resData.response) {
                            const result = JSON.parse(resData.response.trim());
                            const resPath = path.resolve(__dirname, 'src/shaper/ai_response.json');
                            fs.writeFileSync(resPath, JSON.stringify(result));
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, instant: true }));
                            return;
                          }
                        }
                      }
                    }

                    // Fallback to file bridge if no API key or Ollama model is available
                    const reqPath = path.resolve(__dirname, 'src/shaper/ai_request.json');
                    const resPath = path.resolve(__dirname, 'src/shaper/ai_response.json');
                    if (fs.existsSync(resPath)) fs.unlinkSync(resPath);
                    fs.writeFileSync(reqPath, body);
                    console.log(`\n🤖 [AI_REQUEST_PENDING] No local API key or local Ollama server detected. Request written to src/shaper/ai_request.json for Room ${parsed.roomNumber || 'unknown'}.`);
                    console.log(`👉 Please instruct your AI agent in the chat: "generate description" or similar to process it.`);
                    console.log(`💡 [AI_TIP] Add GEMINI_API_KEY=your_key to your .env.local file or start Ollama for instant one-click generation!\n`);
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
