from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import logger

_supabase_admin_client: Client = None
_supabase_anon_client: Client = None

def get_supabase_admin() -> Client:
    global _supabase_admin_client
    if _supabase_admin_client is None:
        try:
            _supabase_admin_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
        except Exception as e:
            logger.warning(f"Could not connect to Supabase with Service Role Key: {e}")
            _supabase_admin_client = None
    return _supabase_admin_client

def get_supabase_client(user_token: str = None) -> Client:
    global _supabase_anon_client
    if user_token:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        client.postgrest.auth(user_token)
        return client
    
    if _supabase_anon_client is None:
        try:
            _supabase_anon_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        except Exception as e:
            logger.warning(f"Could not connect to Supabase with Anon Key: {e}")
            _supabase_anon_client = None
    return _supabase_anon_client
