---
title: 线性结构:数组 / 链表 / 栈 / 队列
summary: '数组靠连续内存实现 O(1) 随机访问但插入删除要移动元素,ArrayList 以 1.5 倍扩容封装数组,LinkedList 的节点额外保存两个引用且缓存不友好;栈与队列分别是后进先出和先进先出的受限线性表,Java 中用 ArrayDeque 实现。'
category: java
node: java-algorithm-linear
order: 90
level: 进阶
tags: [数组, 链表, 栈, 队列, ArrayList]
updated: 2026-11-19
mindmap: linear-structures.mindmap.json
terms: ["basic-operation", "in-place-algorithm", "reference"]
sources:
  - title: Algorithms, 4th Edition · Elementary Data Structures
    url: https://algs4.cs.princeton.edu/home/
    note: 数组、链表、栈与队列的代价分析。
  - title: OI Wiki · 栈与队列
    url: https://oi-wiki.org/
    note: 受限线性表的基本操作与应用场景。
---

上一篇给出了估算复杂度的工具:看增长趋势,数循环与递归。工具要用在具体结构上才有意义,这一篇从最基础的线性结构开始:数组、链表、栈和队列。

## 数组:连续内存与随机访问

数组是一段连续的内存,元素按顺序排列,每个元素占固定字节数。给定首地址和下标,第 i 个元素的地址可以直接算出来,所以下标访问 `a[i]` 是一次基本操作,代价 O(1),与数组长度无关。

代价在插入和删除:在中间位置插入一个元素,后面所有元素都要后移一位,O(n);删除同理。Java 的数组长度固定,扩容只能新建一个更大的数组再复制。

```java
int[] a = {3, 1, 4, 1, 5};
System.out.println(a[2]);                     // 4,下标直接算出地址

int[] b = new int[6];
System.arraycopy(a, 0, b, 0, 3);              // 复制前 3 个
b[3] = 9;                                     // 在中间插入
System.arraycopy(a, 3, b, 4, a.length - 3);   // 后面的元素整体后移
System.out.println(Arrays.toString(b));       // [3, 1, 4, 9, 1, 5]
```

## ArrayList 与 LinkedList

ArrayList 内部就是一个 Object 数组,默认容量 10。元素超过容量时按 1.5 倍扩容(`old + (old >> 1)`),新建数组并复制全部元素,单次扩容 O(n),均摊到每次 add 是 O(1)。

LinkedList 是双向链表,每个节点是一个独立对象,保存前驱引用、后继引用和数据。节点分散在堆上,一个节点除了数据还要付出对象头和两个引用的开销;遍历时 CPU 缓存命中率也低于连续数组。

第 6 章集合框架讲过 List 的接口与迭代器,这里只比较代价:

```java
List<Integer> list = new ArrayList<>();          // 默认容量 10,满了按 1.5 倍扩容
for (int i = 0; i < 1000; i++) list.add(i);       // 过程中多次扩容与整体复制

List<Integer> planned = new ArrayList<>(1000);    // 预设容量,一次分配
```

多数场景选 ArrayList:按索引读取是 O(1),尾部追加均摊 O(1),内存紧凑。LinkedList 的优势只在「已经持有节点、要就地插入删除」时成立,而这种需求在业务代码里很少;需要频繁操作两端时,ArrayDeque 通常比 LinkedList 更合适。

## 链表:反转与快慢指针

链表题的两个基本动作是改引用和走指针。反转单链表用三个引用依次右移,不需要额外空间,属于原地算法(in-place algorithm):

```java
class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

static ListNode reverse(ListNode head) {
    ListNode prev = null;
    ListNode cur = head;
    while (cur != null) {
        ListNode next = cur.next;                 // 先保存后继,防止断链
        cur.next = prev;                          // 改指向
        prev = cur;
        cur = next;
    }
    return prev;                                  // prev 是新头
}
```

循环结束时 prev 指向原链表最后一个节点,它成为新头。三个引用的顺序不能调换:先保存 next,再改 cur.next,最后整体前移。

快慢指针用于判断链表是否有环。慢指针每次一步,快指针每次两步:

```java
static boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;                         // 一步
        fast = fast.next.next;                    // 两步
        if (slow == fast) return true;            // 有环必然相遇
    }
    return false;                                 // 无环,快指针先到末尾
}
```

有环时,两个指针进入环后快指针每轮追近一步,环长有限,一定追上;无环时快指针先遇到 null。要寻找环的入口,可以在相遇后让一个指针回到 head,两者都改为每次一步,再次相遇的位置就是入口。

## 栈与队列

栈是后进先出(LIFO)的线性表,只在同一端插入和删除;队列是先进先出(FIFO),一端进、另一端出。两者都限制访问位置,换来清晰的操作语义。

Java 中用 Deque 接口和 ArrayDeque 实现,同一个类可以当栈或当队列:

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2);
System.out.println(stack.pop());          // 2,后进先出

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1); queue.offer(2);
System.out.println(queue.poll());         // 1,先进先出
```

不要用遗留的 Stack 类:它继承 Vector,每个方法都加同步,单线程下没有意义。用栈时调 push/pop/peek,用队列时调 offer/poll/peek,两组方法不要混用。

## 两个典型用法

括号匹配是栈的经典应用:遇到左括号入栈,遇到右括号时弹出栈顶,检查是否配对;扫描结束后栈必须为空。

```java
static boolean valid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push(c);
        } else {
            if (stack.isEmpty()) return false;
            char open = stack.pop();
            if ((c == ')' && open != '(') ||
                (c == ']' && open != '[') ||
                (c == '}' && open != '{')) return false;
        }
    }
    return stack.isEmpty();
}
```

广度优先搜索(BFS)是队列的经典应用:从起点出发,每次取队首、把未访问的邻居入队,访问顺序按距离逐层展开。

```java
// 求从 (sr, sc) 到任意值为 0 的格子的最短步数,不可达返回 -1;1 表示障碍
static int shortest(int[][] grid, int sr, int sc) {
    int m = grid.length, n = grid[0].length;
    boolean[][] seen = new boolean[m][n];
    Deque<int[]> queue = new ArrayDeque<>();
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    queue.offer(new int[]{sr, sc, 0});
    seen[sr][sc] = true;
    while (!queue.isEmpty()) {
        int[] cur = queue.poll();
        if (grid[cur[0]][cur[1]] == 0) return cur[2];
        for (int[] d : dirs) {
            int r = cur[0] + d[0], c = cur[1] + d[1];
            if (r >= 0 && r < m && c >= 0 && c < n && !seen[r][c] && grid[r][c] != 1) {
                seen[r][c] = true;
                queue.offer(new int[]{r, c, cur[2] + 1});
            }
        }
    }
    return -1;
}
```

## 选型对照表

| 需求 | 首选 | 关键代价 |
| --- | --- | --- |
| 按索引读取、尾部追加 | ArrayList | 读 O(1),中间插入 O(n) |
| 栈与队列 | ArrayDeque | push/pop、offer/poll 均 O(1) |
| 已持有节点、就地插入删除 | LinkedList | 定位 O(n),改引用 O(1) |

## 小结

- 数组连续存储,随机访问 O(1),中间插入删除 O(n);
- ArrayList 封装数组并按 1.5 倍扩容,多数场景优于 LinkedList;
- 链表反转用 prev、cur、next 三个引用原地完成,顺序不能错;
- 快慢指针判环,相遇则说明有环,无环时快指针先到 null;
- 栈后进先出、队列先进先出,Java 统一用 ArrayDeque 实现;
- 选型先看访问模式:按下标读用 ArrayList,两端操作用 ArrayDeque。
