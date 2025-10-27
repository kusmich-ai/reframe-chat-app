import { supabase } from '../lib/supabase.js';

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
    const { messages, userId, conversationId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get user's patterns for context
    const { data: patterns } = await supabase
      .from('patterns')
      .select('*')
      .eq('user_id', userId)
      .order('occurrences', { ascending: false })
      .limit(5);

    // Build context from patterns
    let patternContext = '';
    if (patterns && patterns.length > 0) {
      patternContext = `\n\nUser's recurring patterns from past sessions:\n`;
      patterns.forEach(p => {
        patternContext += `- "${p.pattern_type}" (seen ${p.occurrences} times)\n`;
        if (p.anchors && p.anchors.length > 0) {
          patternContext += `  Past successful anchors: ${p.anchors.slice(-3).join(', ')}\n`;
        }
      });
    }

    // Load system prompt and add pattern context
    const basePrompt = process.env.SYSTEM_PROMPT || `You are a coach guiding users through the Interpretation Audit process...`;
    const systemPrompt = basePrompt + patternContext;

    // Call Anthropic API
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

    // Save conversation to database
    let convId = conversationId;
    
    // Create conversation if it doesn't exist
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: messages[0]?.content?.substring(0, 50) || 'New conversation',
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
      } else {
        convId = newConv.id;
      }
    }

    // Save user message
    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'user',
        content: messages[messages.length - 1].content,
      });

      // Save assistant response
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: data.content[0].text,
      });

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
    }

    return res.status(200).json({
      ...data,
      conversationId: convId,
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
