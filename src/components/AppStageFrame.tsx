import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const DESIGN_WIDTH = 430
const DESIGN_HEIGHT = 932
const DESKTOP_FRAME_MIN_WIDTH = DESIGN_WIDTH + 80
const DESKTOP_SCALE_MIN_HEIGHT = DESIGN_HEIGHT + 64
const DESKTOP_FRAME_PADDING = 64
const WIDE_FRAME_VERTICAL_PADDING = 48
const DESKTOP_MAX_SCALE = 1.12
const PHONE_FRAME_RADIUS = 34

type StageViewport = {
  width: number
  height: number
}

type AppStageFrameProps = {
  children: ReactNode
}

export default function AppStageFrame({ children }: AppStageFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<StageViewport>({
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  })

  useLayoutEffect(() => {
    const frame = frameRef.current

    if (!frame || typeof window === 'undefined') {
      return
    }

    function syncViewport() {
      if (!frameRef.current) {
        return
      }

      setViewport({
        width: frameRef.current.clientWidth,
        height: frameRef.current.clientHeight,
      })
    }

    const resizeObserver = new ResizeObserver(syncViewport)
    const visualViewport = window.visualViewport

    syncViewport()
    resizeObserver.observe(frame)
    visualViewport?.addEventListener('resize', syncViewport)
    window.addEventListener('orientationchange', syncViewport)

    return () => {
      resizeObserver.disconnect()
      visualViewport?.removeEventListener('resize', syncViewport)
      window.removeEventListener('orientationchange', syncViewport)
    }
  }, [])

  const useWideFrame = viewport.width >= DESKTOP_FRAME_MIN_WIDTH
  const useDesktopScale =
    useWideFrame && viewport.height >= DESKTOP_SCALE_MIN_HEIGHT
  const desktopFrameScale = Math.min(
    (viewport.width - DESKTOP_FRAME_PADDING) / DESIGN_WIDTH,
    (viewport.height - DESKTOP_FRAME_PADDING) / DESIGN_HEIGHT,
    DESKTOP_MAX_SCALE,
  )
  const stageScale = useDesktopScale ? desktopFrameScale : 1
  const stageWidth = useDesktopScale
    ? DESIGN_WIDTH * stageScale
    : useWideFrame
      ? DESIGN_WIDTH
      : Math.min(viewport.width, DESIGN_WIDTH)
  const stageHeight = useDesktopScale
    ? DESIGN_HEIGHT * stageScale
    : useWideFrame
      ? Math.max(viewport.height - WIDE_FRAME_VERTICAL_PADDING, 0)
      : viewport.height
  const showPhoneFrame = useWideFrame && viewport.height >= 640
  const framePositionStyle = useWideFrame
    ? {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }
    : {
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
      }

  return (
    <div ref={frameRef} className="relative z-10 h-full w-full">
      <div
        className="absolute transition-[width,height] duration-200 ease-out"
        style={{
          width: stageWidth,
          height: stageHeight,
          ...framePositionStyle,
        }}
      >
        <div
          className={[
            'app-stage relative origin-top-left overflow-hidden bg-[#f7f2ff]',
            useWideFrame ? 'app-stage--wide' : 'app-stage--mobile',
            showPhoneFrame
              ? 'rounded-[34px]'
              : 'shadow-[0_0_70px_rgba(55,38,110,0.16)]',
          ].join(' ')}
          style={{
            width: useDesktopScale ? DESIGN_WIDTH : stageWidth,
            height: useDesktopScale ? DESIGN_HEIGHT : stageHeight,
            transform: useDesktopScale ? `scale(${stageScale})` : undefined,
            containerType: 'size',
          }}
        >
          {children}
        </div>
        {showPhoneFrame && (
          <div
            className="pointer-events-none absolute -inset-[10px] z-[100] border-[10px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.22)]"
            style={{ borderRadius: PHONE_FRAME_RADIUS * stageScale + 10 }}
          />
        )}
      </div>
    </div>
  )
}
