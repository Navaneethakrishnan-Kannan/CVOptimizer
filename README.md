# ATS Resume Optimizer

A simple (no React build step) Netlify-hosted site that parses a resume, extracts JD keywords, scores against ATS profiles, and optionally optimizes the resume using Groq.

## Local dev

1. Install dependencies: `npm install`
2. Create `.env` from `.env.example` (local dev only)
3. Run: `npx netlify dev`

## Netlify deployment

1. Push to GitHub and connect the repo to Netlify
2. In Netlify: Site settings -> Environment variables
   - `GROQ_API_KEY` (required for optimization)
   - `GROQ_MODEL` (optional)
3. Deploy

