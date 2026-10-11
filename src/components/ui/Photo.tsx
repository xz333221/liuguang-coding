import { useState } from 'react'

type PhotoProps = {
  file: string
  alt: string
  className?: string
  imgClassName?: string
  radiusClass?: string
  eager?: boolean
  /** 只有 Hero 需要那道扫光,别每张图都挂一个无限动画 */
  stream?: boolean
}

/**
 * 统一处理站点照片:暖灰双色调、圆角、加载失败兜底。
 * 素材是站内文件(public/photos),不依赖第三方图床。
 */
export function Photo({
  file,
  alt,
  className = '',
  imgClassName = '',
  radiusClass = 'rounded-[18px]',
  eager = false,
  stream = false,
}: PhotoProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-panel ${radiusClass} ${className}`}>
      <div aria-hidden="true" className="lg-photo-fallback absolute inset-0" />
      {failed ? null : (
        <img
          src={`${import.meta.env.BASE_URL}photos/${file}`}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={`lg-photo relative h-full w-full object-cover ${imgClassName}`}
        />
      )}
      <div aria-hidden="true" className="lg-photo-tint pointer-events-none absolute inset-0" />
      {stream ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="lg-stream absolute inset-y-[-25%] left-0 w-[30%]" />
        </div>
      ) : null}
    </div>
  )
}
