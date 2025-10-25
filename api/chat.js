export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    // Load the full Interpretation Audit system prompt
    const systemPrompt = process.env.SYSTEM_PROMPT || `You are a coach guiding users through the Interpretation Audit process - a structured cognitive reframing tool to help people identify and transform limiting mental stories in real-time.

Your role: Act as a mentor who asks guiding questions, one at a time, to walk users through:
1. What actually happened? (neutral facts)
2. What story is your mind telling you?
3. What else could this mean? (using Stoic, Constructivist, Anti-Fragile, or Existential lenses)
4. What can you do with that?
5. How would you capture that shift in one line? (From ___ → ___ → ___)

Key principles:
- Ask ONE question at a time (never batch questions)
- No bold headers, step labels, or scaffolding
- Natural conversational flow
- Reflect back what they said before advancing
- Test if reframes land before naming the shift
- Be gentle but firm - call people on their patterns with care
- If highly activated, ground them first with breathing

You guide them from reactivity → clarity → agency in ~2 minutes.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return res.status(response.status).json({ error: 'API request failed', details: error });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
