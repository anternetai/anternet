"use client"

import { useState, useCallback, useRef, useEffect } from "react"

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string
  interimText: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimText, setInterimText] = useState("")
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isStoppedRef = useRef(false)

  const isSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const createRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (!isSupported) return null

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ""
      let interim = ""

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript + " "
        } else {
          interim += result[0].transcript
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText)
      }
      setInterimText(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Speech recognition error:", event.error)
      // Don't stop on transient errors like "no-speech"
      if (event.error === "aborted" || event.error === "not-allowed") {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      // Auto-restart if we haven't explicitly stopped
      if (!isStoppedRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    return recognition
  }, [isSupported])

  const startListening = useCallback(() => {
    if (!isSupported) return

    isStoppedRef.current = false
    const recognition = createRecognition()
    if (!recognition) return

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsListening(true)
    } catch (e) {
      console.error("Failed to start speech recognition:", e)
    }
  }, [isSupported, createRecognition])

  const stopListening = useCallback(() => {
    isStoppedRef.current = true
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Already stopped
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimText("")
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimText("")
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStoppedRef.current = true
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // Already stopped
        }
      }
    }
  }, [])

  return {
    isListening,
    transcript,
    interimText,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
