import { useCallback, useEffect, useState } from 'react'
import type { GameProgress, Question } from '../../data/game'
import {
  correctOrderOf,
  deckOfLevel,
  deckProgress,
  decks,
  findDeck,
  findLevel,
  findQuestion,
  isLevelUnlocked,
  levelsOf,
  nextLevelId,
  passed,
  prepareQuestions,
  questionsOf,
  starsFor,
  verdictOf,
} from '../../data/game'
import { getUser, onAuthChange, openAuthDialog, type AuthUser } from '../../lib/auth'
import { fetchGameProgress, mergeProgress, saveGameProgress } from '../../lib/game-sync'
import { glossaryPath, topicHref } from '../../lib/paths'

/** 这道题属于哪个题库的哪一关,错题本里标出来源用 */
function levelNameOf(questionId: string): string {
  for (const deck of decks) {
    for (const level of deck.levels) {
      if (level.questions.some((item) => item.id === questionId)) return level.name
    }
  }
  return '错题'
}

/** 这道题属于哪个题库,错题本分组用 */
function deckNameOf(questionId: string): string {
  for (const deck of decks) {
    if (deck.levels.some((level) => level.questions.some((item) => item.id === questionId))) {
      return deck.name
    }
  }
  return '错题'
}

/**
 * 闯关游戏。一屏三态:关卡地图 → 答题 → 结算,外加错题本复习。
 *
 * 进度双写:localStorage 常驻(没登录、隐私模式、断网都能玩),登录之后再加一份
 * 到服务端(按用户存 MySQL)。登录那一刻两边合并,各取更优的记录;之后每次进度
 * 变化防抖 800ms 推上去。游客玩法和从前完全一样,换设备不同步是已知边界。
 */

const STORAGE_KEY = 'lg-game:ai:v1'
/** 错题复习不是一个真关卡,借这个 id 走同一条答题流程 */
const REVIEW_ID = '__review'

const KIND_LABEL: Record<Question['kind'], string> = {
  term2def: '名词',
  def2term: '名词',
  judge: '判断',
  scenario: '场景',
  multi: '多选',
  order: '排序',
  blank: '填空',
}

