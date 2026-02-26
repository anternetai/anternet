"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Droplets, Loader2 } from "lucide-react"

export default function CRMLogin() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/crm/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push("/crm")
      router.refresh()
    } else {
      setError("Wrong password. Try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8 text-teal-400">
          <Droplets className="h-8 w-8" />
          <span className="text-2xl font-bold text-white">Dr. Squeegee</span>
        </div>
        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 space-y-4">
          <h1 className="text-lg font-semibold text-white text-center">CRM Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passphrase"
            autoFocus
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
