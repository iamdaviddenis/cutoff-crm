// Vercel serverless function for Anthropic Claude API
// File: /api/anthropic.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API key not set' });
    return;
  }
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Wewe ni msaidizi wa CutOff Recycle Limited — kampuni ya Tanzania inayotengeneza mbolea ya kikaboni kutoka nywele za binadamu. Bidhaa: Rutubisha (mbolea ngumu/growing medium), Vuna (liquid foliar fertilizer), McheKuza (Tokyo 8 biofertilizer). CEO: David Denis Hariohay. Kiswahili cha kawaida, karibu, la kibiashara. Malipo ya wakusanyaji: 300 TZS/kg kwa mkusanyaji, 150 TZS/kg kwa hub (sorting), 50 TZS/kg convenience fee.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await anthropicRes.json();
    res.status(200).json({ text: data.content?.[0]?.text || 'Imeshindwa. Jaribu tena.' });
  } catch (e) {
    res.status(500).json({ error: 'Anthropic API error', details: e.message });
  }
}
