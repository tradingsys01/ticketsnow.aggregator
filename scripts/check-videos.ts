import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVideos() {
  const total = await prisma.youTubeVideo.count()
  const fromPrimaryChannel = await prisma.youTubeVideo.count({
    where: {
      channelTitle: {
        contains: 'כרטיסים עכשיו'
      }
    }
  })
  
  console.log('\nTotal YouTube videos cached:', total)
  console.log('Videos from @ticketsnowcoil:', fromPrimaryChannel)
  console.log('Videos from other channels:', total - fromPrimaryChannel)
  
  await prisma.$disconnect()
}

checkVideos()
