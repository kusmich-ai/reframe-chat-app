{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // api/chat.js\
// Place this file in an 'api' folder in your project\
\
export default async function handler(req, res) \{\
  // Only allow POST requests\
  if (req.method !== 'POST') \{\
    return res.status(405).json(\{ error: 'Method not allowed' \});\
  \}\
\
  // Enable CORS for your frontend\
  res.setHeader('Access-Control-Allow-Origin', '*');\
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');\
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');\
\
  // Handle preflight requests\
  if (req.method === 'OPTIONS') \{\
    return res.status(200).end();\
  \}\
\
  try \{\
    const \{ messages \} = req.body;\
\
    // Validate the request\
    if (!messages || !Array.isArray(messages)) \{\
      return res.status(400).json(\{ error: 'Invalid request: messages array required' \});\
    \}\
\
    // Optional: Add your custom system instructions here\
    // This is where you can include your Claude Project's instructions\
    const systemPrompt = `You are a helpful AI assistant.\
\
Add your custom instructions here - these will be invisible to users but guide Claude's behavior.`;\
\
    // Call Anthropic API\
    const response = await fetch('https://api.anthropic.com/v1/messages', \{\
      method: 'POST',\
      headers: \{\
        'Content-Type': 'application/json',\
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Stored securely in Vercel\
        'anthropic-version': '2023-06-01',\
      \},\
      body: JSON.stringify(\{\
        model: 'claude-sonnet-4-20250514',\
        max_tokens: 4096,\
        system: systemPrompt, // Your custom instructions\
        messages: messages,\
      \}),\
    \});\
\
    if (!response.ok) \{\
      const error = await response.json();\
      console.error('Anthropic API error:', error);\
      return res.status(response.status).json(\{ error: 'API request failed' \});\
    \}\
\
    const data = await response.json();\
    return res.status(200).json(data);\
\
  \} catch (error) \{\
    console.error('Server error:', error);\
    return res.status(500).json(\{ error: 'Internal server error' \});\
  \}\
\}}
