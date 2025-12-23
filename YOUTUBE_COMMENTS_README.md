# YouTube Comments Feature Documentation

## Overview

The YouTube comments feature has been implemented to fetch and display comments (including replies) for videos shown on event pages. The system caches comments for 3 days to minimize API calls.

## Implementation Status

✅ **Completed**:
- Database schema for storing comments (VideoComment model)
- Service functions to fetch comments from YouTube API
- API endpoint: `GET /api/comments/[videoId]`
- Caching system (3-day expiry)
- Reply threading support

## Database Schema

```prisma
model VideoComment {
  id                String   @id @default(cuid())
  youtubeVideoId    String   // Relation to YouTubeVideo
  videoId           String   // YouTube video ID (e.g., E-KYojFqglU)
  commentId         String   @unique
  authorName        String
  authorChannelId   String?
  authorProfileUrl  String?
  textDisplay       String
  likeCount         Int      @default(0)
  publishedAt       DateTime
  updatedAt         DateTime
  parentCommentId   String?  // For reply threading
  isReply           Boolean  @default(false)
  checkedAt         DateTime @default(now())
  expiresAt         DateTime // 3-day cache
}
```

## API Endpoint

### GET /api/comments/[videoId]

Fetches comments for a specific YouTube video.

**Parameters**:
- `videoId` - YouTube video ID (e.g., E-KYojFqglU)

**Response**:
```json
{
  "videoId": "E-KYojFqglU",
  "total": 15,
  "topLevelCount": 10,
  "replyCount": 5,
  "comments": [
    {
      "commentId": "UgxABC123...",
      "authorName": "John Doe",
      "authorChannelId": "UC123...",
      "authorProfileUrl": "https://...",
      "textDisplay": "Great show!",
      "likeCount": 5,
      "publishedAt": "2025-12-20T10:00:00Z",
      "updatedAt": "2025-12-20T10:00:00Z",
      "isReply": false,
      "parentCommentId": null,
      "replies": [
        {
          "commentId": "UgxDEF456...",
          "authorName": "Jane Smith",
          "textDisplay": "I agree!",
          "likeCount": 2,
          "isReply": true,
          "parentCommentId": "UgxABC123..."
        }
      ]
    }
  ],
  "fromCache": true
}
```

## Service Functions

### `getVideoComments(videoId: string)`
Main function to fetch comments with caching.
- Checks cache first
- Fetches from YouTube API if not cached
- Stores in database with 3-day expiry
- Returns up to 10 top-level comments with replies

### `fetchVideoComments(videoId: string, maxResults: number)`
Low-level function to fetch comments from YouTube API.
- Fetches comment threads (comments + replies)
- Orders by relevance
- Returns plain text format

## Configuration

### Cache Duration
Comments are cached for **3 days** (configured in `getVideoComments()`):
```typescript
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 3) // 3 days
```

### Number of Comments
- **Top-level comments**: 10 (configurable via `maxResults` parameter)
- **Replies**: All replies for those 10 comments are fetched
- **Total**: Typically 10-30 comments depending on reply count

## ⚠️ IMPORTANT: Authentication Limitation

### Current Issue
The YouTube comments feature requires **OAuth2 user authentication**, not service account authentication. This is a YouTube API limitation.

**Error**: `403 Forbidden - insufficientPermissions`

### Why Service Accounts Don't Work
- YouTube Data API v3 comments require user consent
- Service accounts cannot access user-generated content (comments)
- Even with `youtube.readonly` scope, service accounts are blocked

### Solutions

#### Option 1: OAuth2 User Authentication (Recommended)
Switch from service account to OAuth2 flow:

1. **Create OAuth2 Credentials** in Google Cloud Console:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs

2. **Implement OAuth2 Flow**:
   ```typescript
   import { OAuth2Client } from 'google-auth-library'

   const oauth2Client = new OAuth2Client(
     process.env.GOOGLE_CLIENT_ID,
     process.env.GOOGLE_CLIENT_SECRET,
     process.env.GOOGLE_REDIRECT_URI
   )

   // Generate auth URL
   const authUrl = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/youtube.readonly']
   })

   // Exchange code for tokens
   const { tokens } = await oauth2Client.getToken(code)
   oauth2Client.setCredentials(tokens)
   ```

