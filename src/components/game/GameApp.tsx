import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameProgress, Question } from '../../data/game'
import {
  findLevel,
  findQuestion,
  isLevelUnlocked,
  levels,
  nextLevelId,
  passed,
  questionsOf,
  starsFor,
  totalQuestions,
} from '../../data/game'
import { glossaryPath, topicHref } from '../../lib/paths'

/** 这道题属于哪一关,错题本里标出来源用 */
function levelNameOf(questionId: string): string {
  for (const level of levels) {
    if (level.questions.some((item) => item.id === questionId)) return level.name
  }
  return '错题'
}

/**
 * 闯关游戏。一屏三态:关卡地图 → 答题 → 结算,外加错题本复习。
 *
 * 进度只存浏览器本地(localStorage):本站不设账号体系,换设备不同步是已知边界,
 * 和主题、问答历史的做法保持一致。题目数据来自 src/data/game/,这里只管玩法。
 */

const STORAGE_KEY = 'lg-game:ai:v1'
/** 错题复习不是一个真关卡,借这个 id 走同一条答题流程 */
const REVIEW_ID = '__review'

const KIND_LABEL: Record<Question['kind'], string> = {
  term2def: '名词',
  def2term: '名词',
  judge: '判断',
  scenario: '场景',
}

const LETTERS = ['A', 'B', 'C', 'D']

interface Session {
  /** 关卡 id,错题复习时是 REVIEW_ID */
  levelId: string
  title: string
  questions: Question[]
  index: number
  /** 已选的选项下标,没选是 null */
  picked: number | null
  results: boolean[]
}

const emptyProgress: GameProgress = {
  levels: {},
  wrong: [],
  stats: { answered: 0, correct: 0, streak: 0, bestStreak: 0 },
}

function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress
    const parsed = JSON.parse(raw) as Partial<GameProgress>
    return {
      levels: parsed.levels ?? {},
      wrong: Array.isArray(parsed.wrong) ? parsed.wrong : [],
      stats: { ...emptyProgress.stats, ...(parsed.stats ?? {}) },
    }
  } catch {
    return emptyProgress
  }
}

function saveProgress(progress: GameProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // 隐私模式下写不进去,游戏照常能玩,只是刷新后进度丢了
  }
}

/** 答一题之后的进度变化:记账 + 维护错题本 + 连对 */
function applyAnswer(prev: GameProgress, questionId: string, ok: boolean): GameProgress {
  const wrong = new Set(prev.wrong)
  if (ok) wrong.delete(questionId)
  else wrong.add(questionId)

  const streak = ok ? prev.stats.streak + 1 : 0
  return {
    levels: prev.levels,
    wrong: [...wrong],
    stats: {
      answered: prev.stats.answered + 1,
      correct: prev.stats.correct + (ok ? 1 : 0),
      streak,
      bestStreak: Math.max(prev.stats.bestStreak, streak),
    },
  }
}

