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
from typing import Optional

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
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
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
    "ASSIGNMENT": """You are an expert academic assistant. A student has received the following assignment.
Generate a COMPLETE, well-structured solution/response for this assignment.

Include:
- Clear section headers
- Step-by-step work where applicable
- Proper academic formatting
- References to relevant concepts
- Final answers clearly marked

TITLE: {title}
CONTENT:
{content}

Write the full assignment solution below:""",

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


def generate_output(title: str, content: str, output_type: str = "SUMMARY") -> dict:
    """
    Generate academic content using Gemini.

    Args:
        title: Title of the source material
        content: The body text to process
        output_type: One of ASSIGNMENT, SUMMARY, QA, NOTES

    Returns:
        {"text": "<generated content>", "type": "<output_type>", "title": "<generated title>"}
    """
    prompt_template = GENERATE_PROMPTS.get(output_type, GENERATE_PROMPTS["SUMMARY"])

    try:
        prompt = prompt_template.format(
            title=title,
            content=content[:6000],
        )
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
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