3. **Store Refresh Tokens**:
   - Save refresh token securely
   - Use to get new access tokens when needed

#### Option 2: YouTube Channel Owner Access
If you own the YouTube channel (@ticketsnowcoil):

1. Use OAuth2 with the channel owner's Google account
2. Grant offline access to get refresh token
3. Use this token for all comment fetching

#### Option 3: Disable Comments Feature
If OAuth2 is not feasible, disable the comments feature:
- Remove API calls
- Show "Comments available on YouTube" link
- Direct users to watch page

### Recommended Approach

For a production system, **Option 1 (OAuth2)** is best because:
- Allows accessing all public comments
- Works with any video, not just owned channels
- Proper authentication flow
- Can be restricted to specific scopes

## Frontend Integration (Pending)

The frontend component is not yet created. Here's the recommended structure:

### Component: `VideoComments.tsx`
```typescript
'use client'

import { useEffect, useState } from 'react'

interface Comment {
  commentId: string
  authorName: string
  authorProfileUrl?: string
  textDisplay: string
  likeCount: number
  publishedAt: string
  replies: Comment[]
}

export function VideoComments({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/comments/${videoId}`)
      .then(res => res.json())
      .then(data => {
        setComments(data.comments)
        setLoading(false)
      })
  }, [videoId])

  if (loading) return <div>Loading comments...</div>

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">תגובות ({comments.length})</h3>
      {comments.map(comment => (
        <div key={comment.commentId} className="border-r-2 pr-4">
          <div className="flex gap-2 items-start">
            {comment.authorProfileUrl && (
              <img src={comment.authorProfileUrl} className="w-8 h-8 rounded-full" />
            )}
            <div>
              <div className="font-semibold">{comment.authorName}</div>
              <div className="text-gray-700">{comment.textDisplay}</div>
              <div className="text-sm text-gray-500">
                {comment.likeCount} לייקים
              </div>
            </div>
          </div>

          {comment.replies?.length > 0 && (
            <div className="mr-8 mt-2 space-y-2">
              {comment.replies.map(reply => (
                <div key={reply.commentId} className="text-sm">
                  <span className="font-semibold">{reply.authorName}: </span>
                  {reply.textDisplay}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

## Testing

### Manual Testing
```bash
# Test API endpoint
curl http://localhost:3000/api/comments/[VIDEO_ID]

# Check database
npx prisma studio
# Navigate to VideoComment table
```

### Test Data
Once OAuth2 is configured, test with these videos:
- Public videos with many comments
- Videos from @ticketsnowcoil channel
- Videos with replies
- Videos with disabled comments (should return empty array)

## Quota Considerations

### YouTube API Quota
- Each comment fetch uses **1 quota unit** per comment thread
- Default quota: 10,000 units/day
- Fetching 10 comments ≈ 10 units
- With caching (3 days), minimal quota usage

### Optimization
- Cache reduces API calls by 67% (3-day cache vs daily refresh)
- Only fetch when event is initialized or cache expires
- Consider increasing cache to 7 days if quota is an issue

## Next Steps

1. **Implement OAuth2 Authentication**:
   - Set up OAuth2 credentials
   - Create authentication flow
   - Store refresh tokens securely

2. **Create Frontend Component**:
   - Build VideoComments component
   - Add to event detail pages
   - Style with Tailwind CSS (RTL-ready)

3. **Test with Real Data**:
   - Test with various videos
   - Verify reply threading
   - Check cache expiry

4. **Monitor Quota Usage**:
   - Track daily API calls
   - Adjust cache duration if needed
   - Consider rate limiting

## Files Modified

1. `prisma/schema.prisma` - Added VideoComment model
2. `src/services/youtube.service.ts` - Added comment functions
3. `src/app/api/comments/[videoId]/route.ts` - API endpoint
4. `prisma/migrations/` - Database migration

## Documentation Created

- `YOUTUBE_COMMENTS_README.md` - This file
- API documentation in code comments
- Database schema documentation

---

**Status**: ✅ Backend Complete | ⚠️ OAuth2 Required | 🔄 Frontend Pending
**Created**: December 23, 2025
**Last Updated**: December 23, 2025
