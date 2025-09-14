interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

function LoadingSpinner({ message = 'Carregando...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Spinner principal */}
      <div className={`${sizeClasses[size]} border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mb-4`}></div>
      
      {/* Pulse dots para efeito adicional */}
      <div className="flex space-x-1 mb-4">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
      
      {/* Mensagem */}
      <p className={`text-gray-300 ${textSizeClasses[size]} text-center`}>
        {message}
      </p>
      
      {/* Mensagem de dica */}
      <p className="text-gray-500 text-xs mt-2 text-center max-w-xs">
        Processando informações do vídeo...
      </p>
    </div>
  )
}

export default LoadingSpinner