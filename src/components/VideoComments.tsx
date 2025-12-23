import prisma from '@/lib/db'
import Image from 'next/image'

interface VideoCommentsProps {
  videoId: string
}

interface Comment {
  id: string
  commentId: string
  authorName: string
  authorProfileUrl: string | null
  textDisplay: string
  likeCount: number
  publishedAt: Date
  updatedAt: Date
  isReply: boolean
  parentCommentId: string | null
  replies?: Comment[]
}

export default async function VideoComments({ videoId }: VideoCommentsProps) {
  // Fetch comments directly from database
  let comments: Comment[] = []

  try {
    const dbComments = await prisma.videoComment.findMany({
      where: {
        videoId,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: [
        { isReply: 'asc' },
        { likeCount: 'desc' },
        { publishedAt: 'desc' }
      ]
    })

    // Separate top-level comments from replies
    const topLevelComments = dbComments.filter(c => !c.isReply)
    const replies = dbComments.filter(c => c.isReply)

    // Attach replies to parent comments
    comments = topLevelComments.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parentCommentId === comment.commentId)
    }))
  } catch (error) {
    console.error('Failed to fetch video comments:', error)
  }

  if (comments.length === 0) {
    return null
  }

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('he-IL', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  const formatLikes = (count: number) => {
    if (count === 0) return ''
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 border-4 border-blue-200 mt-4">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <span className="text-2xl">💬</span>
        תגובות ({comments.length})
      </h3>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-3">
            {/* Top-level comment */}
            <div className="flex gap-3 items-start">
              {/* Author avatar */}
              <div className="flex-shrink-0">
                {comment.authorProfileUrl ? (
                  <Image
                    src={comment.authorProfileUrl}
                    alt={comment.authorName}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Comment content */}
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.publishedAt)}
                    </span>
                  </div>

                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.textDisplay}
                  </p>

                  {comment.likeCount > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-gray-600">
                      <span className="text-sm">👍</span>
                      <span className="text-xs font-medium">
                        {formatLikes(comment.likeCount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mr-12 space-y-3">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-3 items-start">
                    {/* Reply author avatar */}
                    <div className="flex-shrink-0">
                      {reply.authorProfileUrl ? (
                        <Image
                          src={reply.authorProfileUrl}
                          alt={reply.authorName}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                          {reply.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Reply content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-blue-50 rounded-2xl p-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-gray-900 text-xs">
                            {reply.authorName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(reply.publishedAt)}
                          </span>
                        </div>

                        <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap">
                          {reply.textDisplay}
                        </p>

                        {reply.likeCount > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-gray-600">
                            <span className="text-xs">👍</span>
                            <span className="text-xs font-medium">
                              {formatLikes(reply.likeCount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        תגובות מ-YouTube ומוצגות למטרות מידע בלבד
      </p>
    </section>
  )
}
