/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { env } from '../helpers.ts'
import { GithubProjectLoader, ghProjectSchema } from '../../src/loaders/gh_project.ts'

test.group('Github project loader', () => {
  test('fetch project cards and write them to a file', async ({ assert, fs }) => {
    const ghProjectLoader = new GithubProjectLoader<typeof ghProjectSchema>({
      ghToken: env.get('GH_TOKEN'),
      login: 'adonisjs',
      isOrg: true,
      projectNumber: 8,
      outputPath: join(fs.basePath, 'project.json'),
      refresh: 'weekly',
    })

    const cards = await ghProjectLoader.load(ghProjectSchema)
    assert.isArray(cards)
  }).disableTimeout()

  test('skip cards by status', async ({ assert, fs }) => {
    const ghProjectLoader = new GithubProjectLoader<typeof ghProjectSchema>({
      ghToken: env.get('GH_TOKEN'),
      login: 'adonisjs',
      isOrg: true,
      projectNumber: 8,
      outputPath: join(fs.basePath, 'project-filtered.json'),
      refresh: 'weekly',
      skipStatuses: ['Done'],
    })

    const cards = await ghProjectLoader.load(ghProjectSchema)
    assert.isArray(cards)
    for (const card of cards) {
      if (card.status) {
        assert.notEqual(card.status.toLowerCase(), 'done')
      }
    }
  }).disableTimeout()
})
