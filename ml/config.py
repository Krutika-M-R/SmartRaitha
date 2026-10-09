import os
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

ML_DIR = Path(__file__).resolve().parent
load_dotenv(ML_DIR / '.env')
if not os.getenv('DATABASE_URL'):
    load_dotenv(ML_DIR.parent / 'backend' / '.env')

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Open a connection to the same Postgres database the Node backend uses."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Copy .env.example to .env and fill it in.")
    return psycopg2.connect(DATABASE_URL)
