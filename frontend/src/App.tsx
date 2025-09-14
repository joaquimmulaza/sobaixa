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
}

function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')

  const handleFetchVideoInfo = async (videoUrl: string) => {
    console.log('Iniciando busca para URL:', videoUrl)
    console.log('URL length:', videoUrl.length)
    console.log('URL type:', typeof videoUrl)
    
    if (!videoUrl || videoUrl.trim() === '') {
      console.error('URL está vazia!')
      setError('Por favor, insira uma URL válida do YouTube.')
      return
    }
    
    setSubmittedUrl(videoUrl)
    setIsLoading(true)
    setError('')
    setVideoInfo(null)

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const apiUrl = `${API_BASE_URL}/api/info?url=${encodeURIComponent(videoUrl)}`;
      console.log('Fazendo requisição para:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      console.log('Resposta recebida:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro na resposta:', errorText)
        throw new Error(`Erro na requisição: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Dados recebidos:', data)
      setVideoInfo(data)
    } catch (error) {
      console.error('Erro na requisição:', error)
      setError('Não foi possível obter os detalhes do vídeo. Verifique o link e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-8" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        Sobaixa
      </h1>
      <UrlInputForm onUrlSubmit={handleFetchVideoInfo} />
      
      {/* Renderização condicional */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="mt-4">
          <p className="text-red-500">{error}</p>
        </div>
      ) : videoInfo ? (
        <div className="mt-4">
          <VideoResultCard info={videoInfo} originalUrl={submittedUrl} />
        </div>
      ) : null}
    </div>
  )
}

export default App
