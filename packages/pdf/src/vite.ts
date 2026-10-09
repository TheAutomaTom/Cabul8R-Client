import { createRequire } from 'node:module'
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import type { Plugin } from 'vite'

const DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs']
const TYPES: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
}

/**
 * Serves pdf.js data files (character maps, standard fonts, WASM image decoders, ICC profiles)
 * at `pdfjs/<dir>/` in dev and copies them into the build, so plans render fully offline.
 */
export function pdfjsAssets(): Plugin {
  const root = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
  const files = () =>
    DIRS.flatMap((dir) =>
      readdirSync(join(root, dir))
        .filter((f) => statSync(join(root, dir, f)).isFile())
        .map((f) => `${dir}/${f}`),
    )
  return {
    name: 'cabul8r:pdfjs-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /\/pdfjs\/([^?]+)/.exec(req.url ?? '')
        const rel = match?.[1]
        if (!rel || !DIRS.includes(rel.split('/')[0]!) || rel.includes('..')) return next()
        const file = join(root, rel)
        if (!existsSync(file)) return next()
        res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      for (const rel of files())
        this.emitFile({
          type: 'asset',
          fileName: `pdfjs/${rel}`,
          source: readFileSync(join(root, rel)),
        })
    },
  }
}
