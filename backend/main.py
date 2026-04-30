from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from google.genai import Client
from google.genai.errors import ClientError
import os
from dotenv import load_dotenv
import logging
import traceback
import time

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Intelligent Multi-Doc Research Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. Gemini API calls will likely fail.")
else:
    masked = GEMINI_API_KEY[:8] + "..." + GEMINI_API_KEY[-4:]
    logger.info(f"Loaded GEMINI_API_KEY: {masked} (length={len(GEMINI_API_KEY)})")
try:
    genai = Client(api_key=GEMINI_API_KEY)
except Exception:
    logger.exception("Failed to configure Gemini model")
    genai = None


class Chunk(BaseModel):
    id: str
    docId: str
    text: str
    page: int
    score: float
    offset: int


class DocumentMetadata(BaseModel):
    id: str
    title: str
    author: Optional[str] = None
    year: Optional[int] = None
    keywords: List[str]
    filename: str
    pageCount: int
    fullText: Optional[str] = None


class Citation(BaseModel):
    chunkId: str
    docId: str
    docTitle: str
    page: int
    snippet: str


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[List[Citation]] = None
    confidence: Optional[float] = None
    thoughtProcess: Optional[str] = None


class ResearchRequest(BaseModel):
    query: str
    chunks: List[Chunk]
    docs: List[DocumentMetadata]
    history: List[ChatMessage]


class ResearchResponse(BaseModel):
    text: str
    citations: List[Citation]
    confidence: float
    thoughtProcess: str


@app.post("/research", response_model=ResearchResponse)
async def generate_research_answer(request: ResearchRequest):
    try:
        # Prepare context from chunks
        context = "\n\n".join([
            f"Document: {next((doc.title for doc in request.docs if doc.id == chunk.docId), 'Unknown')}\n"
            f"Page {chunk.page}: {chunk.text}"
            for chunk in request.chunks[:5]  # Limit to top 5 chunks
        ])

        # Prepare conversation history
        history_text = "\n".join([
            f"{msg.role.upper()}: {msg.content}"
            for msg in request.history[-3:]  # Last 3 messages
        ])

        # Create prompt
        prompt = f"""
You are an expert research assistant analyzing multiple documents. Provide a comprehensive, well-grounded answer to the user's query.

CONTEXT FROM DOCUMENTS:
{context}

CONVERSATION HISTORY:
{history_text}

USER QUERY: {request.query}

INSTRUCTIONS:
1. Provide a detailed, accurate answer based on the document context
2. Include specific citations with page numbers and document titles
3. Explain your reasoning step-by-step in the thought process
4. Rate your confidence in the answer (0.0 to 1.0)
5. Be precise and avoid speculation

FORMAT YOUR RESPONSE AS:
THOUGHT_PROCESS: [Your step-by-step reasoning]
CONFIDENCE: [0.0-1.0]
ANSWER: [Your detailed response]
CITATIONS: [List of citations in format: "Document Title, Page X: 'snippet'"]
"""

        if genai is None:
            raise RuntimeError("Gemini model not configured. Check GEMINI_API_KEY and genai library compatibility.")

        # Generate response using Gemini
        # Define a list of models to try in order of preference
        # Models ordered by free-tier quota availability
        models_to_try = [
            'gemini-2.5-flash-lite',   # Highest free-tier quota
            'gemini-flash-latest',      # Alias to latest flash
            'gemini-2.0-flash-lite',    # Lite variant — lower quota consumption
            'gemini-2.0-flash',         # Standard flash
            'gemini-2.5-flash',         # Latest flash
            'gemini-2.5-pro',           # Pro fallback
        ]
        
        response = None
        last_exception = None

        for model_name in models_to_try:
            try:
                response = genai.models.generate_content(
                    model=model_name,
                    contents=[prompt]
                )
                logger.info(f"Successfully used model: {model_name}")
                break  # Success, exit loop
            except ClientError as e:
                last_exception = e
                status_code = getattr(e, 'status_code', 0) or 0
                if status_code == 429:
                    # Rate limited — wait briefly then try next model
                    logger.warning(f"Model {model_name} rate limited (429). Trying next...")
                    time.sleep(1)
                elif status_code == 404:
                    logger.warning(f"Model {model_name} not found (404). Trying next...")
                else:
                    logger.warning(f"Model {model_name} failed ({status_code}): {str(e)[:120]}")
            except Exception as e:
                last_exception = e
                logger.warning(f"Model {model_name} error: {str(e)[:120]}")
        
        if response is None:
            logger.error("All models failed to generate content.")
            raise last_exception

        # Attempt to extract text from response safely
        response_text = getattr(response, 'text', None) or getattr(response, 'output_text', None) or str(response)

        # Parse the response
        lines = response_text.split('\n')
        thought_process = ""
        confidence = 0.8
        answer = ""
        citations = []

        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith('THOUGHT_PROCESS:'):
                current_section = 'thought'
                thought_process = line.replace('THOUGHT_PROCESS:', '').strip()
            elif line.startswith('CONFIDENCE:'):
                try:
                    confidence = float(line.replace('CONFIDENCE:', '').strip())
                except:
                    confidence = 0.8
            elif line.startswith('ANSWER:'):
                current_section = 'answer'
                answer = line.replace('ANSWER:', '').strip()
            elif line.startswith('CITATIONS:'):
                current_section = 'citations'
            elif current_section == 'thought' and line:
                thought_process += ' ' + line
            elif current_section == 'answer' and line:
                answer += ' ' + line
            elif current_section == 'citations' and line:
                # Parse citations
                if ',' in line and ':' in line:
                    try:
                        parts = line.split(',')
                        doc_title = parts[0].strip()
                        page_part = parts[1].split(':')[0].strip()
                        page = int(page_part.replace('Page', '').strip())
                        snippet = ':'.join(parts[1].split(':')[1:]).strip().strip('"').strip("'")

                        citations.append(Citation(
                            chunkId=f"cite-{len(citations)}",
                            docId=next((doc.id for doc in request.docs if doc.title == doc_title), "unknown"),
                            docTitle=doc_title,
                            page=page,
                            snippet=snippet
                        ))
                    except Exception:
                        logger.debug("Failed to parse citation line: %s", line)

        # Fallback if parsing failed
        if not answer:
            answer = response_text
        if not citations:
            # Create citations from chunks
            citations = [
                Citation(
                    chunkId=chunk.id,
                    docId=chunk.docId,
                    docTitle=next((doc.title for doc in request.docs if doc.id == chunk.docId), 'Unknown'),
                    page=chunk.page,
                    snippet=chunk.text[:100] + "..."
                )
                for chunk in request.chunks[:3]
            ]

        return ResearchResponse(
            text=answer,
            citations=citations,
            confidence=min(max(confidence, 0.0), 1.0),
            thoughtProcess=thought_process
        )

    except Exception as e:
        tb = traceback.format_exc()
        logger.error("Error generating research answer: %s\n%s", str(e), tb)
        raise HTTPException(status_code=500, detail=f"Error generating research answer: {str(e)}. See server logs for details.")


