---
title: 错误处理与调试
summary: '抛 Error 实例而不是字符串,只有它带调用栈。catch 只处理认识的错误,finally 里不要 return。自定义错误用 cause 保留原始异常,异步边界会切断 try/catch。'
category: frontend
node: frontend-js-error
order: 35
level: 进阶
tags: [JavaScript, 错误处理, Error, 调试, AggregateError]
updated: 2026-11-19
mindmap: js-error.mindmap.json
terms: []
sources:
  - title: MDN · Error
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error
    note: 内置错误类型、message 与 stack 属性。
  - title: MDN · Error.cause
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
    note: 包装底层错误、保留原始原因的用法。
  - title: MDN · AggregateError
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
    note: errors 属性与 Promise.any 的关系。
---

相等比较那篇解决的是「两个值算不算同一个」,前提是代码能跑到比较那一行。真实代码会解析失败、会超时、会拿到 `undefined`,这篇讲出错之后怎么让上层知道,拿到错误之后又怎么定位。

## 内置错误类型

| 类型 | 典型场景 |
| --- | --- |
| `Error` | 通用错误,自定义错误的基类 |
| `TypeError` | 在 `undefined` 上取属性、调用非函数 |
| `RangeError` | `new Array(-1)`、递归过深 |
| `ReferenceError` | 访问 TDZ 里的变量、未声明的名字 |
| `SyntaxError` | `JSON.parse('{')` |
| `AggregateError` | 一次操作里的多个错误,如 `Promise.any` 全部失败 |

它们都继承 `Error`,带 `message`、`name`、`stack` 三个主要属性。`stack` 是访问时才生成的字符串,包含调用链,排查时比 `message` 有用。

## throw 与 catch

`throw` 可以抛任何值,但只有 `Error` 实例带调用栈。

```js
try {
  JSON.parse('{')
} catch (err) {
  if (err instanceof SyntaxError) {
    console.log('JSON 格式不对:', err.message)
  } else {
    throw err   // 不认识的错误继续往上抛
  }
}

// 抛字符串也能接住,但没有 stack
try {
  throw 'oops'
} catch (err) {
  console.log(typeof err, err.stack)   // string undefined
}
```

`catch` 里不要吞错误。只打一行日志然后继续,调用方拿到的是 `undefined`,错误会在后面某处变成 `TypeError: Cannot read properties of undefined`,原始线索全断。要么有明确兜底值,要么重新抛出。

ES2019 起可以省略 catch 的参数:`catch {}`,只做清理不关心错误时用。

## finally 里的 return 会盖掉 try 的

```js
function f() {
  try {
    return 'try'
  } finally {
    return 'finally'
  }
}
f()  // 'finally',返回值被 finally 盖掉

function g() {
  try {
    throw new Error('boom')
  } finally {
    return 'swallowed'
  }
}
g()  // 'swallowed',错误消失了,外面根本不知道出过事
```

`finally` 总是执行,里面的 `return` 直接覆盖 `try` 的返回值,连异常也能吞掉。它只用来做清理:关连接、清定时器、复原状态。不要在里面 `return`。

## 自定义错误与 cause

```js
class ValidationError extends Error {
  constructor(message, { field } = {}) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

try {
  throw new ValidationError('邮箱格式不对', { field: 'email' })
} catch (err) {
  err.name                        // 'ValidationError'
  err.field                       // 'email'
  err instanceof ValidationError  // true
  err instanceof Error            // true
}

// 包装底层错误,cause 保留原始异常
try {
  JSON.parse('{')
} catch (err) {
  const wrapped = new Error('解析配置失败', { cause: err })
  console.log(wrapped.message, wrapped.cause.name)  // 解析配置失败 SyntaxError
}
```

继承 `Error` 时要把 `name` 改成自己的类名,否则日志里全是 `Error`,一眼看不出是哪类问题。必须 `extends Error`,只造一个带 `message` 的普通对象 `instanceof` 不成立。

`cause` 是 ES2022 的选项,控制台会展开显示,日志系统也能读到。写法上把上下文写进 `message`,把原始错误放进 `cause`,两层信息都不丢。

## 异步里的错误

`try/catch` 只捕获同步执行过程中抛出的错误。放进回调、定时器的异常在另一个时刻抛出,捕获不到:

```js
try {
  setTimeout(() => {
    throw new Error('在回调里')
  }, 0)
} catch (err) {
  console.log('不会执行')
}
```

这段代码会直接把进程打挂,`catch` 拿不到。Promise 的拒绝也一样:不 `await` 就不会被 `try` 捕获,`await` 之后才会。这部分在第 7 章讲异步时展开,先记一条结论:异步边界会切断 `try/catch`。

## 多个错误

```js
const errors = [new Error('用户名已被占用'), new Error('邮箱格式不对')]
const err = new AggregateError(errors, '表单校验未通过')

err.message          // '表单校验未通过'
err.errors.length    // 2
err.errors[1].message // '邮箱格式不对'
```

`AggregateError` 是 ES2021 加入的,`Promise.any` 全部失败时抛的就是它。自己做批量校验时也可以直接用,把多个失败原因一次交给上层,而不是只报第一条。

遍历 `err.errors` 时注意子错误不一定是 `Error` 实例,别直接读 `.message` 不看类型。

## 定位问题

```text
1. 看错误类型与 message,判断是数据问题还是调用问题
2. 看 stack 第一行指向自己的代码,还是库内部
3. 能复现就在那一行下 debugger,不能复现就加日志打参数
```

`node --inspect-brk app.js` 会在第一行停下,配合 Chrome 的 `chrome://inspect` 可以逐行执行、看每个作用域里的变量。`debugger` 语句在打开调试器时同样会断住,提交前记得删掉。

`console.trace()` 在当前位置打印调用栈,比 `console.log` 多一层信息,适合确认「这个方法到底被谁调的」。

浏览器控制台的 `console.log(obj)` 存的是对象引用,展开时读的是那一刻的值,不是打印时的快照。要留快照就先 `structuredClone` 或 `JSON.stringify` 再打。Node 的 `console.log` 会立即格式化,行为不一样。

## 小结

- 抛 `Error` 实例而不是字符串,只有实例带调用栈;
- `catch` 只处理认识的错误,其余重新抛出,吞掉会让线索断在别处;
- `finally` 里不要 `return`,它会覆盖返回值,也会吞掉异常;
- 自定义错误 `extends Error` 并改 `name`,包装时用 `cause` 保留原始错误;
- 异步边界会切断 `try/catch`,回调与未 `await` 的 Promise 要单独处理;
- `AggregateError.errors` 装同一次操作里的多个失败原因;
- 调试先看 `stack` 的第一行,再决定是加日志还是下断点。
