import os
import sys
import tempfile
from pathlib import Path

import pytest

# The engine is created when core.database is imported, so the test database
# has to be chosen before anything imports the app.
_DB_DIR = tempfile.mkdtemp(prefix="spendlens-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_DIR}/test.db"
os.environ.pop("GROQ_API_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from core.database import Base, engine  # noqa: E402


@pytest.fixture
def client(tmp_path, monkeypatch):
    """A client on an empty database, with uploads going to a temporary folder."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    from api.routes import receipts
    monkeypatch.setattr(receipts, "UPLOAD_DIR", str(tmp_path))
    with TestClient(main.app) as c:
        yield c
