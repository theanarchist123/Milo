"""
Ollama API Service — classification and content generation.

Replaces Gemini with Ollama Cloud API due to Gemini quota failures.
Endpoints: https://ollama.com/v1/chat/completions (OpenAI compatible)
Model: deepseek-v3.1:671b
"""
import os
import json
import logging
import re
import requests
import time
from bs4 import BeautifulSoup
from typing import Optional
from services.browser_scraper import scrape_url as browser_scrape_url
from dotenv import load_dotenv

# Load local overrides first (untracked), then fallback defaults from .env.
load_dotenv(dotenv_path=".env.local", override=False)
load_dotenv(override=False)
logger = logging.getLogger(__name__)

# ─── Configure Ollama API ───────────────────────────────────────────────────
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "").strip()
OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "https://ollama.com/v1/chat/completions").strip()
MODEL_NAME = os.getenv("OLLAMA_MODEL", "deepseek-v3.1:671b").strip()

def _call_ollama(prompt: str, json_format: bool = False, max_tokens: int = 8192) -> str:
    """Wrapper to call Ollama Chat Completions"""
    if not OLLAMA_API_KEY:
        raise ValueError("OLLAMA_API_KEY is not set. Configure it in backend/.env.local for local or Vercel env vars for production.")

    headers = {
        "Authorization": f"Bearer {OLLAMA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3
    }
    
    if json_format:
        payload["response_format"] = {"type": "json_object"}

    # Retry logic for network or 429 errors (ghost connection lockouts can take up to 90s to clear)
    for attempt in range(7):
        try:
            # Increase timeout to 300s (5min) for large documents on high-quality models
            response = requests.post(OLLAMA_ENDPOINT, headers=headers, json=payload, timeout=300)
            response.raise_for_status()
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            else:
                raise ValueError(f"Invalid API response: {data}")
                
        except requests.exceptions.RequestException as e:
            err_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                err_msg += f" | Body: {e.response.text}"
            
            if attempt == 6:
                logger.error(f"[Ollama] Final attempt failed: {err_msg}")
                raise Exception(f"Ollama API Error: {err_msg}")
                
            delay = 2 ** (attempt + 1)
            logger.warning(f"[Ollama] Request failed, retrying in {delay}s... ({err_msg})")
            time.sleep(delay)
            
    raise Exception("Ollama API failed after 7 attempts")

# ─── Classification ───────────────────────────────────────────────────────────

CLASSIFY_PROMPT = """You are an academic email/content classifier for university students.

Analyze the following content and return a JSON object with EXACTLY these fields:
{{
  "type": "ASSIGNMENT" | "NOTES" | "ANNOUNCEMENT" | "UNCLASSIFIED",
  "subjectArea": "<e.g. Physics, Computer Science, Mathematics>",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "hasDeadline": true | false,
  "deadlineText": "<deadline string or null if none>",
  "actionRequired": true | false,
  "summaryOneLine": "<one-sentence summary of what this content is about>"
}}

Rules:
- ASSIGNMENT: Contains homework, lab reports, projects, submissions, experiments
- NOTES: Contains lecture notes, study materials, textbook references, PPTs
- ANNOUNCEMENT: General class announcements, schedule changes, exam notices
- UNCLASSIFIED: Cannot determine or not academic
- priority HIGH if deadline within 3 days or explicitly urgent
- priority MEDIUM for regular academic content
- priority LOW for general announcements without action needed

Return ONLY valid JSON, no markdown fences, no extra text.

---
SENDER: {sender}
SUBJECT: {subject}
BODY:
{body}
"""


def classify_content(subject: str, body: str, sender: str = "Unknown") -> dict:
    try:
        prompt = CLASSIFY_PROMPT.format(
            sender=sender,
            subject=subject,
            body=body[:3000],
        )
        
        text = _call_ollama(prompt, json_format=True, max_tokens=1000).strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        result = json.loads(text)
        logger.info(f"[Ollama] Classified as {result.get('type')}: {result.get('summaryOneLine', '')[:60]}")
        return result

    except Exception as e:
        logger.error(f"[Ollama] Classification error: {e}")
        return {
            "type": "UNCLASSIFIED",
            "subjectArea": "Unknown",
            "priority": "LOW",
            "hasDeadline": False,
            "deadlineText": None,
            "actionRequired": False,
            "summaryOneLine": f"Classification failed: {str(e)[:60]}",
        }


