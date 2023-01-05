import { buildNuxt, loadNuxt } from '@nuxt/kit'
import { execaCommand } from 'execa'
import expect from 'expect'
import fs from 'fs-extra'
import ora from 'ora'
import outputFiles from 'output-files'
import { pEvent } from 'p-event'
import P from 'path'
import kill from 'tree-kill-promise'
import { fileURLToPath } from 'url'
import withLocalTmpDir from 'with-local-tmp-dir'

export default () => ({
  before: async () => {
    await fs.outputFile(
      P.join('node_modules', '.cache', 'tester', 'nuxt2', 'package.json'),
      JSON.stringify({})
    )

    const spinner = ora('Installing Nuxt 2').start()
    await execaCommand('yarn add nuxt@^2', {
      cwd: P.join('node_modules', '.cache', 'tester', 'nuxt2'),
    })
    spinner.stop()
  },
  transform: config => {
    config.nuxtVersion = config.nuxtVersion || 2
    config.config = config.config || {}
    config.test = config.test || (() => {})

    return function () {
      return withLocalTmpDir(async () => {
        await outputFiles({
          'nuxt.config.js': `export default ${JSON.stringify(config.config)}`,
          'package.json': JSON.stringify({ type: 'module' }),
          ...config.files,
        })
        if (config.nuxtVersion === 3) {
          // Loads package.json of nuxt, nuxt3 or nuxt-edge from cwd
          // Does not work with symlink (Cannot read property send of undefined)
          console.log(buildNuxt)
          console.log(loadNuxt)
          // const nuxt = await loadNuxt({ config: config.config })
          // await buildNuxt(nuxt)
          await execaCommand('nuxt build')

          const childProcess = execaCommand('nuxt start', { all: true })
          await pEvent(
            childProcess.all,
            'data',
            data => data.toString() === 'Listening http://[::]:3000\n'
          )
          try {
            await config.test.call(this)
          } finally {
            await kill(childProcess.pid)
          }
        } else {
          // Loads @nuxt/vue-app from cwd
          await fs.symlink(
            P.join(
              '..',
              'node_modules',
              '.cache',
              'tester',
              'nuxt2',
              'node_modules'
            ),
            'node_modules'
          )

          const nuxtImport = await import(
            `./${P.relative(
              P.dirname(fileURLToPath(import.meta.url)),
              './node_modules/nuxt/dist/nuxt.js'
            )
              .split(P.sep)
              .join('/')}`
          )

          const Nuxt = nuxtImport.Nuxt

          const Builder = nuxtImport.Builder

          const nuxt = new Nuxt({
            dev: false,
            telemetry: false,
            ...config.config,
          })
          if (config.error) {
            await expect(new Builder(nuxt).build()).rejects.toThrow(
              config.error
            )
          } else {
            await new Builder(nuxt).build()
            await nuxt.listen()
            try {
              await config.test.call(this)
            } finally {
              await nuxt.close()
            }
          }
        }
      })
    }
  },
})
