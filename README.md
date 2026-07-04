# GenAI Learning Journey

This repo is basically my notes + code as I learn Generative AI using JavaScript. Not a polished course repo, just documenting stuff as I go so I can look back later.

## What I've covered so far

**LLM basics**
Went a bit deep into how LLMs actually work under the hood — tokens, tokenization, how the model reads input at a token level instead of just "words." Helped a lot in understanding why prompts behave the way they do.

**Gemini API integration**
Got the Gemini API wired up in a Node project using the `@google/genai` SDK. Nothing fancy yet, just calling `generateContent` and getting responses back.

**Function calling**
This one took a bit to click. Basically you describe your functions (name, description, params) to the model, and instead of just replying with text, it can say "hey call this function with these args." You run the function yourself and send the result back so the model can use it in its final answer.

**First AI agent**
Built my first actual agent — it can:
- check the current weather for any city (using WeatherAPI)
- fetch live crypto prices like Bitcoin/Ethereum (using CoinGecko API)

It runs in a loop — you ask something, the model figures out if it needs a tool, calls it, gets the data back, and replies with an actual answer instead of "I don't have real-time data."

## Folder structure
GEN-AI/
├── First-Agent/       # weather + crypto agent
│   ├── index.js
│   ├── package.json
│   └── .env (ignored, has my API keys)
└── README.md

## Stack
- Node.js (ESM)
- @google/genai
- dotenv
- readline-sync
- CoinGecko API
- WeatherAPI

## Notes to self
Every lecture folder needs its own `.env` (git-ignored):
GEMINI_API_KEY=your_key_here

## Progress
- [x] LLM + tokens basics
- [x] Gemini API setup
- [x] Function calling
- [x] First agent (weather + crypto)
- [ ] whatever's next