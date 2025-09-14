interface VideoInfo {
  title: string
  thumbnail: string
  channel: string
  duration_string: string
  video_formats: any[]
  best_audio: any
}

interface VideoResultCardProps {
  info: VideoInfo
  originalUrl: string
}

function VideoResultCard({ info, originalUrl }: VideoResultCardProps) {
  const handleDownload = (formatId: string) => {
    const apiUrl = `http://127.0.0.1:8000/api/download?url=${encodeURIComponent(originalUrl)}&format_id=${formatId}`;
    window.open(apiUrl, '_blank');
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 max-w-2xl w-full">
      {/* Thumbnail */}
      <img 
        src={info.thumbnail} 
        alt={info.title}
        className="w-full h-48 object-cover rounded-lg mb-4"
      />
      
      {/* Title */}
      <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">
        {info.title}
      </h2>
      
      {/* Channel */}
      <p className="text-gray-300 mb-4">
        {info.channel}
      </p>
      
      {/* Duration */}
      <p className="text-gray-400 text-sm mb-6">
        Duração: {info.duration_string}
      </p>
      
      {/* Best Audio Download */}
      {info.best_audio && (
        <div className="mb-6">
          <button 
            onClick={() => handleDownload(info.best_audio.format_id)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Baixar Áudio (MP3)
          </button>
        </div>
      )}
      
      {/* Video Formats */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">Formatos de Vídeo:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {info.video_formats.map((format, index) => (
            <button
              key={index}
              onClick={() => handleDownload(format.format_id)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {format.resolution || format.format_note || `Formato ${index + 1}`} - Baixar
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoResultCard

