// Ingest published articles into the S3 Vectors index for the assistant's RAG.
// Run:  cd ai-backend/ingest && AWS_PROFILE=personal node ingest.mjs
import { articles } from '../../src/content/articles.js'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { S3VectorsClient, PutVectorsCommand } from '@aws-sdk/client-s3vectors'

const REGION = 'ap-southeast-2'
const BUCKET = 'nealon-vectors'
const INDEX = 'articles'
const bedrock = new BedrockRuntimeClient({ region: REGION })
const s3v = new S3VectorsClient({ region: REGION })

const stripMd = (body) =>
  body
    .replace(/```[\s\S]*?```/g, ' ')         // drop code / mermaid fences
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // markdown links -> text
    .replace(/[#*_>`|]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

function chunk(text, max = 900) {
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const out = []
  let cur = ''
  for (const p of paras) {
    if ((cur + ' ' + p).length > max && cur) { out.push(cur.trim()); cur = p }
    else cur = cur ? cur + '\n\n' + p : p
  }
  if (cur) out.push(cur.trim())
  return out
}

async function embed(text) {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text, dimensions: 1024, normalize: true }),
  }))
  return JSON.parse(new TextDecoder().decode(res.body)).embedding
}

const published = articles.filter((a) => a.published)
const vectors = []
for (const a of published) {
  const chunks = chunk(stripMd(a.body))
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(`${a.title}. ${a.dek}\n\n${chunks[i]}`)
    vectors.push({
      key: `${a.slug}#${i}`,
      data: { float32: embedding },
      metadata: { slug: a.slug, title: a.title, dek: a.dek, text: chunks[i] },
    })
    process.stdout.write('.')
  }
}
console.log(`\nembedded ${vectors.length} chunks from ${published.length} articles`)

// batch (S3 Vectors PutVectors accepts up to 500/call; we have far fewer)
for (let i = 0; i < vectors.length; i += 200) {
  await s3v.send(new PutVectorsCommand({
    vectorBucketName: BUCKET,
    indexName: INDEX,
    vectors: vectors.slice(i, i + 200),
  }))
}
console.log('ingested into s3 vectors index:', INDEX)
