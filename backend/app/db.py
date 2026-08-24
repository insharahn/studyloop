# backend/app/db.py
"""
Shared Postgres connection pool (transaction pooler)

prepare_threshold=None disables psycopg's prepared-statement caching --
required when connecting through Supabase's transaction pooler (PgBouncer
in transaction mode), which swaps the underlying physical connection
between transactions. A prepared statement created on one swapped-in
connection can collide with the same statement name on another, causing
"prepared statement already exists" errors on repeated queries.
"""
import os
import psycopg_pool
from dotenv import load_dotenv

load_dotenv()

pool = psycopg_pool.ConnectionPool(
    conninfo=(
        f"host={os.environ['DB_HOST']} "
        f"port={os.environ['DB_PORT']} "
        f"dbname={os.environ['DB_NAME']} "
        f"user={os.environ['DB_USER']} "
        f"password={os.environ['DB_PASSWORD']} "
        f"sslmode=require"
    ),
    kwargs={"prepare_threshold": None},
    min_size=1,
    max_size=5,
    open=True,
)