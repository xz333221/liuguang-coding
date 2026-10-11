// 全站文案与结构数据。
// 注意:课程、价格、学员反馈都是演示内容(sample data),不是真实业务数据。

// 课程里真正会用到的技术,图形取自 simple-icons 官方图标(不是手画 SVG)
import {
  siDocker,
  siGit,
  siGo,
  siGraphql,
  siJavascript,
  siKubernetes,
  siLinux,
  siMongodb,
  siNodedotjs,
  siPostgresql,
  siPython,
  siReact,
  siRedis,
  siRust,
  siTailwindcss,
  siTypescript,
  siVite,
} from 'simple-icons'

export type StackIcon = { title: string; path: string }

export const navLinks = [
  { href: '#courses', label: '课程' },
  { href: '#path', label: '学习方式' },
  { href: '#why', label: '为什么不同' },
  { href: '#pricing', label: '价格' },
]

export const stack: StackIcon[] = [
  siPython,
  siTypescript,
  siJavascript,
  siReact,
  siNodedotjs,
  siGo,
  siRust,
  siPostgresql,
  siMongodb,
  siRedis,
  siDocker,
  siKubernetes,
  siGraphql,
  siVite,
  siTailwindcss,
  siGit,
  siLinux,
]

export const featuredCourse = {
  name: 'Web 前端工程',
  weeks: '10 周',
  level: '进阶',
  intro: '从一个空文件夹开始，写出一个带真实接口、能在手机上打开的产品。',
  deliverable: '一个部署上线、能发链接给朋友的产品',
  photo: 'code.jpg',
  photoAlt: '屏幕上的一段代码，作为「Web 前端工程」课程的配图',
}

export const courses = [
  {
    name: 'Python 起步',
    weeks: '6 周',
    level: '入门',
    deliverable: '一个自动整理本地资料的小工具',
  },
  {
    name: 'Go 服务端与并发',
    weeks: '8 周',
    level: '进阶',
    deliverable: '一个扛得住压测的 API 服务',
  },
  {
    name: '算法与数据结构',
    weeks: '8 周',
    level: '入门到进阶',
    deliverable: '一份自己实现的常用数据结构',
  },
  {
    name: 'AI 应用开发',
    weeks: '6 周',
    level: '进阶',
    deliverable: '一个能查自己文档的问答助手',
  },
]

export const learningPath = [
  {
    step: '定起点',
    body: '先做一份小测和两道手写题，看清你现在能写什么，再决定从哪一门开始。',
  },
  {
    step: '拆周计划',
    body: '每周只有一件事：写完一个能跑的功能，阅读和练习都围着它转。',
  },
  {
    step: '动手写',
    body: '遇到报错先读报错信息，再查文档，最后才翻答案。这一步没人能替你做。',
  },
  {
    step: '找人评审',
    body: '提交后有人逐行看你的代码，指出哪一段绕了弯，以及可以怎么改。',
  },
]

export const reasons = [
  {
    title: '每节课都有产出',
    body: '没有纯讲概念的章节，你打开编辑器的时间会比看视频更长。',
    media: 'photo' as const,
  },
  {
    title: '提交后有人看代码',
    body: '每份作业都有逐行批注，包括哪一段写得绕、哪里留了隐患。',
    media: 'people' as const,
  },
  {
    title: '只教五年后还成立的东西',
    body: '框架会换代，基础概念不会。课时优先给后者。',
    media: 'plain' as const,
  },
  {
    title: '进度只对你自己可见',
    body: '不设排行榜，不公开你写错的提交，学得慢也没人催。',
    media: 'tint' as const,
  },
  {
    title: '全站中文讲解与答疑',
    body: '文档、字幕、助教都是中文，卡住时不用先去翻译报错信息。',
    media: 'dots' as const,
  },
]

export const voices = [
  {
    quote:
      '我以前在 4S 店卖车，去年秋天转去写前端。第一次交作业被批注了三十多处，改完三轮，再看别人写的代码就知道哪里不对劲了。',
    name: '陈屿',
    role: '前端工程师，转行第 9 个月',
  },
  {
    quote:
      '学校的作业抄一抄就能过，这里不行。评审会追着问为什么这么写，逼着我把思路讲清楚。',
    name: '林知遥',
    role: '计算机专业大三',
  },
  {
    quote: '没有排行榜这点我很买账。我断断续续学了七个月，中间停了两次，也没人来催我。',
    name: '赵沐白',
    role: '在职自学，后端方向',
  },
]

export const plans = [
  {
    name: '免费',
    price: '¥0',
    period: '永久',
    note: '不需要绑定银行卡',
    items: ['全部基础课程', '每门课的项目代码', '社区提问'],
    cta: '免费开始学习',
    emphasis: false,
  },
  {
    name: '会员',
    price: '¥199',
    period: '每月',
    note: '年付 ¥1,590，随时取消，已付部分按天退回',
    items: [
      '全部基础课与进阶课，后续新课不另外收费',
      '作业逐行批注，两个工作日内返回',
      '一对一答疑，每月两次',
      '结课后的项目复盘',
    ],
    cta: '加入会员',
    emphasis: true,
  },
]

// 演示站点没有后端，这里只做前端校验与状态展示
export const previewRequest = {
  headline: '先上一节完整的课，再决定要不要学',
  body: '留下邮箱，我们把第一周的内容和一份项目代码发给你。',
  label: '邮箱地址',
  hint: '只用来发这节课，不会转给第三方。',
  placeholder: 'you@example.com',
  submit: '发到我邮箱',
  success: '已收到。当前是演示站点，不会真的发信。',
}

export const footer = {
  tagline: '项目驱动的编程学习，写给想动手的人。',
  columns: [
    {
      title: '目录',
      links: [
        { href: '#courses', label: '课程' },
        { href: '#path', label: '学习方式' },
        { href: '#why', label: '为什么不同' },
        { href: '#voices', label: '学员反馈' },
        { href: '#pricing', label: '价格' },
      ],
    },
    {
      title: '联系',
      links: [{ href: 'mailto:hello@liuguang.example', label: 'hello@liuguang.example' }],
    },
  ],
  legal: '© 2026 流光 coding。页面中的课程、价格与学员信息均为演示数据。',
}
