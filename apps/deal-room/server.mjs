// Custom dev server: Vite (React UI) + the /api backend in one process/port.
// Run with `npm run dev`. Reads your Obsidian vault + Beehiiv; writes stage and
// editable fields back to vault frontmatter only.
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { apiRouter } from './server/api.mjs'
import {
  PORT,
  VAULT_PATH,
  CONTENT_DIRS,
  BEEHIIV_API_KEY,
} from './server/config.mjs'

async function main() {
  const app = express()

  // API first so it isn't swallowed by Vite's SPA fallback
  app.use('/api', apiRouter())

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)

  app.listen(PORT, () => {
    console.log(`\n  The Deal Room — content pipeline`)
    console.log(`  ➜  http://localhost:${PORT}`)
    console.log(`  vault:   ${VAULT_PATH}`)
    console.log(`  reading: ${CONTENT_DIRS.join(', ')} + Beehiiv`)
    console.log(
      `  beehiiv: ${BEEHIIV_API_KEY ? 'live API' : 'cached snapshot (set BEEHIIV_API_KEY for live)'}\n`,
    )
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
