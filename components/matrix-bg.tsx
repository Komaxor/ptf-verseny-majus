"use client"

import { useEffect, useRef } from "react"

export default function MatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const fontSize = 14
    const letters = "01"

    let columns: number
    let drops: number[]
    let speeds: number[]

    const init = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      columns = Math.floor(canvas.width / fontSize)

      drops = Array.from({ length: columns }, () =>
        Math.random() * (canvas.height / fontSize)
      )
      speeds = Array.from({ length: columns }, () =>
        0.5 + Math.random() * 1.5
      )
    }
    init()

    const handleResize = () => {
      init()
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    window.addEventListener("resize", handleResize)

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = fontSize + "px monospace"
      ctx.shadowColor = "#00ff88"
      ctx.shadowBlur = 6

      for (let i = 0; i < columns; i++) {
        const char = letters[Math.floor(Math.random() * letters.length)]
        const y = drops[i] * fontSize

        ctx.fillStyle = "#00ff88"
        ctx.fillText(char, i * fontSize, y)

        drops[i] += speeds[i]

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.90) {
          drops[i] = 0
          speeds[i] = 0.5 + Math.random() * 1.5
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0"
    />
  )
}
