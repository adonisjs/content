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
import { createCache } from '../../src/utils.ts'

test.group('createCache', () => {
  test('should save and retrieve data from cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    const data = ['item1', 'item2', 'item3']
    await cache.put(data)

    const retrieved = await cache.get()
    assert.deepEqual(retrieved, data)
  })

  test('should return null when cache file does not exist', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'non-existent-cache.json'),
      refresh: 'daily',
    })

    const retrieved = await cache.get()
    assert.isNull(retrieved)
  })

  test('should create directories if they do not exist', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'nested', 'dir', 'cache.json'),
      refresh: 'daily',
    })

    const data = ['item1']
    await cache.put(data)

    await assert.fileExists('nested/dir/cache.json')
  })

  test('should store data under the correct key', async ({ assert, fs }) => {
    const cache = createCache<{ value: string }>({
      key: 'mySpecialKey',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    await cache.put({ value: 'hello' })

    const fileContents = await fs.contents('cache.json')
    const parsed = JSON.parse(fileContents)

    assert.property(parsed, 'mySpecialKey')
    assert.property(parsed, 'lastFetched')
    assert.deepEqual(parsed.mySpecialKey, { value: 'hello' })
  })

  test('should return null for expired daily cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    // Create a cache file with a date from yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(12, 0, 0, 0) // Set to noon yesterday to ensure it's in the past

    const cacheContents = {
      lastFetched: yesterday.toISOString(),
      testData: ['old', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.isNull(retrieved)
  })

  test('should return data for non-expired daily cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    // Create a cache file with a date from 1 hour ago (same day)
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const cacheContents = {
      lastFetched: oneHourAgo.toISOString(),
      testData: ['fresh', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.deepEqual(retrieved, ['fresh', 'data'])
  })

  test('should return null for expired weekly cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'weekly',
    })

    // Create a cache file with a date from 8 days ago
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

    const cacheContents = {
      lastFetched: eightDaysAgo.toISOString(),
      testData: ['old', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.isNull(retrieved)
  })

  test('should return data for non-expired weekly cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'weekly',
    })

    // Create a cache file with a date from 3 days ago (within the week)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const cacheContents = {
      lastFetched: threeDaysAgo.toISOString(),
      testData: ['fresh', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.deepEqual(retrieved, ['fresh', 'data'])
  })

  test('should return null for expired monthly cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'monthly',
    })

    // Create a cache file with a date from 32 days ago
    const thirtyTwoDaysAgo = new Date()
    thirtyTwoDaysAgo.setDate(thirtyTwoDaysAgo.getDate() - 32)

    const cacheContents = {
      lastFetched: thirtyTwoDaysAgo.toISOString(),
      testData: ['old', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.isNull(retrieved)
  })

  test('should return data for non-expired monthly cache', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'monthly',
    })

    // Create a cache file with a date from 15 days ago (within the month)
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    const cacheContents = {
      lastFetched: fifteenDaysAgo.toISOString(),
      testData: ['fresh', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.deepEqual(retrieved, ['fresh', 'data'])
  })

  test('should handle different types of data', async ({ assert, fs }) => {
    const cache1 = createCache<string[]>({
      key: 'stringCache',
      outputPath: join(fs.basePath, 'strings.json'),
      refresh: 'daily',
    })

    const cache2 = createCache<number[]>({
      key: 'numberCache',
      outputPath: join(fs.basePath, 'numbers.json'),
      refresh: 'daily',
    })

    await cache1.put(['a', 'b', 'c'])
    await cache2.put([1, 2, 3])

    const data1 = await cache1.get()
    const data2 = await cache2.get()

    assert.deepEqual(data1, ['a', 'b', 'c'])
    assert.deepEqual(data2, [1, 2, 3])
  })

  test('should throw error for invalid JSON in cache file', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'invalid.json'),
      refresh: 'daily',
    })

    // Write invalid JSON to the cache file
    await fs.create('invalid.json', 'this is not valid JSON')

    await assert.rejects(async () => {
      await cache.get()
    })
  })

  test('should handle complex data types', async ({ assert, fs }) => {
    interface ComplexData {
      id: number
      name: string
      tags: string[]
      metadata: {
        createdAt: string
        updatedAt: string
      }
    }

    const cache = createCache<ComplexData[]>({
      key: 'complexData',
      outputPath: join(fs.basePath, 'complex.json'),
      refresh: 'daily',
    })

    const complexData: ComplexData[] = [
      {
        id: 1,
        name: 'Test Item',
        tags: ['tag1', 'tag2'],
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      },
    ]

    await cache.put(complexData)
    const retrieved = await cache.get()

    assert.deepEqual(retrieved, complexData)
  })

  test('should return data when cache has malformed lastFetched', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    // Create a cache file with malformed lastFetched (missing)
    // This will be treated as non-expired due to Invalid Date behavior
    const cacheContents = {
      testData: ['some', 'data'],
    }

    await fs.create('cache.json', JSON.stringify(cacheContents))

    const retrieved = await cache.get()
    assert.deepEqual(retrieved, ['some', 'data'])
  })

  test('should overwrite existing cache data when put is called', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    await cache.put(['first', 'data'])
    let retrieved = await cache.get()
    assert.deepEqual(retrieved, ['first', 'data'])

    await cache.put(['second', 'data'])
    retrieved = await cache.get()
    assert.deepEqual(retrieved, ['second', 'data'])
  })

  test('should return the same data that was put', async ({ assert, fs }) => {
    const cache = createCache<string[]>({
      key: 'testData',
      outputPath: join(fs.basePath, 'cache.json'),
      refresh: 'daily',
    })

    const data = ['test']
    const result = await cache.put(data)

    assert.strictEqual(result, data)
  })
})
