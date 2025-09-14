import { useState } from 'react'
import UrlInputForm from './components/UrlInputForm'
import LoadingSpinner from './components/LoadingSpinner'
import VideoResultCard from './components/VideoResultCard'

interface VideoInfo {
  title: string
  thumbnail: string
  channel: string
  duration_string: string
  video_formats: any[]
  best_audio: any
  duration?: number
  upload_date?: string
  view_count?: number
  original_url?: string
}

function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')

  // Função para limpar URL do YouTube
  const cleanYouTubeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      
      // Manter apenas parâmetros essenciais
      const videoId = urlObj.searchParams.get('v')
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`
      }
      
      // Para URLs do tipo youtu.be
      if (urlObj.hostname === 'youtu.be') {
        const videoId = urlObj.pathname.slice(1)
        return `https://www.youtube.com/watch?v=${videoId}`
      }
      
      return url
    } catch (e) {
      console.warn('Erro ao limpar URL:', e)
      return url
    }
  }

  // Função para mostrar mensagens de erro amigáveis
  const showUserFriendlyError = (error: Error): string => {
    let message = error.message

    if (message.includes('Sign in to confirm') || message.includes('rate limit') || message.includes('429')) {
      return '⚠️ O YouTube está limitando o acesso. Tente:\n\n• Aguardar 2-3 minutos\n• Usar outro vídeo\n• Tentar novamente mais tarde'
    } else if (message.includes('URL inválida') || message.includes('400')) {
      return '❌ Link inválido. Verifique se é um link válido do YouTube.'
    } else if (message.includes('vídeo indisponível') || message.includes('404')) {
      return '🚫 Este vídeo não está disponível ou é privado.'
    } else if (message.includes('Erro interno') || message.includes('500')) {
      return '🔧 Erro temporário do servidor. Tente novamente em alguns segundos.'
    } else if (message.includes('NetworkError') || message.includes('fetch')) {
      return '🌐 Erro de conexão. Verifique sua internet e tente novamente.'
    }
    
    return message
  }

  // Função melhorada para buscar informações do vídeo com retry
  const fetchVideoInfoWithRetry = async (url: string, retryCount = 0): Promise<VideoInfo> => {
    const maxRetries = 3
    const baseDelay = 2000 // 2 segundos
    
    try {
      console.log(`Tentativa ${retryCount + 1} para URL: ${url}`)
      
      // Adicionar delay progressivo entre tentativas
      if (retryCount > 0) {
        const delay = baseDelay * Math.pow(2, retryCount - 1) // Exponential backoff
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sobaixa-api.onrender.com'
      const encodedUrl = encodeURIComponent(url)
      const apiUrl = `${API_BASE_URL}/api/info?url=${encodedUrl}`
      
      console.log('Fazendo requisição para:', apiUrl)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': window.location.origin,
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('Resposta recebida:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Tratar diferentes tipos de erro
        if (response.status === 429 || 
            (errorData.detail && errorData.detail.includes('Sign in to confirm'))) {
          
          if (retryCount < maxRetries) {
            console.log(`Erro de rate limit. Tentando novamente (${retryCount + 1}/${maxRetries})`)
            return await fetchVideoInfoWithRetry(url, retryCount + 1)
          } else {
            throw new Error('YouTube está temporariamente bloqueando requisições. Tente novamente em alguns minutos.')
          }
        }
        
        if (response.status === 400) {
          throw new Error('URL inválida ou vídeo indisponível. Verifique o link do YouTube.')
        }
        
        if (response.status >= 500) {
          if (retryCount < maxRetries) {
            console.log(`Erro do servidor. Tentando novamente (${retryCount + 1}/${maxRetries})`)
            return await fetchVideoInfoWithRetry(url, retryCount + 1)
          } else {
            throw new Error('Erro interno do servidor. Tente novamente mais tarde.')
          }
        }
        
        throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Informações do vídeo obtidas com sucesso:', data)
      return data
      
    } catch (error: any) {
      console.error(`Erro na tentativa ${retryCount + 1}:`, error)
      
      // Retry em caso de erro de rede
      if ((error.name === 'TypeError' || error.name === 'NetworkError' || 
           error.message.includes('fetch') || error.name === 'AbortError') && 
           retryCount < maxRetries) {
        console.log(`Erro de rede. Tentando novamente (${retryCount + 1}/${maxRetries})`)
        return await fetchVideoInfoWithRetry(url, retryCount + 1)
      }
      
      // Se todas as tentativas falharam, lançar o último erro
      if (retryCount >= maxRetries) {
        throw new Error(`Falha após ${maxRetries + 1} tentativas: ${error.message}`)
      }
      
      throw error
    }
  }

  const handleFetchVideoInfo = async (videoUrl: string) => {
    console.log('Iniciando busca para URL:', videoUrl)
    console.log('URL length:', videoUrl.length)
    console.log('URL type:', typeof videoUrl)
    
    if (!videoUrl || videoUrl.trim() === '') {
      console.error('URL está vazia!')
      setError('Por favor, insira uma URL válida do YouTube.')
      return
    }
    
    // Limpar URL
    const cleanUrl = cleanYouTubeUrl(videoUrl.trim())
    console.log('URL limpa:', cleanUrl)
    
    setSubmittedUrl(cleanUrl)
    setIsLoading(true)
    setError('')
    setVideoInfo(null)

    try {
      const data = await fetchVideoInfoWithRetry(cleanUrl)
      setVideoInfo(data)
    } catch (error: any) {
      console.error('Erro final:', error)
      const friendlyMessage = showUserFriendlyError(error)
      setError(friendlyMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-5xl font-bold mb-8 text-center" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Sobaixa
        </h1>
        
        <div className="flex justify-center mb-8">
          <UrlInputForm onUrlSubmit={handleFetchVideoInfo} isLoading={isLoading} />
        </div>
        
        {/* Renderização condicional */}
        {isLoading && (
          <div className="flex justify-center">
            <LoadingSpinner />
          </div>
        )}
        
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 max-w-md w-full">
              <pre className="text-red-400 text-sm whitespace-pre-wrap">{error}</pre>
              <button 
                onClick={() => setError('')}
                className="mt-3 text-red-300 hover:text-red-100 text-sm underline"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
        
        {videoInfo && !isLoading && !error && (
          <div className="flex justify-center">
            <VideoResultCard info={videoInfo} originalUrl={submittedUrl} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App