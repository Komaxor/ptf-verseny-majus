"use client"

import { useEffect, useRef } from "react"

export default function MatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const paintStaticBackdrop = () => {
      resize()
      ctx.fillStyle = "#0a0a0f"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    let animationId: number | null = null
    let columns = 0
    let drops: number[] = []
    let speeds: number[] = []
    const fontSize = 14
    const letters = "01"

    const initColumns = () => {
      resize()
      columns = Math.floor(canvas.width / fontSize)
      drops = Array.from({ length: columns }, () =>
        Math.random() * (canvas.height / fontSize)
      )
      speeds = Array.from({ length: columns }, () =>
        0.5 + Math.random() * 1.5
      )
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = fontSize + "px monospace"
      ctx.fillStyle = "#00ff88"

      for (let i = 0; i < columns; i++) {
        const char = letters[Math.floor(Math.random() * letters.length)]
        const y = drops[i] * fontSize
        ctx.fillText(char, i * fontSize, y)

        drops[i] += speeds[i]

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.9) {
          drops[i] = 0
          speeds[i] = 0.5 + Math.random() * 1.5
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    const stopAnimation = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }

    const startAnimation = () => {
      stopAnimation()
      initColumns()
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      animationId = requestAnimationFrame(draw)
    }

    const handleResize = () => {
      if (reducedMotion.matches) {
        paintStaticBackdrop()
      } else {
        initColumns()
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    const handlePrefChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        stopAnimation()
        paintStaticBackdrop()
      } else {
        startAnimation()
      }
    }

    if (reducedMotion.matches) {
      paintStaticBackdrop()
    } else {
      startAnimation()
    }

    window.addEventListener("resize", handleResize)
    reducedMotion.addEventListener("change", handlePrefChange)

    return () => {
      stopAnimation()
      window.removeEventListener("resize", handleResize)
      reducedMotion.removeEventListener("change", handlePrefChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full z-0"
    />
  )
}
