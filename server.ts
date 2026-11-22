import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const portArgIdx = process.argv.indexOf('--port');
  const cliPort = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : undefined;
  const PORT = cliPort || (process.env.NODE_ENV === 'production' ? Number(process.env.PORT || 3000) : 3000);

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Gemini AI Copywriter API route
  app.post('/api/generate-copy', async (req, res) => {
    try {
      const { prompt, productName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ 
          error: 'GEMINI_API_KEY is not configured on the server. Please check your AI Studio secrets.' 
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const jsonFormatExample = '{\n  "subtitle": "Punchy athletic subtitle (max 10 words)",\n  "description": "Engaging description (3-4 sentences in Indonesian)",\n  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4"],\n  "faq": [\n    {"q": "Question 1?", "a": "Answer 1."},\n    {"q": "Question 2?", "a": "Answer 2."}\n  ],\n  "waMessage": "Halo PRIME STYLE, saya tertarik dengan produk ini."\n}';

      const systemInstruction = 
        'You are an expert sports marketing copywriter for "PRIME STYLE", a high-end brutalist athletic apparel & gear brand in Indonesia. ' +
        'Write persuasive, high-converting Indonesian marketing copy targeted at Meta Ads fitness enthusiasts and athletes. ' +
        'Return ONLY valid JSON matching this exact structure with no extra text or markdown formatting:\n' + jsonFormatExample;

      const userPrompt = 
        'Product Name: ' + (productName || 'Athletic Gear') + '\n' +
        'Category/Notes: ' + (prompt || 'High-performance athletic apparel') + '\n' +
        'Generate high-converting Indonesian e-commerce marketing copy following the requested JSON format.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + '\n\n' + userPrompt }] }
        ]
      });

      const responseText = response.text || '';
      
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonStr);
      res.json(parsed);
    } catch (error: any) {
      console.error('Gemini AI generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate copy with AI' });
    }
  });

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`PRIME STYLE server running on http://localhost:${PORT}`);
  });
}

startServer();
