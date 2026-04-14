"""
Gemini AI Service — classification and content generation using gemini-3-flash-preview.

Uses the new `google.genai` SDK (google-genai) instead of the deprecated `google.generativeai`.

This module provides:
  - classify_content(): Classifies email/classroom text into academic categories
  - generate_output():  Generates assignments, summaries, or Q&A from academic content
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

from google import genai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ─── Configure Gemini ─────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in .env")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-3-flash-preview"


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
    """
    Classify academic content using Gemini.
    Returns a classification dict matching the frontend Classification interface.
    """
    try:
        prompt = CLASSIFY_PROMPT.format(
            sender=sender,
            subject=subject,
            body=body[:3000],
        )
        
        # Retry logic for 429 Resource Exhausted
        response = None
        for attempt in range(5):
            try:
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt,
                )
                break
            except Exception as e:
                msg = str(e)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    delay = 2 ** (attempt + 1)
                    logger.warning(f"[Gemini] 429 Rate limit during classification. Sleeping {delay}s...")
                    time.sleep(delay)
                    if attempt == 4:
                        raise
                else:
                    raise
                    
        text = response.text.strip()

        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        result = json.loads(text)
        logger.info(f"[Gemini] Classified as {result.get('type')}: {result.get('summaryOneLine', '')[:60]}")
        return result

    except json.JSONDecodeError as e:
        logger.warning(f"[Gemini] Classification JSON parse failed: {e}")
        return {
            "type": "UNCLASSIFIED",
            "subjectArea": "Unknown",
            "priority": "LOW",
            "hasDeadline": False,
            "deadlineText": None,
            "actionRequired": False,
            "summaryOneLine": f"Could not classify: {subject[:60]}",
        }
    except Exception as e:
        logger.error(f"[Gemini] Classification error: {e}")
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


def generate_output(title: str, content: str, output_type: str = "SUMMARY", roll_number: str = "") -> dict:
    """
    Generate academic content using Gemini.

    Args:
        title: Title of the source material
        content: The body text to process
        output_type: One of ASSIGNMENT, SUMMARY, QA, NOTES
        roll_number: Student's roll number (used for ASSIGNMENT to find specific problem in spreadsheets)

    Returns:
        {"text": "<generated content>", "type": "<output_type>", "title": "<generated title>"}
    """
    prompt_template = GENERATE_PROMPTS.get(output_type, GENERATE_PROMPTS["SUMMARY"])

    try:
        # Pre-process content to extract any URLs
        expanded_content = _expand_urls_in_content(content)
        
        from collections import defaultdict
        
        # format_map with defaultdict so other templates don't crash on {roll_number}
        fmt_vars = defaultdict(str)
        fmt_vars['title'] = title
        fmt_vars['content'] = expanded_content[:20000]
        fmt_vars['roll_number'] = roll_number if roll_number else "NOT PROVIDED — generate document for all problems or the main topic"
        prompt = prompt_template.format_map(fmt_vars)
        
        config = genai.types.GenerateContentConfig(
            max_output_tokens=8192,
            temperature=0.4,
        )
        
        # Retry logic for 429 Resource Exhausted
        response = None
        for attempt in range(5):
            try:
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt,
                    config=config,
                )
                break
            except Exception as e:
                msg = str(e)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    delay = 2 ** (attempt + 1)
                    logger.warning(f"[Gemini] 429 Rate limit during generation. Sleeping {delay}s...")
                    time.sleep(delay)
                    if attempt == 4:
                        raise
                else:
                    raise
                    
        generated_text = response.text.strip()

        type_labels = {
            "ASSIGNMENT": "Assignment Solution",
            "SUMMARY": "Study Summary",
            "QA": "Q&A Study Guide",
            "NOTES": "Study Notes",
        }
        output_title = f"{type_labels.get(output_type, 'Output')}: {title[:80]}"

        logger.info(f"[Gemini] Generated {output_type} for '{title[:40]}' — {len(generated_text)} chars")

        return {
            "text": generated_text,
            "type": output_type,
            "title": output_title,
        }

    except Exception as e:
        logger.error(f"[Gemini] Generation error: {e}")
        return {
            "text": f"Generation failed: {str(e)}",
            "type": output_type,
            "title": f"Error: {title[:60]}",
            "error": str(e),
        }


def determine_output_type(classification: Optional[dict], source_type: str = "email") -> str:
    """
    Determine what type of output to generate based on the classification.
    """
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

def _expand_urls_in_content(content: str) -> str:
    """
    Finds URLs in content, opens a real headless browser via Playwright to read all content
    (including multi-tab Google Sheets), and appends it so the AI can read them.
    """
    urls = set(re.findall(r'https?://\S+', content))
    expanded_text = []

    logger.info(f"[URLExpander] Scanning content for URLs... found {len(urls)}: {list(urls)[:3]}")

    for url in urls:
        url = url.rstrip(")'\",.&")
        try:
            if 'docs.google.com/' in url or 'drive.google.com/' in url:
                # Use real browser to get ALL sheet tabs / full doc content
                logger.info(f"[URLExpander] Opening browser for Google URL: {url[:80]}")
                text = browser_scrape_url(url, timeout_ms=25000)
                if text:
                    expanded_text.append(
                        f"\n\n[Content fetched via browser from {url}:\n{text[:8000]}\n]"
                    )
                else:
                    logger.warning(f"[URLExpander] Browser returned empty for {url}")
            else:
                # Regular webpage — use requests + BeautifulSoup
                r = requests.get(url, timeout=8)
                if r.status_code == 200 and 'text/html' in r.headers.get('Content-Type', ''):
                    soup = BeautifulSoup(r.content, 'html.parser')
                    text = soup.get_text(separator=' ', strip=True)
                    if text:
                        expanded_text.append(f"\n\n[Content attached from Webpage {url}:\n{text[:4000]}\n]")
        except Exception as e:
            logger.warning(f"[URLExpander] Could not fetch url {url}: {e}")

    if expanded_text:
        logger.info(f"[URLExpander] Injecting {len(expanded_text)} fetched attachment(s) into AI context")
        return content + "\n\n--- AUTOMATICALLY EXTRACTED ATTACHMENTS ---\n" + "".join(expanded_text)
    logger.warning("[URLExpander] No URLs were successfully fetched — generating from description only")
    return content
