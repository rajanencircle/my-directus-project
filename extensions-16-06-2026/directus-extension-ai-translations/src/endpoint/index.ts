import { defineEndpoint } from '@directus/extensions-sdk';

export default defineEndpoint({
  id: 'ai-translations',
  handler: (router, { env }: any) => {

    function getConfig(env: any) {
      return {
        apiUrl: env['TRANSLATION_API_URL'],
        apiKey: env['TRANSLATION_API_KEY'] as string | undefined,
        model: env['TRANSLATION_API_MODEL']
      };
    }

    async function callAI(apiUrl: string, apiKey: string, model: string, prompt: string): Promise<string> {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw Object.assign(new Error('Translation API error'), { detail: errorBody, status: 502 });
      }

      const data = (await response.json()) as any;
      return data.choices?.[0]?.message?.content?.trim() ?? '';
    }

    // ── Single field translation ──────────────────────────────────────
    router.post('/translate', async (req: any, res: any) => {
      const { text, sourceLanguage, targetLanguage } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Missing required fields: text, targetLanguage' });
      }

      const { apiUrl, apiKey, model } = getConfig(env);
      if (!apiKey) {
        return res.status(500).json({ error: 'TRANSLATION_API_KEY is not set in your Directus environment variables.' });
      }

      try {
        const prompt =
          `Translate the following text from ${sourceLanguage ?? 'the source language'} to ${targetLanguage}. ` +
          `Return only the translation, no extra text or markdown.\n\nText: ${text}`;

        const translated = await callAI(apiUrl, apiKey, model, prompt);
        return res.json({ translated });
      } catch (err: any) {
        console.error('[ai-translations] /translate error:', err);
        return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail });
      }
    });

    // ── Batch translation (all fields in one AI call) ─────────────────
    router.post('/translate-batch', async (req: any, res: any) => {
      const { fields, sourceLanguage, targetLanguage } = req.body as {
        fields: Record<string, string>;
        sourceLanguage?: string;
        targetLanguage: string;
      };

      if (!fields || typeof fields !== 'object' || !targetLanguage) {
        return res.status(400).json({ error: 'Missing required fields: fields (object), targetLanguage' });
      }

      const { apiUrl, apiKey, model } = getConfig(env);
      if (!apiKey) {
        return res.status(500).json({ error: 'TRANSLATION_API_KEY is not set in your Directus environment variables.' });
      }

      try {
        const prompt =
          `Translate all string values in the following JSON object from ${sourceLanguage ?? 'the source language'} to ${targetLanguage}. ` +
          `Return ONLY a valid JSON object with the exact same keys and translated string values. ` +
          `No explanation, no markdown code fences, just raw JSON.\n\n` +
          JSON.stringify(fields);

        const raw = await callAI(apiUrl, apiKey, model, prompt);

        // Strip possible markdown code fences the model may add despite instructions
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        let translated: Record<string, string>;
        try {
          translated = JSON.parse(cleaned);
        } catch {
          console.error('[ai-translations] Failed to parse batch response:', raw);
          return res.status(502).json({ error: 'AI returned invalid JSON', raw });
        }

        // Validate: every key in the input must be present in the output
        const missingKeys = Object.keys(fields).filter((k) => !(k in translated));
        if (missingKeys.length) {
          console.error('[ai-translations] Batch response missing keys:', missingKeys);
          return res.status(502).json({ error: 'AI response missing keys', missingKeys, raw });
        }

        return res.json({ translated });
      } catch (err: any) {
        console.error('[ai-translations] /translate-batch error:', err);
        return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail });
      }
    });

  },
});
