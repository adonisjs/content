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
import { GithubSponsorsLoader, ghSponsorsSchema } from '../../src/loaders/gh_sponsors.ts'

test.group('Github sponsors loader', () => {
  test('fetch github sponsors and write them to a file', async ({ assert, fs }) => {
    const ghSponsorsLoader = new GithubSponsorsLoader<typeof ghSponsorsSchema>({
      ghToken: env.get('GH_TOKEN'),
      login: 'thetutlage',
      outputPath: join(fs.basePath, 'sponsors.json'),
      isOrg: false,
      refresh: 'weekly',
    })

    const sponsors = await ghSponsorsLoader.load(ghSponsorsSchema)
    assert.isArray(sponsors)
    assert.exists(sponsors[0].sponsorLogin)
  }).disableTimeout()
})
