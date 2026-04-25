# ATS Resume Optimizer

A web application to optimize resumes for ATS platforms using Groq AI.

## Setup

1. Clone the repo

2. Install dependencies: `npm install`

3. Create `.env` from `.env.example` and set `GROQ_API_KEY` (local dev only)

4. For local dev: `npx netlify dev`

4. Set environment variables in .env: GROQ_API_KEY

## Deployment

1. Push to GitHub

2. Connect to Netlify

3. In Netlify: Site settings → Environment variables:
   - `GROQ_API_KEY` (required for optimization)
   - `GROQ_MODEL` (optional)

4. Deploy
