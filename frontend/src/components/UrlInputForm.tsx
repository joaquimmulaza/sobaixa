import { useState } from 'react'

export default function UrlInputForm({ onUrlSubmit }: { onUrlSubmit: (url: string) => void }) {
  const [url, setUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('UrlInputForm - URL antes de enviar:', url)
    onUrlSubmit(url)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Cole o link do YouTube aqui..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="mt-4 w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        Baixar
      </button>
    </form>
  )
}
