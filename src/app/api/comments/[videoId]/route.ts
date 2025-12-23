import { NextRequest, NextResponse } from 'next/server'
import { getVideoComments } from '@/services/youtube.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Fetch comments (with caching)
    const comments = await getVideoComments(videoId)

    // Separate top-level comments and replies
    const topLevelComments = comments.filter(c => !c.isReply)
    const replies = comments.filter(c => c.isReply)

    // Group replies by parent comment ID
    const commentMap = new Map()

    topLevelComments.forEach(comment => {
      commentMap.set(comment.commentId, {
        ...comment,
        replies: []
      })
    })

    replies.forEach(reply => {
      const parent = commentMap.get(reply.parentCommentId)
      if (parent) {
        parent.replies.push(reply)
      }
    })

    const commentsWithReplies = Array.from(commentMap.values())

    return NextResponse.json({
      videoId,
      total: comments.length,
      topLevelCount: topLevelComments.length,
      replyCount: replies.length,
      comments: commentsWithReplies,
      fromCache: comments.length > 0 && comments[0].checkedAt !== undefined
    })

  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch comments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
