import { useState } from 'react'

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

interface VideoResultCardProps {
  info: VideoInfo
  originalUrl: string
}

function VideoResultCard({ info, originalUrl }: VideoResultCardProps) {
  const [downloadingFormats, setDownloadingFormats] = useState<Set<string>>(new Set())

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return 'Tamanho desconhecido'
    
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatViewCount = (count: number | undefined): string => {
    if (!count) return ''
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M visualizações`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K visualizações`
    }
    return `${count} visualizações`
  }

  const formatUploadDate = (dateString: string | undefined): string => {
    if (!dateString) return ''
    
    try {
      // Format: YYYYMMDD
      const year = dateString.slice(0, 4)
      const month = dateString.slice(4, 6)
      const day = dateString.slice(6, 8)
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  const handleDownload = async (formatId: string, formatType: 'audio' | 'video' = 'video') => {
    try {
      setDownloadingFormats(prev => new Set(prev).add(formatId))
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sobaixa-api.onrender.com'
      const apiUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(originalUrl)}&format_id=${formatId}`
      
      console.log(`Iniciando download ${formatType}:`, apiUrl)
      
      // Criar um link temporário para download
      const link = document.createElement('a')
      link.href = apiUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Erro no download:', error)
      alert('Erro ao iniciar download. Tente novamente.')
    } finally {
      // Remove from downloading set after a delay
      setTimeout(() => {
        setDownloadingFormats(prev => {
          const newSet = new Set(prev)
          newSet.delete(formatId)
          return newSet
        })
      }, 2000)
    }
  }

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 max-w-4xl w-full shadow-2xl border border-gray-700/50">
      {/* Header com thumbnail e informações básicas */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Thumbnail */}
        <div className="lg:w-1/3">
          <img 
            src={info.thumbnail} 
            alt={info.title}
            className="w-full h-48 lg:h-32 object-cover rounded-lg shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik05NiA2NkwxNDQgOTZMOTYgMTI2VjY2WiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K'
            }}
          />
        </div>
        
        {/* Informações do vídeo */}
        <div className="lg:w-2/3">
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 leading-tight">
            {info.title}
          </h2>
          
          <div className="space-y-2 text-gray-300">
            <p className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              {info.channel}
            </p>
            
            {info.duration_string && (
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Duração: {info.duration_string}
              </p>
            )}
            
            {info.view_count && (
              <p className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {formatViewCount(info.view_count)}
              </p>
            )}
            
            {info.upload_date && (
              <p className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {formatUploadDate(info.upload_date)}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Botão de áudio em destaque */}
      {info.best_audio && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-1.664-.506-3.205-1.343-4.243a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-.757 2.829 1 1 0 11-1.415-1.414A3.987 3.987 0 0013 12a3.987 3.987 0 00-.171-1.415 1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Melhor Qualidade de Áudio
          </h3>
          <button 
            onClick={() => handleDownload(info.best_audio.format_id, 'audio')}
            disabled={downloadingFormats.has(info.best_audio.format_id)}
            className={`w-full flex items-center justify-center space-x-3 font-bold py-4 px-6 rounded-lg transition-all duration-200 ${
              downloadingFormats.has(info.best_audio.format_id)
                ? 'bg-green-700 cursor-not-allowed opacity-70'
                : 'bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {downloadingFormats.has(info.best_audio.format_id) ? (
              <>
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                <span>Baixando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Baixar Áudio ({info.best_audio.ext?.toUpperCase()})</span>
                {info.best_audio.filesize && (
                  <span className="text-green-200 text-sm">
                    {formatFileSize(info.best_audio.filesize)}
                  </span>
                )}
              </>
            )}
          </button>
          
          {info.best_audio.abr && (
            <p className="text-gray-400 text-sm mt-2 text-center">
              Qualidade: {info.best_audio.abr} kbps • Codec: {info.best_audio.acodec}
            </p>
          )}
        </div>
      )}
      
      {/* Formatos de vídeo */}
      {info.video_formats && info.video_formats.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
            Formatos de Vídeo ({info.video_formats.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {info.video_formats.map((format, index) => (
              <button
                key={index}
                onClick={() => handleDownload(format.format_id)}
                disabled={downloadingFormats.has(format.format_id)}
                className={`flex flex-col items-center space-y-2 p-4 rounded-lg border transition-all duration-200 ${
                  downloadingFormats.has(format.format_id)
                    ? 'bg-blue-700 border-blue-600 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700 border-blue-500 hover:border-blue-400 hover:shadow-lg transform hover:-translate-y-1'
                }`}
              >
                {downloadingFormats.has(format.format_id) ? (
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                
                <div className="text-center">
                  <p className="font-semibold text-white">
                    {format.resolution || `${format.height || 'N/A'}p`}
                  </p>
                  <p className="text-blue-100 text-sm">
                    {format.ext?.toUpperCase()}
                  </p>
                  {format.filesize && (
                    <p className="text-blue-200 text-xs">
                      {formatFileSize(format.filesize)}
                    </p>
                  )}
                  {format.fps && (
                    <p className="text-blue-200 text-xs">
                      {format.fps} FPS
                    </p>
                  )}
                </div>
                
                <p className="text-blue-100 text-xs text-center">
                  {downloadingFormats.has(format.format_id) ? 'Baixando...' : 'Baixar'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Mensagem se não houver formatos */}
      {(!info.video_formats || info.video_formats.length === 0) && !info.best_audio && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">
            Nenhum formato de download disponível para este vídeo.
          </p>
        </div>
      )}
      
      {/* Informações adicionais */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500">
          <p>
            💡 Tip: Clique no botão para iniciar o download automaticamente
          </p>
          {info.original_url && (
            <a 
              href={info.original_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
            >
              Ver no YouTube
              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoResultCard