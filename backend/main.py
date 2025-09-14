from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
import yt_dlp
import httpx
import re
import random
import asyncio
import time

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lista de User-Agents para rotação
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
]

# Cache para evitar muitas requisições
request_cache = {}
last_request_time = {}

def sanitize_filename(name: str) -> str:
    """Remove invalid characters from a filename."""
    return re.sub(r'[\\/*?:"<>|]', "_", name)

def clean_youtube_url(url: str) -> str:
    """Limpa a URL do YouTube removendo parâmetros desnecessários"""
    if 'youtube.com/watch' in url or 'youtu.be/' in url:
        # Remove parâmetros de playlist e outros
        if '&list=' in url:
            url = url.split('&list=')[0]
        if '&start_radio=' in url:
            url = url.split('&start_radio=')[0]
        if '&index=' in url:
            url = url.split('&index=')[0]
    return url

def get_ydl_opts():
    """Configurações otimizadas para o yt-dlp com anti-detecção"""
    user_agent = random.choice(USER_AGENTS)
    
    return {
        'quiet': True,  # Reduzir logs verbosos
        'no_warnings': False,
        'noplaylist': True,
        'extract_flat': False,
        'writethumbnail': False,
        'writeinfojson': False,
        'ignoreerrors': False,
        
        # Headers anti-detecção
        'http_headers': {
            'User-Agent': user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        },
        
        # Configurações do extractor YouTube
        'extractor_args': {
            'youtube': {
                'skip': ['dash', 'hls'],  # Pular formatos complexos
                'player_client': ['android', 'web', 'ios'],  # Múltiplos clients
                'player_skip': ['configs'],
                'comment_sort': ['top'],
            }
        },
        
        # Rate limiting e retries
        'sleep_interval': random.uniform(1, 3),
        'max_sleep_interval': 5,
        'sleep_interval_requests': random.uniform(0.5, 1.5),
        'sleep_interval_subtitles': random.uniform(0.5, 1),
        'retries': 5,
        'fragment_retries': 5,
        'skip_unavailable_fragments': True,
        
        # Configurações de rede
        'socket_timeout': 30,
        'source_address': '0.0.0.0',
        
        # Tentar contornar geo-blocking
        'geo_bypass': True,
        'geo_bypass_country': 'US',
    }

async def rate_limit_check(url: str):
    """Implementa rate limiting por URL"""
    current_time = time.time()
    if url in last_request_time:
        time_diff = current_time - last_request_time[url]
        if time_diff < 3:  # Mínimo 3 segundos entre requisições da mesma URL
            await asyncio.sleep(3 - time_diff)
    
    last_request_time[url] = current_time

@app.get("/")
def read_root():
    return {"status": "API Sobaixa está funcionando"}

