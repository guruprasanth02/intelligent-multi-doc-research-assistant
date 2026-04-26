import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI
from backend.main import app as sub_app

app = FastAPI()

# Mount the original app at /api to match Vercel's routing path
app.mount("/api", sub_app)
