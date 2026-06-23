import { defineEndpoint } from '@directus/extensions-sdk';

const DEFAULTS = {
  collection: 'global_configurations',
  entityType: 'ai-api',
  urlKey:     'url',
  tokenKey:   'token',
  modelKey:   'model',
} as const;

export default defineEndpoint({
  id: 'ai-translations',
  handler: (router, { database }: any) => {

    /**
     * Read the interface's configured options from directus_fields (server-side).
     * The client only supplies the collection+field identifiers so we know WHICH
     * field to read — the actual config values (collection name, entity type, key
     * names) are never taken from the request body.
     */
    async function resolveConfig(sourceCollection: string, sourceField: string) {
      const row = await database('directus_fields')
        .where({ collection: sourceCollection, field: sourceField })
        .select('meta')
        .first();

      const rawMeta = row?.meta ?? {};
      const meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
      const options = meta?.options ?? {};

      return {
        collection: options.configCollection || DEFAULTS.collection,
        entityType: options.configEntityType || DEFAULTS.entityType,
        urlKey:     options.configUrlKey     || DEFAULTS.urlKey,
        tokenKey:   options.configTokenKey   || DEFAULTS.tokenKey,
        modelKey:   options.configModelKey   || DEFAULTS.modelKey,
      };
    }

    async function getConfig(params: {
      collection: string;
      entityType: string;
      urlKey: string;
      tokenKey: string;
      modelKey: string;
    }) {
      const rows: { key: string; value: string }[] = await database(params.collection)
        .where({ entity_type: params.entityType })
        .select('key', 'value');

      const cfg: Record<string, string> = {};
      for (const row of rows) {
        cfg[row.key] = row.value;
      }

      return {
        apiUrl: cfg[params.urlKey]   as string | undefined,
        apiKey: cfg[params.tokenKey] as string | undefined,
        model:  cfg[params.modelKey] as string | undefined,
      };
    }

    function missingConfigError(cfg: { collection: string; entityType: string; urlKey: string; tokenKey: string; modelKey: string }) {
      return (
        `AI API not fully configured. Ensure rows with entity_type="${cfg.entityType}" ` +
        `and keys "${cfg.urlKey}", "${cfg.tokenKey}", "${cfg.modelKey}" ` +
        `exist in the "${cfg.collection}" collection.`
      );
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
      if (!req.accountability?.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const { text, sourceLanguage, targetLanguage, sourceCollection, sourceField } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Missing required fields: text, targetLanguage' });
      }
      if (!sourceCollection || !sourceField) {
        return res.status(400).json({ error: 'Missing required fields: sourceCollection, sourceField' });
      }

      const cfg = await resolveConfig(sourceCollection, sourceField);
      const { apiUrl, apiKey, model } = await getConfig(cfg);
      if (!apiUrl || !apiKey || !model) {
        return res.status(500).json({ error: missingConfigError(cfg) });
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
      if (!req.accountability?.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const { fields, sourceLanguage, targetLanguage, sourceCollection, sourceField } = req.body as {
        fields: Record<string, string>;
        sourceLanguage?: string;
        targetLanguage: string;
        sourceCollection: string;
        sourceField: string;
      };

      if (!fields || typeof fields !== 'object' || !targetLanguage) {
        return res.status(400).json({ error: 'Missing required fields: fields (object), targetLanguage' });
      }
      if (!sourceCollection || !sourceField) {
        return res.status(400).json({ error: 'Missing required fields: sourceCollection, sourceField' });
      }

      const cfg = await resolveConfig(sourceCollection, sourceField);
      const { apiUrl, apiKey, model } = await getConfig(cfg);
      if (!apiUrl || !apiKey || !model) {
        return res.status(500).json({ error: missingConfigError(cfg) });
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
