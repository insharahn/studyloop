"""
Shared Groq client wrapper with automatic fallback across multiple API
keys when one is rate-limited.
"""

from __future__ import annotations

import logging
import os

from openai import OpenAI, RateLimitError

logger = logging.getLogger(__name__)

_KEY_ENV_VARS = ["GROQ_API_KEY", "GROQ_API_KEY_BACKUP", "GROQ_API_KEY_BACKUP2", "GROQ_API_KEY_BACKUP3", "GROQ_API_KEY_BACKUP4", "GROQ_API_KEY_BACKUP5"]

_clients = [
    OpenAI(api_key=os.environ[var], base_url="https://api.groq.com/openai/v1")
    for var in _KEY_ENV_VARS
    if os.environ.get(var)
]


def call_groq_with_fallback(**kwargs):
    """
    Tries each configured key in order. On a rate-limit error, moves to
    the next key. Any other exception stops immediately (not retried),
    since it would fail identically everywhere. Returns None if every
    key is exhausted or none are configured.
    """
    if not _clients:
        logger.error("No Groq API keys configured at all")
        return None

    for i, client in enumerate(_clients):
        try:
            return client.chat.completions.create(**kwargs)
        except RateLimitError:
            logger.warning("Groq key #%d rate-limited, trying next key", i + 1)
        except Exception as e:
            logger.error("Groq call failed on key #%d (non-rate-limit): %s", i + 1, e)
            return None

    logger.error("All %d configured Groq keys are rate-limited", len(_clients))
    return None