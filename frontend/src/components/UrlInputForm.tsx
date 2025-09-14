import { useState } from 'react'

interface UrlInputFormProps {
  onUrlSubmit: (url: string) => void
  isLoading?: boolean
}

export default function UrlInputForm({ onUrlSubmit, isLoading = false }: UrlInputFormProps) {
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/
    return youtubeRegex.test(url)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    
    // Limpar erro quando o usuário começar a digitar
    if (urlError && newUrl.trim() !== '') {
      setUrlError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      setUrlError('Por favor, insira uma URL do YouTube')
      return
    }

    if (!validateYouTubeUrl(url.trim())) {
      setUrlError('Por favor, insira uma URL válida do YouTube')
      return
    }

    console.log('UrlInputForm - URL antes de enviar:', url)
    setUrlError('')
    onUrlSubmit(url.trim())
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(text)
        setUrlError('')
      }
    } catch (error) {
      console.error('Erro ao colar do clipboard:', error)
    }
  }

  const clearInput = () => {
    setUrl('')
    setUrlError('')
  }

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Cole o link do YouTube aqui... (ex: https://www.youtube.com/watch?v=...)"
            value={url}
            onChange={handleInputChange}
            disabled={isLoading}
            className={`w-full bg-gray-800 border rounded-lg p-4 pr-24 focus:ring-2 focus:outline-none transition-colors ${
              urlError 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-700 focus:ring-blue-500'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          
          {/* Botões do lado direito do input */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            {url && !isLoading && (
              <button
                type="button"
                onClick={clearInput}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Limpar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Colar do clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mostrar erro de validação */}
        {urlError && (
          <p className="text-red-400 text-sm">{urlError}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={`w-full p-4 rounded-lg font-semibold transition-all duration-200 ${
            isLoading || !url.trim()
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              <span>Processando...</span>
            </div>
          ) : (
            'Buscar Vídeo'
          )}
        </button>
      </form>

      {/* Dicas de uso */}
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">💡 Dicas:</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Funciona com links do YouTube e YouTube Music</li>
          <li>• Aceita URLs encurtadas (youtu.be)</li>
          <li>• Remove automaticamente parâmetros desnecessários</li>
          <li>• Se houver erro, aguarde alguns minutos e tente novamente</li>
        </ul>
      </div>
    </div>
  )
}