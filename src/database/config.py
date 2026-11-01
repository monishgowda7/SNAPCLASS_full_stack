import os
import toml
from supabase import create_client, Client

supabase_url = None
supabase_key = None

secrets_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".streamlit", "secrets.toml")
if os.path.exists(secrets_file):
    try:
        secrets = toml.load(secrets_file)
        supabase_url = secrets.get("supabase_url")
        supabase_key = secrets.get("superbase_key")
    except Exception:
        pass

if not supabase_url:
    supabase_url = os.environ.get("supabase_url") or os.environ.get("SUPABASE_URL")
if not supabase_key:
    supabase_key = os.environ.get("superbase_key") or os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    try:
        import streamlit as st
        supabase_url = supabase_url or st.secrets.get("supabase_url")
        supabase_key = supabase_key or st.secrets.get("superbase_key")
    except Exception:
        pass

supabase: Client = create_client(
    supabase_url,
    supabase_key
)