/** 要点完整再交卷的题型 */
const BATCH_KINDS = new Set<Question['kind']>(['multi', 'order'])

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface Session {
  /** 关卡 id,错题复习时是 REVIEW_ID */
  levelId: string
  title: string
  /** 每开一关都重新洗过顺序的题目 */
  questions: Question[]
  index: number
  /** 当前题的已选项:单选/填空一项,多选一组,排序题按点击先后 */
  picked: number[]
  /** 当前题的判定结果,null 表示还没交卷 */
  verdict: boolean | null
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

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="lg-game-code">
      {lang ? <span className="lg-game-code-lang">{lang}</span> : null}
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** 答完之后把正确答案摊开:多选列选项,排序列顺序,填空把横线补上 */
function AnswerKey({ question }: { question: Question }) {
  if (question.kind === 'multi') {
    const correct = question.choices.filter((choice) => choice.correct)
    return (
      <div className="lg-game-key">
        <span className="lg-game-key-label">该选这 {correct.length} 项</span>
        <ul className="lg-game-key-items">
          {correct.map((choice) => (
            <li key={choice.text}>{choice.text}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (question.kind === 'order') {
    return (
      <div className="lg-game-key">
        <span className="lg-game-key-label">正确顺序</span>
        <ol className="lg-game-key-list">
          {correctOrderOf(question).map((choice, index) => (
            <li key={choice.text}>
              <span className="lg-game-key-no">{index + 1}</span>
              {choice.text}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (question.kind === 'blank' && question.code) {
    const filled = question.choices.find((choice) => choice.correct)?.text ?? ''
    return (
      <div className="lg-game-key">
        <span className="lg-game-key-label">填进去是这样</span>
        <CodeBlock code={question.code.replace('____', filled)} lang={question.lang} />
      </div>
    )
  }

  return null
}

export function GameApp() {
  const [progress, setProgress] = useState<GameProgress>(loadProgress)
  const [session, setSession] = useState<Session | null>(null)
  /** 地图 / 错题本 / 答题 / 结算,四者只出现一个 */
  const [tab, setTab] = useState<'map' | 'wrong'>('map')
  /** 地图上当前选中的题库;各题库并列,互不锁定 */
  const [deckId, setDeckId] = useState(decks[0].id)
  /** null = 没登录;云端同步状态,只在地图上有意义 */
  const [user, setUser] = useState<AuthUser | null>(getUser)
  const [sync, setSync] = useState<'local' | 'syncing' | 'synced' | 'error'>('local')

  /** 把云端进度拉下来与本机合并;合并结果会触发保存副作用,顺手推回去 */
  const pullFromServer = useCallback(() => {
    setSync('syncing')
    fetchGameProgress()
      .then((remote) => {
        setProgress((prev) => (remote ? mergeProgress(prev, remote) : prev))
        if (!remote) setSync('synced')
      })
      .catch(() => setSync('error'))
  }, [])

  /** 登录/退出:登录就把云端进度拉下来合并,退出就回到纯本地 */
  useEffect(
    () =>
      onAuthChange(() => {
        const next = getUser()
        setUser(next)
        if (!next) {
          setSync('local')
          return
        }
        pullFromServer()
      }),
    [pullFromServer],
  )

  // 进度一变:先写本地;登录了再防抖推到云端(连着答几题只发最后一次)。
  // 防抖这 800ms 里徽标还显示"已同步",推的过程中不额外闪"同步中"——
  // 那个状态留给手动重拉,避免答题时徽标一直跳。
  useEffect(() => {
    saveProgress(progress)
    if (!user) return
    const timer = setTimeout(() => {
      saveGameProgress(progress)
        .then(() => setSync('synced'))
        .catch(() => setSync('error'))
    }, 800)
    return () => clearTimeout(timer)
  }, [progress, user])

  const deck = findDeck(deckId) ?? decks[0]
  const deckLevels = levelsOf(deck.id)
  const { cleared: clearedCount, total: levelTotal } = deckProgress(deck.id, progress.levels)

  const startLevel = useCallback((levelId: string) => {
    const questions = prepareQuestions(questionsOf(levelId))
    if (questions.length === 0) return
    setSession({
      levelId,
      title: findLevel(levelId)?.name ?? levelId,
      questions,
      index: 0,
      picked: [],
      verdict: null,
      results: [],
    })
  }, [])

  const startReview = useCallback(() => {
    const questions = prepareQuestions(
      progress.wrong
        .map((id) => findQuestion(id))
        .filter((item): item is Question => Boolean(item)),
    )
    if (questions.length === 0) return
    setSession({
      levelId: REVIEW_ID,
      title: '错题复习',
      questions,
      index: 0,
      picked: [],
      verdict: null,
      results: [],
    })
  }, [progress.wrong])

  const question = session ? session.questions[session.index] : undefined
  const picked = session?.picked ?? []
  const verdict = session?.verdict ?? null
  const answered = verdict !== null

  /** 交卷:算对错、进错题本、记一次答题 */
  const commit = useCallback(
    (choices: number[]) => {
      if (!session || session.verdict !== null) return
      const current = session.questions[session.index]
      if (!current) return
      const ok = verdictOf(current, choices)
      setSession({ ...session, picked: choices, verdict: ok, results: [...session.results, ok] })
      setProgress((prev) => applyAnswer(prev, current.id, ok))
    },
    [session],
  )

  /** 点一个选项:只改勾选状态,判题一律等「确定」 */
  const pick = useCallback(
    (choiceIndex: number) => {
      if (!session || session.verdict !== null) return
      const current = session.questions[session.index]
      if (!current) return

      if (!BATCH_KINDS.has(current.kind)) {
        setSession({ ...session, picked: [choiceIndex] })
        return
      }

      const exists = session.picked.includes(choiceIndex)
      setSession({
        ...session,
        picked: exists
          ? session.picked.filter((index) => index !== choiceIndex)
          : [...session.picked, choiceIndex],
      })
    },
    [session],
  )

  const advance = useCallback(() => {
    if (!session || session.verdict === null) return
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
    setSession({ ...session, index: session.index + 1, picked: [], verdict: null })
  }, [session])

  // 键盘:1~6 选项,回车下一题。批量题型回车等于提交
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
        pick(index - 1)
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (onControl) return
        event.preventDefault()
        if (session?.verdict !== null) {
          advance()
          return
        }
        // 先选后交:回车等于点「确定」,排序没排完不给交
        if (question && session) {
          const ready =
            question.kind === 'order'
              ? session.picked.length === question.choices.length
              : session.picked.length > 0
          if (ready) commit(session.picked)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [question, session, pick, advance, commit])

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
    const isMulti = question.kind === 'multi'
    const isOrder = question.kind === 'order'
    /** 攒齐了才能交:排序要排满,其余题型至少选中一项 */
    const ready =
      question.kind === 'order'
        ? picked.length === question.choices.length
        : picked.length > 0

    /** 排序题在答完后,逐位标出对错 */
    const seqState = (choiceIndex: number) => {
      if (verdict === null) return 'placed'
      return question.choices[choiceIndex].rank === picked.indexOf(choiceIndex) ? 'ok' : 'bad'
    }

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
          {deckOfLevel(session.levelId)?.name ?? session.title}
          <span className="mx-2 text-line-strong">/</span>
          {session.title}
        </p>

        <div className="lg-game-play">
          <div className="lg-game-play-top">
            <span className="lg-game-kind" data-kind={question.kind}>
              {KIND_LABEL[question.kind]}
            </span>
            <span className="lg-game-counter">
              {session.index + 1} / {session.questions.length}
            </span>
          </div>

          <div
            className="lg-game-track"
            role="progressbar"
            aria-valuenow={session.index + (answered ? 1 : 0)}
            aria-valuemin={0}
            aria-valuemax={session.questions.length}
          >
            <div
              className="lg-game-track-fill"
              style={{
                width: `${((session.index + (answered ? 1 : 0)) / session.questions.length) * 100}%`,
              }}
            />
          </div>

          <p className="lg-game-prompt">{question.prompt}</p>
          {question.code ? <CodeBlock code={question.code} lang={question.lang} /> : null}

          {isOrder ? (
            <div className="lg-game-order">
              <ol className="lg-game-seq">
                {question.choices.map((choice, index) => {
                  const position = picked.indexOf(index)
                  const placed = position >= 0
                  return (
                    <li key={choice.text} data-state={placed ? seqState(index) : 'empty'}>
                      <span className="lg-game-seq-no">{placed ? position + 1 : index + 1}</span>
                      {placed ? (
                        <button
                          type="button"
                          className="lg-game-seq-text"
                          disabled={answered}
                          onClick={() => pick(index)}
                          title="点一下撤回"
                        >
                          {choice.text}
                        </button>
                      ) : (
                        <span className="lg-game-seq-text lg-game-seq-hint" aria-hidden="true">
                          待填
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>

              {answered ? null : (
                <div className="lg-game-pool">
                  <p className="lg-game-pool-label">
                    {picked.length === question.choices.length
                      ? '排满了，回车交卷'
                      : `待排 ${question.choices.length - picked.length} 项，按顺序点`}
                  </p>
                  <div className="lg-game-pool-list">
                    {question.choices.map((choice, index) =>
                      picked.includes(index) ? null : (
                        <button
                          key={choice.text}
                          type="button"
                          className="lg-game-chip"
                          onClick={() => pick(index)}
                        >
                          {choice.text}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="lg-game-options" data-kind={question.kind}>
              {question.choices.map((choice, index) => {
                const on = picked.includes(index)
                let state: string
                if (verdict === null) {
                  state = on ? 'on' : 'idle'
                } else if (isMulti) {
                  if (choice.correct) state = on ? 'right' : 'missed'
                  else state = on ? 'picked-wrong' : 'idle'
                } else {
                  // 单选类:选中的那项标对错,正确答案那项跟着点亮
                  state =
                    index === picked[0]
                      ? choice.correct
                        ? 'right'
                        : 'picked-wrong'
                      : choice.correct
                        ? 'right'
                        : 'idle'
                }
                return (
                  <button
                    type="button"
                    key={choice.text}
                    className="lg-game-option"
                    data-state={state}
                    aria-pressed={isMulti ? on : undefined}
                    disabled={answered}
                    onClick={() => pick(index)}
                  >
                    <span className="lg-game-option-key">{LETTERS[index] ?? index + 1}</span>
                    <span className={question.kind === 'blank' ? 'font-mono' : undefined}>
                      {choice.text}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {verdict === null ? (
            <div className="lg-game-actions">
              <button
                type="button"
                className="lg-game-btn lg-game-btn--primary"
                disabled={!ready}
                onClick={() => commit(picked)}
              >
                确定
                <span className="text-[0.72rem] opacity-70">
                  {isOrder
                    ? picked.length === question.choices.length
                      ? '(回车)'
                      : `还差 ${question.choices.length - picked.length} 项`
                    : isMulti
                      ? '(回车)'
                      : picked.length === 0
                        ? '先选一项'
                        : '(回车)'}
                </span>
              </button>
              {picked.length > 0 ? (
                <button
                  type="button"
                  className="lg-game-btn lg-game-btn--ghost"
                  onClick={() => setSession({ ...session, picked: [] })}
                >
                  清空重选
                </button>
              ) : null}
            </div>
          ) : null}

          {answered ? (
            <div className="lg-game-explain">
              <p className="lg-game-verdict" data-ok={verdict}>
                {verdict ? '答对了' : '答错了'}
                {!verdict && question.kind === 'judge' ? (
                  <span className="text-muted">
                    正确答案:{question.choices.find((item) => item.correct)?.text}
                  </span>
                ) : null}
              </p>
              {!verdict ? <AnswerKey question={question} /> : null}
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
          <p className="lg-game-empty mt-6">
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
                  <span className="lg-game-wrong-level">
                    {deckNameOf(item.id)} · {levelNameOf(item.id)}
                  </span>
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
      {/* 题库切换:各题库并列,刷哪个不受其它题库进度影响 */}
      <div className="lg-game-decks" role="group" aria-label="选择题库">
        {decks.map((item) => {
          const record = deckProgress(item.id, progress.levels)
          return (
            <button
              type="button"
              key={item.id}
              className="lg-game-deck"
              aria-pressed={item.id === deckId}
              onClick={() => setDeckId(item.id)}
            >
              <span className="lg-game-deck-name">{item.name}</span>
              <span className="lg-game-deck-meta">
                {record.cleared}/{record.total} 关
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 max-w-[34em] text-[0.88rem] leading-relaxed text-muted">{deck.intro}</p>

      <div className="lg-game-stats mt-8">
        <div className="lg-game-stat">
          <span className="lg-game-stat-value">
            {clearedCount}/{levelTotal}
          </span>
          <span className="lg-game-stat-label">本库通关</span>
        </div>
        <div className="lg-game-stat">
          <span className="lg-game-stat-value">
            {deckLevels.reduce((sum, level) => sum + level.questions.length, 0)}
          </span>
          <span className="lg-game-stat-label">本库题目</span>
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
        {/* 同步状态:没登录时点它是去登录;登录了点它是手动重拉一次 */}
        <button
          type="button"
          className="lg-game-btn lg-game-btn--ghost"
          onClick={() => (user ? pullFromServer() : openAuthDialog())}
        >
          {user
            ? sync === 'error'
              ? '同步失败,点此重试'
              : sync === 'syncing'
                ? '同步中…'
                : '云端已同步'
            : '未登录 · 只存本机'}
        </button>
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
            if (confirm(user ? '清空全部闯关进度和错题本?云端存档也会一起清掉。' : '清空全部闯关进度和错题本?'))
              setProgress(emptyProgress)
          }}
        >
          清空进度
        </button>
      </div>

      <div className="lg-game-path mt-8">
        {deckLevels.map((level, index) => {
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
