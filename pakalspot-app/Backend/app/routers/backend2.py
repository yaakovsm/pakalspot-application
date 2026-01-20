from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/world", tags=["backend2"])


@router.post("")
async def world(request: Request):
    """
    POST /api/world
    Accepts "HELLO" as plain text or JSON {"message": "HELLO"}
    Returns "WORLD" if input is "HELLO", else returns 400
    """
    try:
        # Try to read as plain text first
        body = await request.body()
        body_str = body.decode("utf-8").strip()
        
        # Check if it's JSON
        if body_str.startswith("{") or body_str.startswith('"'):
            import json
            try:
                data = json.loads(body_str)
                # Handle JSON format {"message": "HELLO"}
                if isinstance(data, dict) and data.get("message") == "HELLO":
                    return PlainTextResponse(content="WORLD", status_code=200)
                elif isinstance(data, str) and data == "HELLO":
                    return PlainTextResponse(content="WORLD", status_code=200)
            except json.JSONDecodeError:
                pass
        
        # Handle plain text "HELLO"
        if body_str == "HELLO":
            return PlainTextResponse(content="WORLD", status_code=200)
        
        # Invalid input
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input. Expected 'HELLO' (plain text or JSON), got: {body_str[:50]}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing request: {str(e)}"
        )

