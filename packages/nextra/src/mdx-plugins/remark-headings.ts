import type { Processor } from '@mdx-js/mdx/lib/core'
import Slugger from 'github-slugger'
import type { Parent, Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import type { PageOpts } from '../types'
import type { HProperties } from './remark-custom-heading-id'

const getFlattenedValue = (node: Parent): string =>
  node.children
    .map(child =>
      'children' in child
        ? getFlattenedValue(child)
        : 'value' in child
        ? child.value
        : ''
    )
    .join('')

export const remarkHeadings: Plugin<[], Root> = function (this: Processor) {
  const { headingMeta } = this.data() as {
    headingMeta: Pick<PageOpts, 'headings' | 'hasJsxInH1'>
  }
  const slugger = new Slugger()
  return (tree, _file, done) => {
    visit(
      tree,
      [
        // Match headings and <details>
        { type: 'heading' },
        { name: 'summary' },
        { name: 'details' }
      ],
      node => {
        if (node.type === 'heading') {
          const hasJsxInH1 =
            node.depth === 1 &&
            Array.isArray(node.children) &&
            node.children.some(
              (child: { type: string }) => child.type === 'mdxJsxTextElement'
            )
          const value = getFlattenedValue(node)

          node.data ||= {}
          const headingProps = (node.data.hProperties ||= {}) as HProperties
          const id = slugger.slug(headingProps.id || value)
          // Attach flattened/custom #id to heading node
          headingProps.id = id

          const heading = {
            depth: node.depth,
            value,
            id
          }
          headingMeta.headings.push(heading)
          if (hasJsxInH1) {
            headingMeta.hasJsxInH1 = true
          }

          return
        }

        // Replace the <summary> and <details> with customized components.
        if (node.data) {
          delete node.data._mdxExplicitJsx
        }
      }
    )
    done()
  }
}
