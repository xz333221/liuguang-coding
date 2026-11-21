---
title: 树与堆:二叉树 / BST / 优先队列
summary: '二叉树用左右引用表达层次，前中后序是访问根的三个时机，层序遍历靠队列；递归遍历的栈深度等于树高。BST 靠大小关系把查找降到 O(h)，但有序插入会退化成链表，AVL 与红黑树把树高锁在 O(log n)。堆是完全二叉树，用数组存储，上浮下沉维护堆序，PriorityQueue 因此能 O(log n) 取最值，大小为 k 的堆求 Top-K 是 O(n log k)。'
category: java
node: java-algorithm-tree-heap
order: 91
level: 进阶
tags: [二叉树, BST, 堆, PriorityQueue, 遍历]
updated: 2026-11-20
mindmap: tree-heap.mindmap.json
terms: ["recursion", "call-stack", "worst-average-case", "time-complexity"]
sources:
  - title: Algorithms, 4th Edition · Binary Search Trees
    url: https://algs4.cs.princeton.edu/home/
    note: BST 的查找、插入、删除与高度分析。
  - title: Java SE 21 API · PriorityQueue
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html
    note: 小顶堆语义、比较器与常用方法。
  - title: OI Wiki · 二叉树与堆
    url: https://oi-wiki.org/ds/binary-tree/
    note: 遍历顺序、完全二叉树的数组存储与堆操作。
---

上一篇的结构都是一条线，这一篇变成层次：每个节点可以有两个孩子。链表是「一个指向下一个」，树是「一个指向两个」，代价从 O(n) 的线性查找变成 O(log n) 的分支查找。

## 术语先对齐

- **根**:最上面那个节点，没有父节点；
- **叶**:没有子节点的节点；
- **深度**:从根往下数，根是 0(或 1，看约定);
- **高度**:从叶往上数，叶是 0;
- **满二叉树**:每个节点都有两个孩子；**完全二叉树**:除最后一层外都填满，最后一层靠左连续。

「完全二叉树」这个词要记牢，堆就靠它才能用数组存。

## 四种遍历

前序、中序、后序的区别只有一个：**根在哪一步被访问**。

```java
void preOrder(Node n)  { if (n == null) return; visit(n); preOrder(n.left);  preOrder(n.right);  }
void inOrder(Node n)   { if (n == null) return; inOrder(n.left);  visit(n); inOrder(n.right);   }
void postOrder(Node n) { if (n == null) return; postOrder(n.left); postOrder(n.right); visit(n); }
```

- 前序：先处理自己，再处理孩子。适合复制树、打印目录结构；
- 中序：左 → 根 → 右。**BST 的中序遍历结果是递增序列**，这条性质解决了一大类题；
- 后序：孩子都处理完才处理自己。适合释放资源、算子树的高度与和；
- 层序：一层一层来，用队列实现：

```java
List<List<Integer>> levelOrder(Node root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;

    Deque<Node> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();               // 记住这一层的节点数
        List<Integer> level = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            Node n = queue.poll();
            level.add(n.val);
            if (n.left != null) queue.offer(n.left);
            if (n.right != null) queue.offer(n.right);
        }
        res.add(level);
    }
    return res;
}
```

`int size = queue.size()` 那一行是关键：先固定本层节点数，才能在内层循环里区分「本层」和「下一层」。

递归写法简洁，但深度等于树高。链状树(退化成链表)的高度是 n，递归 n 层会 `StackOverflowError`。数据量大时改成显式栈迭代。

## BST:靠大小关系剪枝

二叉搜索树的性质：左子树所有节点都小于根，右子树都大于根。

```java
Node search(Node root, int target) {
    while (root != null) {
        if (target == root.val) return root;
        root = target < root.val ? root.left : root.right;
    }
    return null;
}
```

每比较一次就砍掉一半，查找是 O(h),h 是高度。理想情况下 h = log n，但**如果按顺序插入 1,2,3,4,5，树会长成一条向右的链**,h = n，查找退化成 O(n)。这是 BST 最致命的弱点。

对策是自平衡：AVL 树严格控制左右高度差不超过 1，红黑树用颜色约束把高度控制在 2log n。Java 的 `TreeMap` / `TreeSet` 就是红黑树，查找、插入、删除都是 O(log n)。

BST 删除节点分三种情况：叶子直接删；只有一个孩子用孩子顶上；有两个孩子要找「右子树最小值」(或左子树最大值)替换，再删掉那个节点。第三种最容易写错。

## 堆：只要最值，不要全序

堆不保证整体有序，只保证**堆顶是最值**。小顶堆：每个节点都不大于它的孩子；大顶堆反过来。

堆是完全二叉树，所以能直接放进数组，不用存引用：

```
父节点 i 的孩子: 2i + 1、2i + 2
孩子 j 的父节点: (j - 1) / 2
```

两个操作维持堆序：

- **上浮**:新元素插到末尾，不断和父节点比较，比父节点小就交换，直到不再违反堆序；
- **下沉**:取出堆顶后把末尾元素放到堆顶，不断和较小的孩子比较并交换。

