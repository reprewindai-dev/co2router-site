#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const QUEUE_PATH = path.join(ROOT, 'content', 'blog-queue.json')
const FEED_PATH = path.join(ROOT, 'src', 'content', 'blog-posts.json')
const PUBLIC_MEDIA_DIR = path.join(ROOT, 'public', 'blog-media')

const DEFAULT_MEDIA = [
  {
    src: '/blog-media/halo-grid-earth-night.jpg',
    sourceFile: path.join(ROOT, 'public', 'halogrid', 'earth-night.jpg'),
  },
  {
    src: '/blog-media/halo-grid-earth-day.jpg',
    sourceFile: path.join(ROOT, 'public', 'halogrid', 'earth-day.jpg'),
  },
  {
    src: '/blog-media/halo-grid-topology.png',
    sourceFile: path.join(ROOT, 'public', 'halogrid', 'earth-topology.png'),
  },
]

function pretty(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return raw.trim() ? JSON.parse(raw) : fallback
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback
    }
    throw error
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, pretty(value), 'utf8')
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function seedQueueItem(nowIso) {
  const dateKey = nowIso.slice(0, 10)
  return {
    id: `halogrid-proof-first-routing-${dateKey}`,
    slug: `halogrid-proof-first-routing-${dateKey}`,
    title: 'HaloGrid Makes Carbon Routing Auditable Before Workloads Run',
    deck: 'A publishable field note on how CO2 Router turns site imagery, provenance, and policy signals into a revenue-facing proof layer.',
    summary: 'HaloGrid now pairs its globe and topology media with a proof-first narrative for enterprise buyers who need audit-ready routing.',
    author: 'CO2 Router Editorial Desk',
    publishedAt: nowIso,
    tags: ['HaloGrid', 'Proof', 'Provenance', 'Carbon Routing'],
    media: DEFAULT_MEDIA.map((item, index) => ({
      src: item.src,
      source: item.sourceFile.replace(`${ROOT}\\public`, '').replaceAll('\\', '/'),
      alt:
        index === 0
          ? 'HaloGrid night earth render used as the hero image'
          : index === 1
            ? 'HaloGrid daylight earth render used for supporting imagery'
            : 'HaloGrid topology texture used for technical detail panels',
    })),
    body: [
      'HaloGrid exists to make routing decisions visible enough for buyers, operators, and reviewers to trust them.',
      'The proof layer matters because the value of carbon-aware routing is not just lower intensity. It is the ability to explain why a workload moved, who approved it, and what evidence supported the decision.',
      'This post pairs the existing CO2 Router visual themes with a buyer-facing message: premium routing needs proof, not just optimization.',
    ],
  }
}

async function ensureMedia(mediaItems) {
  await fs.mkdir(PUBLIC_MEDIA_DIR, { recursive: true })

  for (const item of mediaItems) {
    const fileName = path.basename(item.src)
    const destination = path.join(PUBLIC_MEDIA_DIR, fileName)
    await fs.copyFile(item.sourceFile ?? path.join(ROOT, 'public', item.source.replace(/^\//, '')), destination)
  }
}

function normalizePost(post) {
  const title = post.title || 'Untitled post'
  const slug = post.slug || slugify(title)
  const publishedAt = post.publishedAt || new Date().toISOString()
  return {
    id: post.id || slug,
    slug,
    title,
    deck: post.deck || post.summary || '',
    summary: post.summary || post.deck || '',
    author: post.author || 'CO2 Router Editorial Desk',
    publishedAt,
    tags: Array.isArray(post.tags) ? post.tags : [],
    media: Array.isArray(post.media) ? post.media : [],
    body: Array.isArray(post.body) ? post.body : [],
    status: 'published',
  }
}

async function main() {
  const nowIso = new Date().toISOString()
  let queue = await readJson(QUEUE_PATH, [])

  if (!Array.isArray(queue)) {
    queue = []
  }

  if (queue.length === 0) {
    queue = [seedQueueItem(nowIso)]
    await writeJson(QUEUE_PATH, queue)
  }

  const [nextPost, ...remaining] = queue
  if (!nextPost) {
    throw new Error('No queued blog posts available to publish.')
  }

  const feed = await readJson(FEED_PATH, [])
  const normalizedFeed = Array.isArray(feed) ? feed : []
  const normalizedPost = normalizePost({
    ...nextPost,
    publishedAt: nowIso,
  })

  await ensureMedia(normalizedPost.media)

  const alreadyPublished = normalizedFeed.some((entry) => entry.slug === normalizedPost.slug || entry.id === normalizedPost.id)
  const nextFeed = alreadyPublished ? normalizedFeed : [...normalizedFeed, normalizedPost]

  await writeJson(FEED_PATH, nextFeed)
  await writeJson(QUEUE_PATH, remaining)

  console.log(`Published blog post: "${normalizedPost.title}"`)
  console.log(`Feed updated: ${path.relative(ROOT, FEED_PATH)}`)
  console.log(`Queue remaining: ${remaining.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