function Stars({ count, size = 'sm' }: { count: number; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={size === 'lg' ? 'lg-game-stars lg-game-stars--lg' : 'lg-game-stars'}
      aria-label={`${count} 星`}
    >
      {[0, 1, 2].map((index) => (
        <span key={index} data-lit={index < count} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

export function GameApp() {
  const [progress, setProgress] = useState<GameProgress>(loadProgress)
  const [session, setSession] = useState<Session | null>(null)
  /** 地图 / 错题本 / 答题 / 结算,四者只出现一个 */
  const [tab, setTab] = useState<'map' | 'wrong'>('map')

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const clearedCount = useMemo(
    () => levels.filter((level) => progress.levels[level.id]?.cleared).length,
    [progress.levels],
  )

  const startLevel = useCallback((levelId: string) => {
    const questions = questionsOf(levelId)
    if (questions.length === 0) return
    setSession({
      levelId,
      title: findLevel(levelId)?.name ?? levelId,
      questions,
      index: 0,
      picked: null,
      results: [],
    })
  }, [])

  const startReview = useCallback(() => {
    const questions = progress.wrong
      .map((id) => findQuestion(id))
      .filter((item): item is Question => Boolean(item))
    if (questions.length === 0) return
    setSession({
      levelId: REVIEW_ID,
      title: '错题复习',
      questions,
      index: 0,
      picked: null,
      results: [],
    })
  }, [progress.wrong])

  const question = session ? session.questions[session.index] : undefined
  const answered = session?.picked ?? null

  const answer = useCallback(
    (choiceIndex: number) => {
      if (!session || session.picked !== null) return
      const current = session.questions[session.index]
      if (!current) return
      const ok = current.choices[choiceIndex].correct
      setSession({ ...session, picked: choiceIndex, results: [...session.results, ok] })
      setProgress((prev) => applyAnswer(prev, current.id, ok))
    },
    [session],
  )

  const advance = useCallback(() => {
    if (!session) return
    if (session.index + 1 >= session.questions.length) {
      // 收尾:算星、记通关
      const accuracy =
        session.results.filter(Boolean).length / Math.max(session.results.length, 1)
      if (session.levelId !== REVIEW_ID) {
        setProgress((prev) => {
          const old = prev.levels[session.levelId] ?? { stars: 0, best: 0, cleared: false }
          return {
            ...prev,
            levels: {
              ...prev.levels,
              [session.levelId]: {
                stars: Math.max(old.stars, starsFor(accuracy)),
                best: Math.max(old.best, accuracy),
                cleared: old.cleared || passed(accuracy),
              },
            },
          }
        })
      }
      setSession({ ...session, index: -1 })
      return
    }
    setSession({ ...session, index: session.index + 1, picked: null })
  }, [session])

  // 键盘:1~4 选项,回车下一题。答过的题按回车也能往下走
  useEffect(() => {
    if (!question) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      // 正在输入框里打字时不抢键
      if (target?.closest('input, textarea, select')) return
      // 焦点在按钮/链接上时,回车和空格浏览器自己会触发点击,这里再处理一遍就变成点两次
      const onControl = Boolean(target?.closest('button, a, summary'))

      const index = Number.parseInt(event.key, 10)
      if (!Number.isNaN(index) && index >= 1 && index <= (question?.choices.length ?? 0)) {
        event.preventDefault()
        answer(index - 1)
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (answered !== null && !onControl) {
          event.preventDefault()
          advance()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [question, answered, session, answer, advance])

  // ---------------- 结算 ----------------
  if (session && session.index === -1) {
    const total = session.results.length
    const correct = session.results.filter(Boolean).length
    const accuracy = total === 0 ? 0 : correct / total
    const review = session.levelId === REVIEW_ID
    const cleared = review || passed(accuracy)
    const nextId = review ? undefined : nextLevelId(session.levelId)
    const nextLevel = nextId ? findLevel(nextId) : undefined

    return (
      <div className="lg-game-result">
        <Stars count={starsFor(accuracy)} size="lg" />
        <p className="lg-game-result-title">
          {review ? '复习完成' : cleared ? `「${session.title}」通关` : `「${session.title}」差一点`}
        </p>
        <p className="lg-game-result-note">
          答对 <span className="font-mono">{correct}</span> / {total} 题,正确率{' '}
          <span className="font-mono">{Math.round(accuracy * 100)}%</span>。
          {review
            ? '答对的题已经移出错题本,剩下的继续刷。'
            : !cleared
              ? '正确率到六成才能解锁下一关,错题都在错题本里,刷完再来。'
              : accuracy >= 1
                ? '全对,星拿满了。'
                : '错题都收进了错题本,刷完一遍再来,记得更牢。'}
        </p>
        <div className="lg-game-actions">
          {nextLevel && isLevelUnlocked(nextLevel.id, progress.levels) ? (
            <button
              type="button"
              className="lg-game-btn lg-game-btn--primary"
              onClick={() => startLevel(nextLevel.id)}
            >
              下一关:{nextLevel.name}
            </button>
          ) : null}
          <button
            type="button"
            className="lg-game-btn"
            onClick={() => startLevel(session.levelId)}
            disabled={review}
          >
            再刷一遍
          </button>
          <button
            type="button"
            className="lg-game-btn"
            onClick={() => {
              setSession(null)
              setTab(review ? 'wrong' : 'map')
            }}
          >
            {review ? '回错题本' : '回关卡地图'}
          </button>
        </div>
      </div>
    )
  }

  // ---------------- 答题 ----------------
  if (session && question) {
    const isReview = session.levelId === REVIEW_ID
    const pickedOk =
      answered !== null ? question.choices[answered].correct : undefined

    return (
      <div>
        <p className="mb-4 text-[0.85rem] text-muted">
          <button
            type="button"
            className="hover:text-ink"
            onClick={() => {
              setSession(null)
              setTab(isReview ? 'wrong' : 'map')
            }}
          >
            ← {isReview ? '错题本' : '关卡地图'}
          </button>
          <span className="mx-2 text-line-strong">/</span>
          {session.title}
        </p>

        <div className="lg-game-play">
          <div className="lg-game-play-top">
            <span className="lg-game-kind">{KIND_LABEL[question.kind]}</span>
            <span className="lg-game-counter">
              {session.index + 1} / {session.questions.length}
            </span>
          </div>

          <div
            className="lg-game-track"
            role="progressbar"
            aria-valuenow={session.index + (answered !== null ? 1 : 0)}
            aria-valuemin={0}
            aria-valuemax={session.questions.length}
          >
            <div
              className="lg-game-track-fill"
              style={{
                width: `${((session.index + (answered !== null ? 1 : 0)) / session.questions.length) * 100}%`,
              }}
            />
          </div>

          <p className="lg-game-prompt">{question.prompt}</p>

          <div className="lg-game-options">
            {question.choices.map((choice, index) => {
              const state =
                answered === null
                  ? 'idle'
                  : index === answered
                    ? choice.correct
                      ? 'right'
                      : 'picked-wrong'
                    : choice.correct
                      ? 'right'
                      : 'idle'
              return (
                <button
                  type="button"
                  key={choice.text}
                  className="lg-game-option"
                  data-state={state}
                  disabled={answered !== null}
                  onClick={() => answer(index)}
                >
                  <span className="lg-game-option-key">{LETTERS[index]}</span>
                  <span>{choice.text}</span>
                </button>
              )
            })}
          </div>

          {answered !== null ? (
            <div className="lg-game-explain">
              <p className="lg-game-verdict" data-ok={pickedOk}>
                {pickedOk ? '答对了' : '答错了'}
                <span className="text-muted">
                  {question.kind === 'judge'
                    ? pickedOk
                      ? ''
                      : `正确答案:${question.choices.find((item) => item.correct)?.text}`
                    : ''}
                </span>
              </p>
              <p className="lg-game-explain-body">{question.explain}</p>
              {question.link?.term || question.link?.see ? (
                <div className="lg-game-links">
                  {question.link?.term ? (
                    <a className="lg-game-link" href={`${glossaryPath()}#${question.link.term}`}>
                      查术语表
                    </a>
                  ) : null}
                  {question.link?.see ? (
                    <a className="lg-game-link" href={topicHref(question.link.see)}>
                      看讲解
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div className="lg-game-actions">
                <button type="button" className="lg-game-btn lg-game-btn--primary" onClick={advance}>
                  {session.index + 1 >= session.questions.length ? '看结算' : '下一题'}
                  <span className="text-[0.72rem] opacity-70">(回车)</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // ---------------- 错题本 ----------------
  if (tab === 'wrong') {
    const wrongQuestions = progress.wrong
      .map((id) => findQuestion(id))
      .filter((item): item is Question => Boolean(item))

    return (
      <div>
        <div className="flex items-center gap-3">
          <button type="button" className="lg-game-btn" onClick={() => setTab('map')}>
            ← 关卡地图
          </button>
          <h2 className="text-[1.1rem] font-medium">错题本</h2>
          <span className="ml-auto font-mono text-[0.8rem] text-muted">
            {wrongQuestions.length} 题
          </span>
        </div>

        {wrongQuestions.length === 0 ? (
          <p className="mt-6 rounded-[18px] border border-line bg-surface px-5 py-4 text-[0.88rem] text-muted">
            错题本空着。答错的题会自动收进来,答对一次就移出去。
          </p>
        ) : (
          <>
            <p className="mt-4 max-w-[34em] text-[0.88rem] leading-relaxed text-muted">
              只练错题,按顺序刷完一轮。复习答对的题会当场移出错题本。
            </p>
            <div className="lg-game-wrong-list mt-5">
              {wrongQuestions.map((item) => (
                <div className="lg-game-wrong-item" key={item.id}>
                  <span className="lg-game-wrong-level">{levelNameOf(item.id)}</span>
                  <span className="lg-game-wrong-prompt">{item.prompt}</span>
                </div>
              ))}
            </div>
            <div className="lg-game-actions mt-6">
              <button
                type="button"
                className="lg-game-btn lg-game-btn--primary"
                onClick={startReview}
              >
                开始复习({wrongQuestions.length})
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ---------------- 关卡地图 ----------------
  return (
    <div>
      <div className="lg-game-stats">
        <div className="lg-game-stat">
          <span className="lg-game-stat-value">{totalQuestions()}</span>
          <span className="lg-game-stat-label">题目总数</span>
        </div>
        <div className="lg-game-stat">
          <span className="lg-game-stat-value">
            {clearedCount}/{levels.length}
          </span>
          <span className="lg-game-stat-label">已通关卡</span>
        </div>
        <div className="lg-game-stat">
          <span className="lg-game-stat-value">{progress.stats.correct}</span>
          <span className="lg-game-stat-label">累计答对</span>
        </div>
        <div className="lg-game-stat">
          <span className="lg-game-stat-value">{progress.stats.bestStreak}</span>
          <span className="lg-game-stat-label">最长连对</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="lg-game-btn"
          onClick={() => setTab('wrong')}
          disabled={progress.wrong.length === 0}
        >
          错题本
          <span className="font-mono text-[0.75rem] opacity-80">{progress.wrong.length}</span>
        </button>
        <button
          type="button"
          className="lg-game-btn lg-game-btn--ghost ml-auto"
          onClick={() => {
            if (confirm('清空全部闯关进度和错题本?')) setProgress(emptyProgress)
          }}
        >
          清空进度
        </button>
      </div>

      <div className="lg-game-path mt-8">
        {levels.map((level, index) => {
          const record = progress.levels[level.id]
          const unlocked = isLevelUnlocked(level.id, progress.levels)
          const state = !unlocked ? 'locked' : record?.cleared ? 'cleared' : 'current'
          return (
            <button
              type="button"
              key={level.id}
              className="lg-game-row"
              data-state={state}
              disabled={!unlocked}
              onClick={() => startLevel(level.id)}
            >
              <span className="lg-game-node">{unlocked ? index + 1 : '·'}</span>
              <span className="lg-game-level">
                <span className="lg-game-level-head">
                  <span className="lg-game-level-name">{level.name}</span>
                  {record?.cleared ? <Stars count={record.stars} /> : null}
                  <span className="lg-game-level-meta">
                    {unlocked ? `${level.questions.length} 题` : '未解锁'}
                  </span>
                </span>
                <span className="lg-game-level-intro">{level.intro}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
