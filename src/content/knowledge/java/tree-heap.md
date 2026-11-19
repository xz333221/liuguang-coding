---
title: 树与堆:二叉树 / BST / 优先队列
summary: '二叉树用左右引用表达层次关系,前中后序与层序遍历分别对应不同的访问顺序;BST 依靠大小关系把查找降到 O(h),但有序插入会退化成链表;堆用数组保存完全二叉树,靠上浮与下沉维护堆序,PriorityQueue 因此能以 O(log n) 取出最值。'
category: java
node: java-algorithm-tree-heap
order: 91
level: 进阶
tags: [二叉树, BST, 堆, PriorityQueue, 遍历]
updated: 2026-11-19
mindmap: tree-heap.mindmap.json
terms: ["recursion", "call-stack", "worst-average-case"]
sources:
  - title: Algorithms, 4th Edition · Binary Search Trees
    url: https://algs4.cs.princeton.edu/home/
    note: BST 的查找、插入、删除与高度分析。
  - title: Java SE 21 API · PriorityQueue
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html
    note: 小顶堆语义、比较器与常用方法。
  - title: OI Wiki · 二叉树与堆
    url: https://oi-wiki.org/
    note: 遍历顺序、完全二叉树的数组存储与堆操作。
---

上一篇的栈与队列都是线性结构:元素排成一条序列,每个元素最多一个前驱和一个后继。这一篇把结构扩展到层次:一个节点可以有多个后继,树和堆是其中最常见的两种形态。

## 树的术语

树由节点和连接节点的边组成,没有环。最上面的节点叫根(root),没有子节点的节点叫叶(leaf)。节点的深度是从根到它的边数,根深度为 0;节点的高度是从它到最远叶子的边数,叶高度为 0。整棵树的高度等于根的高度。

二叉树是每个节点最多两个子节点的树,两个子节点分别叫左孩子和右孩子,顺序有意义,不能互换。

## 二叉树与遍历

二叉树节点用两个引用表示:

```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
```

前序、中序、后序的区别在于访问根节点的时机。递归实现最直接,三行代码只换顺序:

```java
static void preorder(TreeNode node) {        // 根 → 左 → 右
    if (node == null) return;
    System.out.print(node.val + " ");
    preorder(node.left);
    preorder(node.right);
}

static void inorder(TreeNode node) {         // 左 → 根 → 右
    if (node == null) return;
    inorder(node.left);
    System.out.print(node.val + " ");
    inorder(node.right);
}
```

后序只是把打印移到两次递归之后。递归的代价是调用栈:每深入一层压入一个栈帧,树退化成链时深度为 n,空间 O(n)。

层序遍历按层从上到下、从左到右访问,用队列实现,借助上一篇的队列:

```java
static void levelOrder(TreeNode root) {
    if (root == null) return;
    Queue<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        TreeNode node = queue.poll();
        System.out.print(node.val + " ");
        if (node.left != null) queue.offer(node.left);
        if (node.right != null) queue.offer(node.right);
    }
}
```

队列的先进先出保证同层节点先于下一层被处理,输出顺序就是层序。

## BST:有序的二叉树

二叉搜索树(BST)在二叉树上加一条约束:左子树所有节点的值都小于根,右子树所有节点的值都大于根,且左右子树同样是 BST。由此得到中序遍历递增的性质。

查找沿一条路径向下,每步排除一半子树,代价与树高 h 成正比:

```java
static boolean contains(TreeNode root, int target) {
    TreeNode cur = root;
    while (cur != null) {
        if (target == cur.val) return true;
        cur = target < cur.val ? cur.left : cur.right;
    }
    return false;
}
```

插入沿同一条路径找到空位挂上新节点,代价同样是 O(h)。删除分三种情况:叶节点直接移除;只有一个孩子时用孩子顶替;有两个孩子时,用右子树的最小节点(中序后继)替换当前值,再到右子树里删掉那个后继。第三种情况保持了 BST 约束。

## 退化与平衡

BST 的 O(h) 只有在树接近平衡时才有意义。如果按递增顺序插入 1 到 n,每个新节点都挂在右侧,树退化成链表,h = n,查找回到 O(n)。

平衡树通过旋转维持左右子树高度差,把树高控制在 O(log n)。AVL 树要求左右高度差不超过 1,红黑树用颜色约束把最长路径限制在最短路径的两倍以内。Java 的 TreeMap 与 TreeSet 底层是红黑树,需要有序容器时直接用标准库,不必自己实现。

## 堆:数组里的完全二叉树

堆是一种完全二叉树,除最后一层外每层都填满,最后一层从左到右连续。这个形状让它能直接存进数组:下标 i 的节点,左孩子在 2i+1,右孩子在 2i+2,父节点在 (i-1)/2。

堆序要求父节点不大于两个子节点(小顶堆),于是根是整个堆的最小值。插入时把新元素放到数组末尾再上浮,删除根时把末尾元素移到根再下沉,两者代价都是 O(log n):

```java
class MinHeap {
    private int[] data = new int[16];
    private int size;

    void push(int x) { data[size] = x; siftUp(size++); }
    int pop() { int top = data[0]; data[0] = data[--size]; siftDown(0); return top; }

    private void siftUp(int i) {
        while (i > 0) {
            int p = (i - 1) / 2;
            if (data[p] <= data[i]) break;
            swap(p, i);
            i = p;
        }
    }

    private void siftDown(int i) {
        while (true) {
            int l = 2 * i + 1, r = l + 1, min = i;
            if (l < size && data[l] < data[min]) min = l;
            if (r < size && data[r] < data[min]) min = r;
            if (min == i) break;
            swap(i, min);
            i = min;
        }
    }

    private void swap(int i, int j) { int t = data[i]; data[i] = data[j]; data[j] = t; }
}
```

上浮只与父节点比较,下沉与两个子节点中较小的那个比较,一次交换把问题下移一层。

## PriorityQueue 与 Top-K

Java 的 PriorityQueue 就是小顶堆,默认按自然顺序比较,传入 Comparator 可以改变顺序:

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
```

求数组中最大的 k 个数,维护一个大小为 k 的小顶堆:新元素入堆,超过 k 就弹出堆顶,堆里始终是当前最大的 k 个,最终堆顶是第 k 大。总代价 O(n log k),比全排序的 O(n log n) 省。

```java
static int[] topK(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();
    }
    int[] ans = new int[k];
    for (int i = 0; i < k; i++) ans[i] = heap.poll();
    return ans;                                 // 从小到大排列
}
```

堆排序利用同一套机制:先把整个数组建成堆(O(n)),再反复把堆顶与末尾交换、缩小堆范围并下沉,得到 O(n log n) 的原地排序。标准库没有直接暴露堆排序,了解原理即可。

## 小结

- 二叉树的深度从上往下数,高度从下往上数,树高决定路径操作的代价;
- 前序、中序、后序是递归访问根的三个时机,层序用队列逐层处理;
- BST 的中序遍历递增,查找、插入、删除都与树高 h 相关;
- 有序插入会让 BST 退化成链表,平衡树把树高控制到 O(log n);
- 堆用数组保存完全二叉树,上浮与下沉维护堆序,单次操作 O(log n);
- PriorityQueue 是小顶堆,Top-K 用大小为 k 的堆可把代价降到 O(n log k)。
