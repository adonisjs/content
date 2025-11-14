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
import { GithubSponsorsLoader } from '../../src/loaders/gh_sponsors.ts'

test.group('Github sponsors loader', () => {
  test('fetch github sponsors and write them to a file', async ({ assert, fs }) => {
    const releasesSchema = vine.array(
      vine.object({
        id: vine.string(),
        createdAt: vine.string(),
        privacyLevel: vine.string().nullable(),
        tierName: vine.string().nullable(),
        tierMonthlyPriceInCents: vine.number().nullable(),
        sponsorType: vine.string(),
        sponsorLogin: vine.string(),
        sponsorName: vine.string().optional(),
        sponsorAvatarUrl: vine.string().optional(),
        sponsorUrl: vine.string().optional(),
      })
    )

    const ghSponsorsLoader = new GithubSponsorsLoader<typeof releasesSchema>({
      ghToken: env.get('GH_TOKEN'),
      login: 'thetutlage',
      outputPath: join(fs.basePath, 'sponsors.json'),
      isOrg: false,
      refresh: 'weekly',
    })

    const sponsors = await ghSponsorsLoader.load(releasesSchema)
    assert.isArray(sponsors)
    assert.exists(sponsors[0].sponsorLogin)
  })
})
