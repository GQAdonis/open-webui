from peewee import *
from peewee_migrate import Router
from playhouse.db_url import connect
from playhouse.postgres_ext import PostgresqlExtDatabase
from config import SRC_LOG_LEVELS, DATA_DIR, DATABASE_URL, DB_ENGINE, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_SCHEMA, DB_USER
import os
import logging

log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["DB"])

# Check if the file exists
if os.path.exists(f"{DATA_DIR}/ollama.db"):
    # Rename the file
    os.rename(f"{DATA_DIR}/ollama.db", f"{DATA_DIR}/webui.db")
    log.info("Database migrated from Ollama-WebUI successfully.")
else:
    pass


DB = None
if DB_ENGINE == "postgres":
    DB = PostgresqlExtDatabase(
    DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    schema=DB_SCHEMA
    )
    
else:
    DB = connect(DATABASE_URL)
    log.info(f"Connected to a {DB.__class__.__name__} database.")
    router = Router(DB, migrate_dir="apps/web/internal/migrations", logger=log)
    router.run()
    DB.connect(reuse_if_open=True)
