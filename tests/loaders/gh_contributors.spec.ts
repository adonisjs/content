/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine from '@vinejs/vine'
import { join } from 'node:path'
import { test } from '@japa/runner'
import { env } from '../helpers.ts'
import { GithubContributorsLoader } from '../../src/loaders/gh_contributors.ts'

test.group('Github contributors loader', () => {
  test('fetch github contributors and write them to a file', async ({ assert, fs }) => {
    const contributorsSchema = vine.array(
      vine.object({
        login: vine.string(),
        id: vine.number().optional(),
        avatar_url: vine.string().optional(),
        html_url: vine.string().optional(),
        contributions: vine.number(),
      })
    )

    const ghContributorsLoader = new GithubContributorsLoader<typeof contributorsSchema>({
      ghToken: env.get('GH_TOKEN'),
      org: 'japa',
      outputPath: join(fs.basePath, 'contributors.json'),
      refresh: 'weekly',
    })

    const contributors = await ghContributorsLoader.load(contributorsSchema)
    assert.isArray(contributors)
    assert.exists(contributors[0].login)
  }).disableTimeout()
})
