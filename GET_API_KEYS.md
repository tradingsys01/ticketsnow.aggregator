# Quick Guide: Get Google Custom Search API Keys

## Step 1: Get API Key (Simple API Key, NOT Service Account)

1. Go to: https://console.cloud.google.com/apis/credentials
   - Select project: **ticketsnowcoil** (your existing project)

2. Click **"+ CREATE CREDENTIALS"** at the top

3. Select **"API key"** (NOT Service account!)

4. A popup will show your new API key like:
   ```
   AIzaSyAbc123def456ghi789...
   ```

5. (Optional but recommended) Click **"RESTRICT KEY"**:
   - Under "API restrictions", select "Restrict key"
   - Choose "Custom Search API" from the list
   - Click "Save"

6. Copy this API key - this is your `GOOGLE_API_KEY`

## Step 2: Enable Custom Search API

1. Go to: https://console.cloud.google.com/apis/library

2. Search for **"Custom Search API"**

3. Click on it and click **"ENABLE"**

4. Wait for it to enable (takes a few seconds)

## Step 3: Create Custom Search Engine

1. Go to: https://programmablesearchengine.google.com/

2. Click **"Add"** or **"Get Started"**

3. Fill in the form:
   - **Search engine name**: Kids Events Competitors
   - **What to search**: Select "Search specific sites"
   - **Sites to search**: Add these one by one:
     ```
     ticketsi.co.il/*
     leaan.co.il/*
     eventer.co.il/*
     youticket.co.il/*
     ```
   - **Language**: Hebrew
   - **Search settings**: Keep default

4. Click **"Create"**

5. You'll see your **Search engine ID** (looks like: `a1b2c3d4e5f6g7h8i9`)
   - This is your `GOOGLE_SEARCH_ENGINE_ID`

## Step 4: Copy Both Values

You should now have:
```
GOOGLE_API_KEY="AIzaSyAbc123def456ghi789..."
GOOGLE_SEARCH_ENGINE_ID="a1b2c3d4e5f6g7h8i9"
```

## Step 5: Update .env File

I'll help you add these to your .env file once you have them!

---

**Need help?** Let me know which step you're stuck on and I'll guide you through it.