class SuggestionRequest(BaseModel):
    chunks: List[Chunk]
    docs: List[DocumentMetadata]


@app.post("/suggest_questions", response_model=List[str])
async def suggest_questions(request: SuggestionRequest):
    try:
        # Prepare context from the first few chunks to get the gist
        context = "\n\n".join([
            f"Document: {next((doc.title for doc in request.docs if doc.id == chunk.docId), 'Unknown')}\n"
            f"Content: {chunk.text}"
            for chunk in request.chunks[:8]
        ])

        prompt = f"""
You are a helpful research assistant. Based on the provided document excerpts, generate 4 interesting and relevant questions that a user could ask to understand the material better.
Questions should be specific to the content, not generic.
Return only the questions, one per line.

CONTEXT:
{context}
"""

        if genai is None:
            return ["Summarize the document", "What are the key findings?", "Explain the methodology"]

        suggest_models = ['gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash']
        text = ''
        for m in suggest_models:
            try:
                response = genai.models.generate_content(model=m, contents=[prompt])
                text = getattr(response, 'text', None) or ''
                break
            except ClientError as ce:
                if getattr(ce, 'status_code', 0) == 429:
                    time.sleep(1)
            except Exception:
                pass
        # Clean up response (remove numbering like "1. ", "- ")
        questions = [line.strip().lstrip('1234567890. -*') for line in text.split('\n') if line.strip() and '?' in line]
        return questions[:4]

    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        return ["Summarize the document", "What are the key findings?"]


class FeedbackRequest(BaseModel):
    messageId: str
    feedback: str  # "accurate" | "incomplete" | "irrelevant"


@app.post("/feedback")
async def receive_feedback(req: FeedbackRequest):
    logger.info("Feedback received for message %s: %s", req.messageId, req.feedback)
    return {"status": "ok"}


@app.get("/")
async def read_root():
    return {"message": "Intelligent Multi-Doc Research Assistant API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
