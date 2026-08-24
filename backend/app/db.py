# backend/app/db.py
"""
Shared Postgres connection pool (transaction pooler)
"""
import os
import psycopg_pool
from dotenv import load_dotenv

load_dotenv()  # reads .env into os.environ — must happen before the pool is built

pool = psycopg_pool.ConnectionPool(
    conninfo=(
        f"host={os.environ['DB_HOST']} "
        f"port={os.environ['DB_PORT']} "
        f"dbname={os.environ['DB_NAME']} "
        f"user={os.environ['DB_USER']} "
        f"password={os.environ['DB_PASSWORD']}"
    ),
    min_size=1,
    max_size=5,
    open=True,
)