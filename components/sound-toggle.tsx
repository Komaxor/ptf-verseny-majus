"use client"

import { useState } from "react"
import { Volume2, VolumeX } from "lucide-react"

export function SoundToggle() {
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("video_muted") !== "true"
  })

  const toggle = () => {
    const next = !soundOn
    setSoundOn(next)
    localStorage.setItem("video_muted", String(!next))
  }

  return (
    <button
      onClick={toggle}
      aria-label={soundOn ? "Hang kikapcsolása" : "Hang bekapcsolása"}
      aria-pressed={soundOn}
      className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-brand/30 rounded-lg text-sm text-white/70 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {soundOn ? <Volume2 className="w-4 h-4 text-brand" /> : <VolumeX className="w-4 h-4" />}
      <span>{soundOn ? "Hang be" : "Hang ki"}</span>
    </button>
  )
}
