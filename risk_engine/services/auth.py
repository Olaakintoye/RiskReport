"""
Authentication Service
Handles JWT verification and user authentication for the risk engine
"""

import os
import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

class AuthService:
    """Service for handling authentication"""
    
    def __init__(self):
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not self.jwt_secret:
            logger.warning("SUPABASE_JWT_SECRET not set - JWT verification will be skipped")
    
    def verify_jwt(self, token: str) -> Dict[str, Any]:
        """Verify Supabase JWT token"""
        try:
            if not self.jwt_secret:
                # In development, return a mock user if no JWT secret is set
                logger.warning("JWT verification skipped - no secret configured")
                return {"sub": "mock-user-id", "role": "authenticated"}
            
            # Decode and verify the JWT
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                options={"verify_exp": True}
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )

# Global auth service instance
auth_service = AuthService()

def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """Verify Supabase JWT token - standalone function"""
    return auth_service.verify_jwt(token)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user
    """
    try:
        token = credentials.credentials
        user = auth_service.verify_jwt(token)
        
        # Ensure user has required fields
        if "sub" not in user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user token - missing subject"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency to get current user (optional)
    Returns None if no valid authentication is provided
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

def require_service_role(user: Dict[str, Any]) -> bool:
    """Check if user has service role"""
    return user.get("role") == "service_role"

async def get_service_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency that requires service role
    """
    user = await get_current_user(credentials)
    
    if not require_service_role(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service role required"
        )
    
    return user

