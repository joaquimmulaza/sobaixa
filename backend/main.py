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

@app.get("/")
def read_root():
    return {"status": "API Sobaixa está funcionando"}

@app.get("/api/info")
async def get_video_info(url: str):
    try:
        with yt_dlp.YoutubeDL({'verbose': True, 'noplaylist': True}) as ydl:
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

@app.get("/api/download")
async def download_video(url: str, format_id: str):
    try:
        with yt_dlp.YoutubeDL({'verbose': True, 'noplaylist': True}) as ydl:
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
                async with httpx.AsyncClient() as client:
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
        raise HTTPException(status_code=500, detail=str(e))
