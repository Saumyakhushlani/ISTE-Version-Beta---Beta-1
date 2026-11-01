import os
import shutil
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB = os.path.join(BASE_DIR, "fdl.db").replace(os.sep, "/")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB}")

# On Vercel / AWS Lambda, root filesystem (/var/task) is strictly read-only.
# Move SQLite database to writable /tmp directory if running in serverless.
is_serverless = os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
if is_serverless and "sqlite" in DATABASE_URL:
    tmp_db_path = "/tmp/fdl.db"
    seed_db = os.path.join(BASE_DIR, "fdl.db")
    if not os.path.exists(tmp_db_path) and os.path.exists(seed_db):
        try:
            shutil.copyfile(seed_db, tmp_db_path)
        except Exception:
            pass
    DATABASE_URL = f"sqlite:///{tmp_db_path}"

# connect_args={"check_same_thread": False} is required for SQLite with FastAPI
engine = create_engine(
    DATABASE_URL, 
    connect_args={
        "check_same_thread": False,
        "timeout": 30.0
    } if "sqlite" in DATABASE_URL else {}
)

# Enable SQLite foreign key constraint enforcement and resilient journal mode
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
        except Exception:
            cursor.execute("PRAGMA journal_mode=DELETE")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import db.models  # Ensure models are imported
    Base.metadata.create_all(bind=engine)
    try:
        from seed_demo import ensure_demo_users_seeded
        db = SessionLocal()
        try:
            ensure_demo_users_seeded(db)
        finally:
            db.close()
    except Exception as e:
        print(f"[FDL] Note: auto-seeding demo users on init: {e}")