两个操作最多走树高，所以是 O(log n)。建堆用「从最后一个非叶节点往前逐个下沉」，整体是 O(n)，不是 O(n log n)。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 330" role="img" aria-label="完全二叉树可以直接存放在数组里，父节点与孩子节点下标有固定关系">
    <rect x="6" y="6" width="748" height="318" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <text x="32" y="34" font-size="12" fill="var(--muted)">小顶堆：每个节点都不大于自己的孩子，堆顶就是最小值</text>
    <g stroke="var(--line-strong)" stroke-width="1.3">
      <line x1="210" y1="92" x2="120" y2="118" />
      <line x1="210" y1="92" x2="300" y2="118" />
      <line x1="120" y1="162" x2="60" y2="188" />
      <line x1="120" y1="162" x2="180" y2="188" />
      <line x1="300" y1="162" x2="240" y2="188" />
      <line x1="300" y1="162" x2="360" y2="188" />
    </g>
    <g text-anchor="middle">
      <g fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55">
        <circle cx="210" cy="70" r="22" />
        <circle cx="120" cy="140" r="22" />
        <circle cx="300" cy="140" r="22" />
      </g>
      <g fill="var(--canvas)" stroke="var(--line)">
        <circle cx="60" cy="210" r="22" />
        <circle cx="180" cy="210" r="22" />
        <circle cx="240" cy="210" r="22" />
        <circle cx="360" cy="210" r="22" />
      </g>
      <g font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)">
        <text x="210" y="75">1</text>
        <text x="120" y="145">3</text>
        <text x="300" y="145">2</text>
        <text x="60" y="215">7</text>
        <text x="180" y="215">5</text>
        <text x="240" y="215">9</text>
        <text x="360" y="215">4</text>
      </g>
    </g>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" text-anchor="middle">
      <g fill="var(--canvas)" stroke="var(--line)">
        <rect x="60" y="262" width="60" height="42" rx="8" />
        <rect x="124" y="262" width="60" height="42" rx="8" />
        <rect x="188" y="262" width="60" height="42" rx="8" />
        <rect x="252" y="262" width="60" height="42" rx="8" />
        <rect x="316" y="262" width="60" height="42" rx="8" />
        <rect x="380" y="262" width="60" height="42" rx="8" />
        <rect x="444" y="262" width="60" height="42" rx="8" />
      </g>
      <g font-size="12" fill="var(--ink)">
        <text x="90" y="288">1</text>
        <text x="154" y="288">3</text>
        <text x="218" y="288">2</text>
        <text x="282" y="288">7</text>
        <text x="346" y="288">5</text>
        <text x="410" y="288">9</text>
        <text x="474" y="288">4</text>
      </g>
      <g font-size="10" fill="var(--muted)">
        <text x="90" y="302">0</text>
        <text x="154" y="302">1</text>
        <text x="218" y="302">2</text>
        <text x="282" y="302">3</text>
        <text x="346" y="302">4</text>
        <text x="410" y="302">5</text>
        <text x="474" y="302">6</text>
      </g>
    </g>
    <text x="534" y="280" font-size="11.5" fill="var(--ink)">父 i 的孩子：2i+1、2i+2</text>
    <text x="534" y="302" font-size="11.5" fill="var(--ink)">孩子 j 的父：(j-1)/2</text>
  </svg>
  <figcaption>不用指针也能表达层次：下标就是位置，所以堆用数组存最省内存。</figcaption>
</figure>

## PriorityQueue

Java 的 `PriorityQueue` 就是小顶堆：

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.offer(5); minHeap.offer(1); minHeap.offer(3);
minHeap.peek();     // 1,O(1)
minHeap.poll();     // 1,O(log n)

// 大顶堆:传比较器
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
```

`offer` / `poll` 是 O(log n),`peek` 是 O(1)。注意 `PriorityQueue` 的 `toString` 输出**不是有序的**——只有堆顶有序，其余是堆序，别拿它当排序结果。

自定义比较器时，`(a, b) -> a[1] - b[1]` 有溢出风险，用 `Integer.compare(a[1], b[1])`。

**Top-K 是堆最实用的场景**:求 n 个数里最大的 k 个，维护一个大小为 k 的小顶堆，遍历时比堆顶大就替换。总代价 O(n log k)，比全排序 O(n log n) 快，而且内存只占 k。反直觉但很重要：求最大的 k 个要用小顶堆——堆顶是这 k 个里最小的，它才是淘汰的标准。

## 小结

- 前中后序的差别只在于根何时被访问；中序对 BST 是递增序列；
- 层序遍历靠队列，先记住本层节点数再循环；
- 递归深度等于树高，链状树会栈溢出，大数据改迭代；
- BST 查找 O(h)，有序插入会退化成链表；AVL 与红黑树把高度锁在 O(log n),`TreeMap` 就是红黑树；
- 堆只保证堆顶是最值，完全二叉树可以用数组存，上浮下沉 O(log n)，建堆 O(n);
- `PriorityQueue` 是小顶堆，`poll` O(log n),`toString` 无序；求 Top-K 用大小为 k 的小顶堆，O(n log k)。

下一篇讲哈希表与排序：为什么 `HashMap` 查找是 O(1)，以及 `Arrays.sort` 内部到底用了什么。
