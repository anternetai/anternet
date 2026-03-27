/**
 * Audio Resampler — Converts browser audio (48kHz) to 16kHz mono PCM for Gemini Live API.
 *
 * Uses ScriptProcessorNode (widely supported) to pull PCM frames from mixed audio,
 * downsample to 16kHz mono, and emit base64-encoded chunks at regular intervals.
 *
 * Architecture:
 *   localStream ──┐
 *                  ├──► AudioContext mixer ──► ScriptProcessor ──► onChunk(base64)
 *   remoteStream ─┘
 */

import { GEMINI_AUDIO_CONFIG } from "./gemini-types"

const TARGET_SAMPLE_RATE = GEMINI_AUDIO_CONFIG.sampleRate // 16000

export interface AudioResamplerHandle {
  /** Start capturing and resampling audio from both streams */
  start: () => void
  /** Stop capturing and clean up */
  stop: () => void
  /** Whether currently capturing */
  isActive: boolean
}

/**
 * Creates an audio resampler that mixes local + remote streams,
 * downsamples to 16kHz mono PCM, and calls onChunk with base64 data.
 */
export function createAudioResampler(options: {
  localStream: MediaStream
  remoteStream: MediaStream | null
  onChunk: (base64Pcm: string) => void
}): AudioResamplerHandle {
  const { localStream, remoteStream, onChunk } = options

  let audioCtx: AudioContext | null = null
  let scriptNode: ScriptProcessorNode | null = null
  let isActive = false

  function start() {
    if (isActive) return

    // Create AudioContext at native sample rate (usually 48kHz)
    audioCtx = new AudioContext()
    const nativeSampleRate = audioCtx.sampleRate
    const downsampleRatio = nativeSampleRate / TARGET_SAMPLE_RATE

    // Mix both streams into a single destination
    const destination = audioCtx.createMediaStreamDestination()

    // Connect local (agent mic)
    if (localStream.getAudioTracks().length > 0) {
      const localSource = audioCtx.createMediaStreamSource(localStream)
      localSource.connect(destination)
    }

    // Connect remote (prospect voice) if available
    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
      try {
        const remoteSource = audioCtx.createMediaStreamSource(remoteStream)
        remoteSource.connect(destination)
      } catch (e) {
        console.warn("[AudioResampler] Failed to connect remote stream:", e)
      }
    }

    // Create a source from the mixed destination to feed ScriptProcessor
    const mixedSource = audioCtx.createMediaStreamSource(destination.stream)

    // ScriptProcessor: buffer size 4096 gives us ~85ms chunks at 48kHz
    // Good balance between latency and processing overhead
    const bufferSize = 4096
    scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1)

    // Accumulator for resampled PCM — we batch small chunks to reduce WS overhead
    let accumulator: number[] = []
    const TARGET_CHUNK_SAMPLES = Math.floor(TARGET_SAMPLE_RATE * GEMINI_AUDIO_CONFIG.chunkIntervalMs / 1000) // ~480 samples for 30ms

    scriptNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0) // mono

      // Downsample: linear interpolation from nativeSampleRate to 16kHz
      const outputLength = Math.floor(inputData.length / downsampleRatio)
      for (let i = 0; i < outputLength; i++) {
        const srcIndex = i * downsampleRatio
        const srcFloor = Math.floor(srcIndex)
        const srcCeil = Math.min(srcFloor + 1, inputData.length - 1)
        const frac = srcIndex - srcFloor
        // Linear interpolation between samples
        const sample = inputData[srcFloor] * (1 - frac) + inputData[srcCeil] * frac
        accumulator.push(sample)
      }

      // Emit chunks at the target interval
      while (accumulator.length >= TARGET_CHUNK_SAMPLES) {
        const chunk = accumulator.splice(0, TARGET_CHUNK_SAMPLES)
        const pcm16 = float32ToPcm16(chunk)
        const base64 = arrayBufferToBase64(pcm16)
        onChunk(base64)
      }
    }

    mixedSource.connect(scriptNode)
    scriptNode.connect(audioCtx.destination) // required for processing to fire

    isActive = true
    console.log(`[AudioResampler] Started: ${nativeSampleRate}Hz → ${TARGET_SAMPLE_RATE}Hz, ratio=${downsampleRatio.toFixed(2)}`)
  }

  function stop() {
    if (!isActive) return

    if (scriptNode) {
      scriptNode.disconnect()
      scriptNode.onaudioprocess = null
      scriptNode = null
    }

    if (audioCtx && audioCtx.state !== "closed") {
      try { audioCtx.close() } catch {}
      audioCtx = null
    }

    isActive = false
    console.log("[AudioResampler] Stopped")
  }

  return {
    start,
    stop,
    get isActive() { return isActive },
  }
}

// ─── Conversion Utilities ──────────────────────────────────────────────────

/** Convert float32 audio samples (-1.0 to 1.0) to 16-bit PCM (little-endian) */
function float32ToPcm16(samples: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2) // 2 bytes per sample
  const view = new DataView(buffer)

  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1] then scale to int16 range
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF
    view.setInt16(i * 2, int16, true) // true = little-endian
  }

  return buffer
}

/** Convert ArrayBuffer to base64 string */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
