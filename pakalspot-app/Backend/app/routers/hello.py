from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
import httpx
from app.core.settings import settings

router = APIRouter(prefix="/hello", tags=["hello"])


@router.get("")
async def hello():
    """
    GET /api/hello
    Calls backend2 at /api/world with "HELLO" and returns "HELLO WORLD"
    Returns 502 if backend2 is unreachable
    """
    backend2_url = settings.BACKEND2_URL
    world_endpoint = f"{backend2_url}/api/world"
    
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.post(
                world_endpoint,
                content="HELLO",
                headers={"Content-Type": "text/plain"}
            )
            response.raise_for_status()
            world_response = response.text.strip()
            
            if world_response == "WORLD":
                return PlainTextResponse(content="HELLO WORLD", status_code=200)
            else:
                raise HTTPException(
                    status_code=502,
                    detail=f"backend2 returned unexpected response: {world_response}"
                )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=502,
            detail="backend2 unreachable: timeout"
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail="backend2 unreachable: connection error"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"backend2 returned error: {e.response.status_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"backend2 unreachable: {str(e)}"
        )