# ─── Content Generation ──────────────────────────────────────────────────────

GENERATE_PROMPTS = {
    "ASSIGNMENT": """You are an expert academic assistant. A student needs help with their assignment.

IMPORTANT INSTRUCTIONS — READ CAREFULLY:
1. The content below may include an automatically extracted attachment from a spreadsheet or document.
2. If the attachment contains a table of students with Roll Numbers and assigned Problems, you MUST:
   a. Find the row matching the student's Roll Number: {roll_number}
   b. Read the exact Problem Statement assigned to that roll number.
   c. If a URL/reference is given for the problem, note that the problem comes from that source.
   d. Generate the ENTIRE lab document ONLY for that specific assigned problem.
3. If no roll number table exists, generate a complete document for the described experiment.

Generate a professional Lab Document in this EXACT structure:

# [Problem Title]

## Aim
A precise one-paragraph aim of what the experiment achieves.

## Theory
Detailed explanation of the concept, algorithm, or approach. Include:
- Background and motivation
- Key definitions and terminology  
- The algorithmic strategy being used (e.g., Greedy, DP, Divide & Conquer)
- Mathematical formulation if applicable
- Time/Space complexity overview

## Procedure
Step-by-step guide. For coding problems include:
- Problem statement (exact, from the assigned source)
- One complete solved example with manual trace
- Full working Python/Java code implementation
- Sample input/output
- Step-by-step walkthrough of the code

## Time Complexity Analysis
- Best case, Average case, Worst case
- Space complexity
- Justification for each

## Conclusion
Summarize what was learned, the effectiveness of the approach, and real-world applications.

Formatting Rules:
- Use proper markdown headings (##, ###)
- Use fenced code blocks with language tag (```python)
- Do NOT use markdown tables — use numbered/bullet lists instead
- Do NOT add any conversational filler or meta-commentary
- Generate the COMPLETE document — do not stop prematurely

Student Roll Number: {roll_number}
TITLE: {title}
CONTENT AND ATTACHMENTS:
{content}

Generate the COMPLETE lab document now:""",

    "SUMMARY": """You are an expert academic summarizer. Create a comprehensive study summary from the following academic content.

Include:
- Key concepts and definitions
- Important formulas or theorems (if applicable)
- Bullet-point summaries of each major topic
- Connections between topics
- Quick-revision notes at the end

TITLE: {title}
CONTENT:
{content}

Write the comprehensive study summary below:""",

    "QA": """You are an expert academic tutor. Generate a set of Q&A pairs from the following academic content that would help a student prepare for exams.

Format each pair as:
Q: [Question]
A: [Detailed Answer]

Generate at least 10 Q&A pairs covering all major topics. Include:
- Conceptual questions
- Application-based questions
- Short answer questions
- One or two analytical/critical thinking questions

TITLE: {title}
CONTENT:
{content}

Generate the Q&A pairs below:""",

    "NOTES": """You are an expert academic note-taker. Transform the following content into well-organized study notes.

Include:
- Clear topic headings
- Key definitions highlighted
- Important points as bullet lists
- Diagrams described in text where helpful
- A "Key Takeaways" section at the end

TITLE: {title}
CONTENT:
{content}

Write the organized study notes below:""",
}


def generate_output(title: str, content: str, output_type: str = "SUMMARY", roll_number: str = "", access_token: str = "") -> dict:
    prompt_template = GENERATE_PROMPTS.get(output_type, GENERATE_PROMPTS["SUMMARY"])

    try:
        expanded_content = _expand_urls_in_content(content, access_token=access_token)
        
        from collections import defaultdict
        fmt_vars = defaultdict(str)
        fmt_vars['title'] = title
        fmt_vars['content'] = expanded_content[:20000]
        fmt_vars['roll_number'] = roll_number if roll_number else "NOT PROVIDED — generate document for all problems or the main topic"
        prompt = prompt_template.format_map(fmt_vars)
        
        generated_text = _call_ollama(prompt, json_format=False, max_tokens=8192).strip()

        type_labels = {
            "ASSIGNMENT": "Assignment Solution",
            "SUMMARY": "Study Summary",
            "QA": "Q&A Study Guide",
            "NOTES": "Study Notes",
        }
        output_title = f"{type_labels.get(output_type, 'Output')}: {title[:80]}"

        logger.info(f"[Ollama] Generated {output_type} for '{title[:40]}' — {len(generated_text)} chars")

        return {
            "text": generated_text,
            "type": output_type,
            "title": output_title,
        }

    except Exception as e:
        logger.error(f"[Ollama] Generation error: {e}")
        return {
            "text": f"Generation failed: {str(e)}",
            "type": output_type,
            "title": f"Error: {title[:60]}",
            "error": str(e),
        }


