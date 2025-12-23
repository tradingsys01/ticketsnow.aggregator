import prisma from '@/lib/db'
import VideoComments from './VideoComments'
import { Suspense } from 'react'

interface YouTubeVideosProps {
  eventId: string
  eventName: string
}

// Primary channel name to match for showing comments
const PRIMARY_CHANNEL_NAME = 'כרטיסים עכשיו'

export default async function YouTubeVideos({ eventId, eventName }: YouTubeVideosProps) {
  // Fetch YouTube videos directly from database
  let videos: Array<{
    id: string
    videoId: string
    title: string
    thumbnailUrl: string
    channelTitle: string
  }> = []

  try {
    const dbVideos = await prisma.youTubeVideo.findMany({
      where: {
        eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        checkedAt: 'desc'
      }
    })

    videos = dbVideos.map(video => ({
      id: video.id,
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      channelTitle: video.channelTitle
    }))
  } catch (error) {
    console.error('Failed to fetch YouTube videos:', error)
  }

  if (videos.length === 0) {
    return null
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 border-4 border-pink-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <span className="text-3xl">🎬</span>
        סרטוני תצוגה מקדימה
      </h2>

      <p className="text-gray-600 mb-4 text-sm">
        צפו ב-{videos.length} סרטונים של {eventName}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl overflow-hidden border-2 border-transparent hover:border-pink-400 transition-all"
          >
            {/* Video Embed */}
            <div className="relative aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${video.videoId}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Video Info */}
            <div className="p-3">
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                {video.title}
              </h3>
              <p className="text-xs text-gray-600">
                {video.channelTitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        הסרטונים מ-YouTube ומוצגים למטרות מידע בלבד
      </p>

      {/* Comments for first video - only if from primary channel */}
      {videos.length > 0 && videos[0].channelTitle.includes(PRIMARY_CHANNEL_NAME) && (
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-blue-200 mt-4">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          }
        >
          <VideoComments videoId={videos[0].videoId} />
        </Suspense>
      )}
    </section>
  )
}
