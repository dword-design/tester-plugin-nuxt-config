import { endent, property } from '@dword-design/functions'
import tester from '@dword-design/tester'
import axios from 'axios'
import { JSDOM } from 'jsdom'

import self from './index.js'

export default tester(
  {
    'build error': {
      config: {
        modules: [
          () => {
            throw new Error('foo')
          },
        ],
      },
      error: 'foo',
    },
    nuxt3: {
      files: {
        'pages/index.vue': endent`
          <template>
            <div :class="foo" />
          </template>

          <script setup>
          const foo = 'foo'
          </script>
        `,
      },
      nuxtVersion: 3,
      test: async () => {
        const dom = new JSDOM(
          (await axios.get('http://localhost:3000'))
            |> await
            |> property('data'),
        )
        expect(dom.window.document.querySelectorAll('.foo').length).toEqual(1)
      },
    },
    'nuxt3: config': {
      config: {
        modules: ['./modules/foo'],
      },
      files: {
        'modules/foo': {
          'index.js': endent`
            import { addPlugin, createResolver } from '@nuxt/kit'

            const resolver = createResolver(import.meta.url)

            export default () => addPlugin(resolver.resolve('./plugin.js'), { append: true })
          `,
          'plugin.js':
            "export default (context, inject) => inject('foo', 'foo')",
        },
        'pages/index.vue': endent`
          <template>
            <div :class="$foo" />
          </template>

          <script setup>
          const { $foo } = useNuxtApp()
          </script>
        `,
      },
      nuxtVersion: 3,
      test: async () => {
        const dom = new JSDOM(
          (await axios.get('http://localhost:3000'))
            |> await
            |> property('data'),
        )
        expect(dom.window.document.querySelectorAll('.foo').length).toEqual(1)
      },
    },
    works: {
      config: {
        plugins: ['~/plugins/foo.js'],
      },
      files: {
        'pages/index.vue': endent`
          <template>
            <div :class="$foo" />
          </template>
        `,
        'plugins/foo.js': endent`
          export default (context, inject) => inject('foo', 'foo')
        `,
      },
      test: async () => {
        const dom = new JSDOM(
          (await axios.get('http://localhost:3000'))
            |> await
            |> property('data'),
        )
        expect(dom.window.document.querySelectorAll('.foo').length).toEqual(1)
      },
    },
  },
  [self()],
)
