"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Loader2, RotateCcw } from "lucide-react"
import { t } from "@/lib/translations"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  assistantName?: string
  welcomeMessage?: string
}

function getSessionHash(): string {
  if (typeof window === "undefined") {
    // Generate a temporary hash for SSR - will be replaced on client
    return crypto.randomUUID()
  }

  try {
    const storageKey = "ptf_session_hash"
    let hash = localStorage.getItem(storageKey)

    if (!hash) {
      hash = crypto.randomUUID()
      localStorage.setItem(storageKey, hash)
      console.log("[chat] Created new session hash:", hash.substring(0, 8) + "...")
    } else {
      console.log("[chat] Using existing session hash:", hash.substring(0, 8) + "...")
    }

    return hash
  } catch (e) {
    // localStorage might be blocked
    console.warn("[chat] localStorage not available, generating temporary hash")
    return crypto.randomUUID()
  }
}

export interface ChatInterfaceHandle {
  clearContext: () => void
  isStreaming: boolean
}

export const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(function ChatInterface({ assistantName, welcomeMessage }, ref) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionHash, setSessionHash] = useState<string>("")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current) {
      const hash = getSessionHash()
      setSessionHash(hash)
      initializedRef.current = true
    }
  }, [])

  useEffect(() => {
    const defaultWelcome = t.chat.defaultWelcome(assistantName || "az AI asszisztens")
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeMessage || defaultWelcome,
      },
    ])
  }, [assistantName, welcomeMessage])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const clearContext = useCallback(() => {
    const defaultWelcome = t.chat.defaultWelcome(assistantName || "az AI asszisztens")
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeMessage || defaultWelcome,
      },
    ])
  }, [assistantName, welcomeMessage])

  useImperativeHandle(ref, () => ({
    clearContext,
    isStreaming,
  }), [clearContext, isStreaming])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isStreaming) return

      const currentHash = sessionHash || getSessionHash()
      if (!sessionHash && currentHash) {
        setSessionHash(currentHash)
      }

      console.log("[chat] Sending message with session hash:", currentHash.substring(0, 8) + "...")

      const userMessage = input.trim()
      setInput("")

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
      }
      setMessages((prev) => [...prev, userMsg])

      const assistantMsgId = `assistant-${Date.now()}`
      setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }])
      setIsStreaming(true)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            session_hash: currentHash, // Always send session hash
          }),
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null)
          throw new Error(errorBody?.error || "Failed to fetch")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error("No reader available")

        let assistantContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantContent += parsed.content
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantContent } : m)),
                  )
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: t.chat.errorMessage } : m,
          ),
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [input, isStreaming, messages, sessionHash],
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground">{assistantName || "AI Asszisztens"} {t.chat.aiHelpdesk}</span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.placeholder}
            disabled={isStreaming}
            className="flex-1 bg-muted border-border focus:border-blue-500"
          />
          <Button
            type="submit"
            disabled={isStreaming || !input.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
})