def determine_output_type(classification: Optional[dict], source_type: str = "email") -> str:
    if classification:
        ctype = classification.get("type", "").upper()
        if ctype == "ASSIGNMENT":
            return "ASSIGNMENT"
        elif ctype == "NOTES":
            return "NOTES"
        elif ctype == "ANNOUNCEMENT":
            return "SUMMARY"

    if source_type == "classroom":
        return "SUMMARY"
    return "SUMMARY"


def _expand_urls_in_content(content: str, access_token: str = "") -> str:
    """
    Scans content for URLs — both bare https:// links and
    '[Attachment]: URL' lines injected by gmail_service / classroom_service —
    fetches each one, and injects the fetched text into the AI context.
    Uses the user's OAuth access token to authenticate Google Docs/Drive requests.
    """
    import concurrent.futures

    # Collect all bare URLs
    bare_urls = set(re.findall(r'https?://\S+', content))

    # Also collect [Attachment]: URL lines (highest priority — explicitly marked)
    attachment_urls = set(re.findall(r'\[Attachment\]:\s*(https?://\S+)', content))

    # Merge: attachment URLs first, then the rest
    all_urls = list(attachment_urls) + [u for u in bare_urls if u not in attachment_urls]
    all_urls = [u.rstrip(")'\",.") for u in all_urls]

    if not all_urls:
        return content

    logger.info(
        f"[URLExpander] Found {len(all_urls)} URL(s) "
        f"({len(attachment_urls)} explicit attachment(s)): {all_urls[:3]}"
    )

    # Build auth headers if we have a token
    auth_headers = {}
    if access_token:
        auth_headers["Authorization"] = f"Bearer {access_token}"
        logger.info("[URLExpander] Using OAuth token for authenticated Google requests")

    def _fetch_with_drive_api(url: str, token: str) -> str | None:
        """Use the official Google Drive API to export the file content using the user's OAuth token."""
        m = re.search(r'/d/([a-zA-Z0-9_-]+)', url) or re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
        if not m:
            return None
        file_id = m.group(1)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=mimeType,name"
            r = requests.get(meta_url, headers=headers, timeout=10)
            if r.status_code != 200:
                logger.warning(f"[DriveAPI] Metadata fetch failed for {file_id}: {r.status_code}")
                return None
                
            meta = r.json()
            mime_type = meta.get('mimeType', '')
            name = meta.get('name', 'document')
            
            if mime_type.startswith('application/vnd.google-apps.'):
                export_mime = 'text/csv' if mime_type == 'application/vnd.google-apps.spreadsheet' else 'text/plain'
                export_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType={export_mime}"
                res = requests.get(export_url, headers=headers, timeout=15)
                if res.status_code == 200:
                    logger.info(f"[DriveAPI] Exported {name} ({mime_type})")
                    return f"\n\n[Content from Google Workspace File '{name}' ({url}):\n{res.text[:15000]}\n]"
                else:
                    logger.warning(f"[DriveAPI] Export failed: {res.status_code}")
                    return None
                    
            elif 'text' in mime_type or 'csv' in mime_type or 'json' in mime_type:
                dl_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
                res = requests.get(dl_url, headers=headers, timeout=15)
                if res.status_code == 200:
                    logger.info(f"[DriveAPI] Downloaded {name} ({mime_type})")
                    return f"\n\n[Content from File '{name}' ({url}):\n{res.text[:15000]}\n]"
                    
            elif 'application/pdf' in mime_type:
                dl_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
                res = requests.get(dl_url, headers=headers, timeout=20)
                if res.status_code == 200:
                    try:
                        import PyPDF2
                        import io
                        reader = PyPDF2.PdfReader(io.BytesIO(res.content))
                        text = "\n".join(page.extract_text() or "" for page in reader.pages)
                        logger.info(f"[DriveAPI] Parsed PDF {name} ({len(text)} chars)")
                        return f"\n\n[Content from PDF '{name}' ({url}):\n{text[:20000]}\n]"
                    except Exception as e:
                        logger.warning(f"[DriveAPI] Failed to parse PDF {name}: {e}")
                        return None
                        
            elif 'wordprocessingml.document' in mime_type:
                dl_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
                res = requests.get(dl_url, headers=headers, timeout=20)
                if res.status_code == 200:
                    try:
                        import docx
                        import io
                        doc = docx.Document(io.BytesIO(res.content))
                        text = "\n".join(p.text for p in doc.paragraphs)
                        logger.info(f"[DriveAPI] Parsed DOCX {name} ({len(text)} chars)")
                        return f"\n\n[Content from DOCX '{name}' ({url}):\n{text[:20000]}\n]"
                    except Exception as e:
                        logger.warning(f"[DriveAPI] Failed to parse DOCX {name}: {e}")
                        return None

            else:
                logger.warning(f"[DriveAPI] Unsupported mimeType {mime_type} for {file_id}")
                return None
                
        except Exception as e:
            logger.warning(f"[DriveAPI] Exception fetching {file_id}: {e}")
            return None
            
        return None

    def _drive_file_to_export(url: str) -> str | None:
        """Convert a drive.google.com/file/d/<ID>/... link to a direct download URL."""
        m = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
        if m:
            file_id = m.group(1)
            return f"https://drive.google.com/uc?export=download&id={file_id}"
        return None

    def _fetch_url(url: str) -> str | None:
        try:
            # 1. Try Drive API first if it's a Google URL and we have a token
            if access_token and ('docs.google.com/' in url or 'drive.google.com/' in url):
                drive_content = _fetch_with_drive_api(url, access_token)
                if drive_content:
                    return drive_content
                logger.info(f"[URLExpander] Drive API failed for {url}, falling back to scraper")

            if 'docs.google.com/' in url:
                # Google Docs/Sheets/Slides/Forms — use browser scraper
                # Pass auth headers for authenticated access to private docs
                logger.info(f"[URLExpander] Fetching Google Doc: {url[:70]}")
                text = browser_scrape_url(url, timeout_ms=20000, auth_headers=auth_headers)
                if text:
                    return f"\n\n[Content from Google Doc {url}:\n{text[:10000]}\n]"

            elif 'drive.google.com/file' in url:
                # Drive file — convert to direct download and fetch with auth
                export_url = _drive_file_to_export(url)
                if export_url:
                    logger.info(f"[URLExpander] Fetching Drive file: {export_url[:70]}")
                    r = requests.get(export_url, headers=auth_headers, timeout=15, allow_redirects=True)
                    if r.status_code == 200 and r.text.strip():
                        return f"\n\n[Content from Drive file {url}:\n{r.text[:8000]}\n]"

            elif 'drive.google.com/' in url:
                logger.info(f"[URLExpander] Fetching Drive URL: {url[:70]}")
                text = browser_scrape_url(url, timeout_ms=15000, auth_headers=auth_headers)
                if text:
                    return f"\n\n[Content from Drive {url}:\n{text[:8000]}\n]"

            else:
                logger.info(f"[URLExpander] Fetching webpage: {url[:70]}")
                r = requests.get(url, timeout=10)
                if r.status_code == 200 and 'text/html' in r.headers.get('Content-Type', ''):
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(r.content, 'html.parser')
                    text = soup.get_text(separator=' ', strip=True)
                    if text:
                        return f"\n\n[Content from Webpage {url}:\n{text[:4000]}\n]"

        except Exception as e:
            logger.warning(f"[URLExpander] Fetch error for {url}: {e}")
        return None

    expanded_text = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_url = {executor.submit(_fetch_url, url): url for url in all_urls}
        for future in concurrent.futures.as_completed(future_to_url):
            res = future.result()
            if res:
                expanded_text.append(res)

    if expanded_text:
        logger.info(f"[URLExpander] Injecting {len(expanded_text)} fetched document(s) into AI context")
        return content + "\n\n--- AUTOMATICALLY EXTRACTED ATTACHMENTS ---\n" + "".join(expanded_text)

    logger.warning("[URLExpander] No documents were successfully fetched — generating from description only")
    return content
