---
description: How to deploy the repository to Render.com
---

# Deploying to Render

Since this is a React (Vite) application, the best way to deploy it is as a **Static Site**. It is free, faster, and designed for frontend applications.

## Step 1: Create New Static Site
1. Log in to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** button (top right)
3. Select **Static Site** (NOT Web Service)
4. Connect your GitHub account and select your `gemini-chat` repository

## Step 2: Configure Settings
Fill in the following details:

- **Name**: `gemini-chat` (or any unique name)
- **Branch**: `main`
- **Root Directory**: (leave empty)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

## Step 3: Add Environment Variables (CRITICAL)
Your app will **crash (white screen)** without these.
1. Scroll down to **Environment Variables** (or go to the Environment tab after creating)
2. Add the keys from your local `.env` file:
   - Key: `VITE_SUPABASE_URL` -> Value: (Your Supabase URL)
   - Key: `VITE_SUPABASE_PUBLISHABLE_KEY` -> Value: (Your Supabase Key)
   - Key: `VITE_GOOGLE_AI_API_KEY` -> Value: (Your Gemini Key)

## Step 4: Add Rewrite Rule (Fixes "Page Not Found" on refresh)
Since this is a Single Page App (SPA), you need to redirect all requests to `index.html`.
1. Go to the **Redirects/Rewrites** tab
2. Click **Add Rule**
3. Enter these details:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
4. Click **Save Changes**

## Step 5: Deploy
- Click **Create Static Site**
- Wait for the build to finish. It should take about 1-2 minutes.
- Visit your URL (e.g., `https://gemini-chat.onrender.com`)
