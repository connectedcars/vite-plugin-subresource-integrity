import { createHash } from 'node:crypto'
import { load } from 'cheerio'
import { Plugin } from 'vite'

interface SubresourceIntegrityOptions {
  algorithm: 'sha256' | 'sha384' | 'sha512'
}

const subresourceIntegrityPlugin = (
  options?: SubresourceIntegrityOptions
): Plugin => {
  options = {
    algorithm: 'sha512',
    ...options,
  }

  return {
    name: '@connectedcars/vite-plugin-subresource-integrity',
    enforce: 'post',
    apply: 'build',

    transformIndexHtml: async (html, context) => {
      const doc = load(html)

      const files = [
        ...doc('script').filter('[src]'),
        ...doc('link').filter('[href]'),
      ]

      for (const script of files) {
        const src = script.attribs.src || script.attribs.href
        if (!src || /^(https?|data):/.test(src)) {
          continue
        }

        const outputBundle = context.bundle?.[src.slice(1)]
        if (!outputBundle) {
          continue
        }

        const content =
          outputBundle.type === 'asset'
            ? outputBundle.source
            : outputBundle.code

        const hash = createHash(options.algorithm)
          .update(content)
          .digest()
          .toString('base64')

        script.attribs.integitry = `${options.algorithm.toLowerCase()}-${hash}`
      }

      return doc.html()
    },
  }
}

export default subresourceIntegrityPlugin
