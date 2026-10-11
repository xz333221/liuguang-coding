import { Courses } from './components/Courses'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { LearningPath } from './components/LearningPath'
import { Nav } from './components/Nav'
import { PreviewRequest } from './components/PreviewRequest'
import { Pricing } from './components/Pricing'
import { TechStack } from './components/TechStack'
import { Voices } from './components/Voices'
import { Why } from './components/Why'

// z-index 只有三层:40 吸顶导航 / 50 颗粒层 / 60 跳转链接
export default function App() {
  return (
    <div className="relative min-h-[100dvh]">
      <div id="page-top" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24" />
      <div aria-hidden="true" className="lg-grain pointer-events-none fixed inset-0 z-50" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-5 focus:z-60 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:text-on-accent"
      >
        跳到主要内容
      </a>

      <Nav />

      <main id="main">
        <Hero />
        <TechStack />
        <Courses />
        <LearningPath />
        <Why />
        <Voices />
        <Pricing />
        <PreviewRequest />
      </main>

      <Footer />
    </div>
  )
}