@app.get("/api/info")
async def get_video_info(url: str):
    try:
        # Limpar e validar URL
        clean_url = clean_youtube_url(url)
        
        # Rate limiting
        await rate_limit_check(clean_url)
        
        # Check cache
        if clean_url in request_cache:
            cache_time = request_cache[clean_url].get('timestamp', 0)
            if time.time() - cache_time < 300:  # Cache por 5 minutos
                return request_cache[clean_url]['data']
        
        # Delay aleatório para parecer mais humano
        await asyncio.sleep(random.uniform(0.5, 2))
        
        ydl_opts = get_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await run_in_threadpool(ydl.extract_info, clean_url, download=False)
            
            if not info:
                raise HTTPException(status_code=404, detail="Vídeo não encontrado ou indisponível")
            
            simplified_formats = []
            best_audio = None
            highest_abr = 0

            formats = info.get('formats', [])
            if not formats:
                raise HTTPException(status_code=404, detail="Nenhum formato disponível")

            for f in formats:
                try:
                    # Video formats (mp4 com vídeo e áudio)
                    if (f.get('ext') == 'mp4' and 
                        f.get('vcodec') != 'none' and 
                        f.get('acodec') != 'none' and
                        f.get('url')):
                        
                        simplified_formats.append({
                            'format_id': f.get('format_id'),
                            'resolution': f.get('resolution') or f.get('height', 'N/A'),
                            'filesize': f.get('filesize'),
                            'ext': f.get('ext'),
                            'fps': f.get('fps'),
                            'vcodec': f.get('vcodec'),
                            'acodec': f.get('acodec'),
                        })
                    
                    # Best audio format
                    if (f.get('ext') in ['m4a', 'mp3', 'webm'] and 
                        f.get('acodec') != 'none' and 
                        f.get('vcodec') == 'none' and
                        f.get('url')):
                        
                        abr = f.get('abr', 0) or 0
                        if abr > highest_abr:
                            highest_abr = abr
                            best_audio = {
                                'format_id': f.get('format_id'),
                                'filesize': f.get('filesize'),
                                'ext': f.get('ext'),
                                'abr': abr,
                                'acodec': f.get('acodec'),
                            }
                            
                except Exception as format_error:
                    print(f"Erro processando formato: {format_error}")
                    continue

            response_data = {
                "title": info.get("title", "Título não disponível"),
                "thumbnail": info.get("thumbnail"),
                "duration_string": info.get("duration_string"),
                "duration": info.get("duration"),
                "channel": info.get("channel") or info.get("uploader"),
                "upload_date": info.get("upload_date"),
                "view_count": info.get("view_count"),
                "video_formats": simplified_formats,
                "best_audio": best_audio,
                "original_url": clean_url,
            }
            
            # Cache da resposta
            request_cache[clean_url] = {
                'data': response_data,
                'timestamp': time.time()
            }
            
            return response_data
            
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if "Sign in to confirm" in error_msg:
            raise HTTPException(
                status_code=429, 
                detail="YouTube está bloqueando requisições automatizadas. Tente novamente em alguns minutos."
            )
        raise HTTPException(status_code=400, detail=f"Erro do yt-dlp: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/api/download")
async def download_video(url: str, format_id: str):
    try:
        clean_url = clean_youtube_url(url)
        await rate_limit_check(clean_url)
        await asyncio.sleep(random.uniform(1, 2))
        
        ydl_opts = get_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await run_in_threadpool(ydl.extract_info, clean_url, download=False)
            
            if not info:
                raise HTTPException(status_code=404, detail="Vídeo não encontrado")
            
            chosen_format = next((f for f in info['formats'] if f['format_id'] == format_id), None)
            
            if not chosen_format or not chosen_format.get('url'):
                raise HTTPException(status_code=404, detail="Formato não encontrado ou URL indisponível")
            
            download_url = chosen_format['url']
            ext = chosen_format['ext']
            
            # Create a safe filename
            safe_title = sanitize_filename(info['title'][:100])  # Limitar tamanho
            filename = f"{safe_title}.{ext}"

            async def stream_content():
                headers = {
                    'User-Agent': random.choice(USER_AGENTS),
                    'Referer': 'https://www.youtube.com/',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Origin': 'https://www.youtube.com',
                }
                
                timeout = httpx.Timeout(30.0, connect=10.0)
                async with httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True) as client:
                    try:
                        async with client.stream("GET", download_url) as response:
                            response.raise_for_status()
                            async for chunk in response.aiter_bytes(chunk_size=8192):
                                yield chunk
                    except httpx.HTTPStatusError as e:
                        raise HTTPException(status_code=e.response.status_code, detail="Erro no download")
            
            headers = {
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/octet-stream'
            }
            
            return StreamingResponse(stream_content(), headers=headers)

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if "Sign in to confirm" in error_msg:
            raise HTTPException(
                status_code=429, 
                detail="YouTube está bloqueando downloads. Tente novamente mais tarde."
            )
        raise HTTPException(status_code=400, detail=f"Erro do yt-dlp: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

# Endpoint para limpar cache
@app.post("/api/clear-cache")
async def clear_cache():
    global request_cache, last_request_time
    request_cache.clear()
    last_request_time.clear()
    return {"message": "Cache limpo com sucesso"}

# Health check mais detalhado
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "cache_size": len(request_cache),
        "last_requests": len(last_request_time),
        "timestamp": time.time()
    }