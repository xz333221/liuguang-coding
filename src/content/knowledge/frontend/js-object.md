---
title: 对象、原型链与 class
summary: '属性先查自身，找不到就沿 [[Prototype]] 往上找，终点是 null。new 做四件事：建对象、连原型、以它为 this 执行构造函数、按返回值决定结果。class 是这套机制的语法。'
category: frontend
node: frontend-js-object
order: 31
level: 进阶
tags: [JavaScript, 原型链, 对象, class, new]
updated: 2026-11-19
mindmap: js-object.mindmap.json
terms: []
sources:
  - title: MDN · 对象原型
    url: https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Object_prototypes
    note: 原型链的查找过程与 Object.getPrototypeOf。
  - title: MDN · 类
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes
    note: class 的方法定义位置、私有字段与 extends。
  - title: javascript.info · 原型,继承
    url: https://zh.javascript.info/prototype-inheritance
    note: '[[Prototype]] 与原型链的图解。'
---

闭包靠函数作用域把状态藏起来，对象靠属性把状态摆出来。属性从哪来、找不到时继续去哪找，由原型链决定。

## 创建与访问

```js
const user = {
  name: 'a',
  ['id' + 1]: 7,          // 计算属性名,结果是 id1
  greet() { return this.name },
}

user.name        // 'a'
user['name']     // 'a'
user.age         // undefined,不存在也不报错

const config = { port: 0 }
const city = user?.address?.city   // 中途遇到 null/undefined 就返回 undefined
const port = config.port ?? 3000   // 0 被保留
```

两种访问方式等价，方括号里可以放变量，所以拼键名、遍历时都用方括号。取不到属性返回 `undefined`，只有对 `undefined` 再取属性才会抛 `TypeError`。

`??` 与 `||` 的差别在于 `0`、`''`、`false`:前者保留，后者会被替换成默认值。端口号、分页大小这类可能是 0 的字段，必须用 `??`。

## 属性属于谁

`in` 会查原型链，`Object.hasOwn` 只看自身。

```js
const obj = Object.create({ inherited: 1 })
obj.own = 2

'inherited' in obj               // true
Object.hasOwn(obj, 'inherited')  // false
Object.hasOwn(obj, 'own')        // true
Object.keys(obj)                 // ['own'],只列出自身可枚举属性
```

| 判断方式 | 查原型链 | 包含不可枚举 | 用途 |
| --- | --- | --- | --- |
| `in` | 是 | 是 | 判断属性是否可访问 |
| `Object.hasOwn` | 否 | 是 | 判断是不是自己的属性 |
| `Object.keys` | 否 | 否 | 遍历自己的可枚举键 |
| `for...in` | 是 | 否 | 遍历可枚举键，含继承的 |

`for...in` 会连原型上可枚举的属性一起遍历。别人的库往 `Object.prototype` 上加过方法时，循环里就会多出一项。要么用 `Object.keys`，要么在循环里加 `Object.hasOwn` 过滤。

## 原型链

每个对象有一个内部槽 `[[Prototype]]`，指向另一个对象或 `null`。访问 `obj.x` 时：自己有就返回，没有就沿 `[[Prototype]]` 往上找，直到 `null` 为止。

```js
const animal = { speak() { return 'sound' } }
const dog = Object.create(animal)
dog.name = 'wang'

dog.speak()                            // 'sound',从原型上找到
Object.getPrototypeOf(dog) === animal  // true

Object.getPrototypeOf({}) === Object.prototype    // true
Object.getPrototypeOf(Object.prototype) === null  // true,链的终点
```

数组的链多一层：`[]` → `Array.prototype` → `Object.prototype` → `null`。所以在数组上能调 `map`(来自 `Array.prototype`)，也能调 `toString`(来自 `Object.prototype`)。

`obj.__proto__` 是访问 `[[Prototype]]` 的遗留访问器，规范把它放在 `Object.prototype` 上。现在用 `Object.getPrototypeOf` 和 `Object.setPrototypeOf`，后者会让引擎重建属性缓存，不要在热路径上调用。

## new 的四步

构造函数加上 `new` 才有原型可连。下面把正常写法和手写版本放在一起，后者正好是那四步：
```js
function Person(name) {
  this.name = name
}
Person.prototype.greet = function () {
  return `hi, ${this.name}`
}

const p = new Person('a')
p.greet()  // 'hi, a'

// 等价的手写版本
function fakeNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype)   // 1 建对象,2 连原型
  const result = Ctor.apply(obj, args)        // 3 以 obj 为 this 执行
  const isObject = result !== null && (typeof result === 'object' || typeof result === 'function')
  return isObject ? result : obj              // 4 按返回值决定
}
```

第 4 步是坑：`return {}` 会顶掉新对象，`return 1` 被忽略。函数也算对象，`return function () {}` 同样会顶掉。

`instanceof` 就是沿这条链找：只要构造函数的 `prototype` 出现在对象的原型链上，结果就是 `true`。所以 `p instanceof Person` 为真，`p instanceof Object` 也为真。

## class 是原型的另一套写法

```js
class Person {
  #id = Math.random()   // 私有字段,每个实例一份

  constructor(name) {
    this.name = name
  }

  greet() { return `hi, ${this.name}` }

  static create(name) { return new Person(name) }
}

const p = Person.create('a')
p.greet()      // 'hi, a'
// p.#id       →  SyntaxError: Private field '#id' must be declared in an enclosing class
```

对应关系：

- `greet` 定义在 `Person.prototype` 上，并且不可枚举，所以 `Object.keys(p)` 拿不到它；
- `#id` 是每个实例自己的字段，外部访问是语法错误，不是 `undefined`;
- `static` 方法挂在构造函数本身，不挂在原型上；
- `class` 声明也会提升，但在初始化之前处于 TDZ，提前使用抛 `ReferenceError`;
- 不加 `new` 调用类会抛 `TypeError: Class constructor cannot be invoked without 'new'`。

`extends` 把两条链都接上：`Object.getPrototypeOf(Child.prototype)` 是 `Parent.prototype`,`Object.getPrototypeOf(Child)` 是 `Parent`。子类构造函数里必须先 `super()` 再用 `this`，因为 `this` 由父类创建。

## 别改内置原型

往 `Object.prototype` 上加方法，所有对象都会继承它。后果有三个：`for...in` 会多遍历一项、和别人的库撞名时很难查、内置对象的属性查找变慢。

要扩展就写成普通函数，`Object.keys(obj)` 而不是 `obj.keys()`。这是标准库这两年的方向：方法放到构造函数上，不放到实例上。

需要纯粹的键值容器时用 `Object.create(null)`，它没有原型：`dict.toString` 是 `undefined`,`'toString' in dict` 也是 `false`，存用户输入的键名时不用担心 `__proto__`、`constructor` 这类键名搞出意外行为。

## 小结

- 属性查找先自身后原型，终点是 `null`,`Object.prototype` 的原型就是 `null`;
- `in` 查原型链，`Object.hasOwn` 只看自身，遍历用 `Object.keys`;
- `new` 四步：建对象、连原型、执行构造函数、按返回值决定结果；
- `instanceof` 沿原型链查构造函数是否出现过；
- `class` 是原型的语法，方法不可枚举，`#` 字段是真正的私有；
- 不要改 `Object.prototype`，纯字典用 `Object.create(null)`。
