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
import { GithubReleasesLoader } from '../../src/loaders/gh_releases.ts'

test.group('Github releases loader', () => {
  test('fetch github releases and write them to a file', async ({ assert, fs }) => {
    const releasesSchema = vine.array(
      vine.object({
        repo: vine.string(),
        name: vine.string(),
        tagName: vine.string(),
        publishedAt: vine.string(),
        url: vine.string(),
      })
    )

    const ghReleaseLoader = new GithubReleasesLoader<typeof releasesSchema>({
      ghToken: env.get('GH_TOKEN'),
      org: 'vinejs',
      outputPath: join(fs.basePath, 'releases.json'),
      refresh: 'weekly',
    })

    const releases = await ghReleaseLoader.load(releasesSchema)
    assert.isArray(releases)
    assert.exists(releases[0].url)
  }).disableTimeout()
})
