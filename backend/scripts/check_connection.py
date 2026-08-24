import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg.connect(
    host=os.environ["DB_HOST"],
    port=os.environ["DB_PORT"],
    dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
)

cur = conn.execute("select count(*) from documents")
print("Connected. documents table has", cur.fetchone()[0], "rows")
conn.close()