import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allowed, clientKeyOf, note, reset } from './rate-limit.mjs'

let seq = 0
const freshKey = (name) => `test:${name}:${process.pid}:${++seq}`

test('allowed 只判断,不占额度', () => {
  const key = freshKey('peek')
  for (let i = 0; i < 5; i++) {
    assert.equal(allowed(key, 2, 60_000), true)
  }
})

test('note 到阈值后 allowed 为 false', () => {
  const key = freshKey('limit')
  assert.equal(allowed(key, 2, 60_000), true)
  note(key)
  assert.equal(allowed(key, 2, 60_000), true)
  note(key)
  assert.equal(allowed(key, 2, 60_000), false)
})

test('窗口外的记录不再计数', async () => {
  const key = freshKey('window')
  note(key)
  assert.equal(allowed(key, 1, 20), false)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(allowed(key, 1, 20), true)
})

test('reset 清空额度', () => {
  const key = freshKey('reset')
  note(key)
  note(key)
  assert.equal(allowed(key, 2, 60_000), false)
  reset(key)
  assert.equal(allowed(key, 2, 60_000), true)
})

test('clientKeyOf 取 X-Forwarded-For 最后一段', () => {
  const req = {
    headers: { 'x-forwarded-for': '203.0.113.9, 198.51.100.7, 192.0.2.1' },
    socket: { remoteAddress: '127.0.0.1' },
  }
  assert.equal(clientKeyOf(req), '192.0.2.1')
})

test('clientKeyOf 没有 XFF 时用 socket 地址', () => {
  const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } }
  assert.equal(clientKeyOf(req), '127.0.0.1')
})
