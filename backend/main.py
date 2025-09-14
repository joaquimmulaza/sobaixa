from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
import yt_dlp
import httpx
import re

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens para debug
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sanitize_filename(name: str) -> str:
    """Remove invalid characters from a filename."""
    return re.sub(r'[\\/*?:"<>|]', "_", name)

def get_ydl_opts():
    """Configurações otimizadas para o yt-dlp"""
    return {
        'verbose': True,
        'noplaylist': True,
        'format': 'best',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        },
        'extractor_args': {
            'youtube': {
                'skip': ['dash', 'hls'],
                'player_client': ['android', 'web'],
            }
        },
        # Adicionar delay para evitar rate limiting
        'sleep_interval': 1,
        'max_sleep_interval': 5,
        # Tentar múltiplos extractors
        'retries': 3,
    }

@app.get("/")
def read_root():
    return {"status": "API Sobaixa está funcionando"}

@app.get("/api/info")
async def get_video_info(url: str):
    try:
        # Limpar a URL removendo parâmetros de playlist
        if 'list=' in url:
            url = url.split('&list=')[0]
        
        ydl_opts = get_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await run_in_threadpool(ydl.extract_info, url, download=False)
            
            simplified_formats = []
            best_audio = None
            highest_abr = 0

            for f in info.get('formats', []):
                # Video formats (mp4 with video and audio)
                if f.get('ext') == 'mp4' and f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    simplified_formats.append({
                        'format_id': f.get('format_id'),
                        'resolution': f.get('resolution'),
                        'filesize': f.get('filesize'),
                        'ext': f.get('ext'),
                    })
                
                # Best audio format (m4a with highest abr)
                if f.get('ext') == 'm4a' and f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                    abr = f.get('abr', 0)
                    if abr > highest_abr:
                        highest_abr = abr
                        best_audio = {
                            'format_id': f.get('format_id'),
                            'filesize': f.get('filesize'),
                            'ext': f.get('ext'),
                            'abr': abr,
                        }

            response_data = {
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "duration_string": info.get("duration_string"),
                "channel": info.get("channel"),
                "video_formats": simplified_formats,
                "best_audio": best_audio,
            }
            return response_data
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=f"Erro do yt-dlp: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}")

@app.get("/api/download")
async def download_video(url: str, format_id: str):
    try:
        # Limpar a URL removendo parâmetros de playlist
        if 'list=' in url:
            url = url.split('&list=')[0]
            
        ydl_opts = get_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await run_in_threadpool(ydl.extract_info, url, download=False)
            
            chosen_format = next((f for f in info['formats'] if f['format_id'] == format_id), None)
            
            if not chosen_format:
                raise HTTPException(status_code=404, detail="Formato não encontrado.")
            
            download_url = chosen_format['url']
            ext = chosen_format['ext']
            
            # Create a safe filename
            safe_title = sanitize_filename(info['title'])
            filename = f"{safe_title}.{ext}"

            async def stream_content():
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.youtube.com/',
                }
                async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
                    async with client.stream("GET", download_url) as response:
                        async for chunk in response.aiter_bytes():
                            yield chunk
            
            headers = {
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
            
            return StreamingResponse(stream_content(), headers=headers)

    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=f"Erro do yt-dlp: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}")