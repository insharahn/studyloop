"""
Shared Groq client wrapper with automatic fallback to a secondary API
key when the primary is rate-limited. Used by every generation module
(tutor, concepts, cards, gaps) so the retry logic lives in one place
instead of being duplicated four times.
"""

from __future__ import annotations

import logging
import os

from openai import OpenAI, RateLimitError

logger = logging.getLogger(__name__)

_primary_client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)

_backup_key = os.environ.get("GROQ_API_KEY_BACKUP")
_backup_client = (
    OpenAI(api_key=_backup_key, base_url="https://api.groq.com/openai/v1")
    if _backup_key else None
)


def call_groq_with_fallback(**kwargs):
    """
    Calls Groq's chat completions endpoint with the primary key. On a
    rate-limit error specifically, retries once with the backup key if
    one is configured. Any other exception is NOT retried on the backup,
    since that kind of failure would just fail identically on both keys.

    Returns the response object, or None if every attempt failed --
    callers should treat None as "this request could not be completed."
    """
    try:
        return _primary_client.chat.completions.create(**kwargs)
    except RateLimitError:
        logger.warning("Primary Groq key rate-limited, trying backup key")
    except Exception as e:
        logger.error("Groq call failed on primary key (non-rate-limit): %s", e)
        return None

    if _backup_client is None:
        logger.warning("No backup Groq key configured -- cannot fall back")
        return None

    try:
        return _backup_client.chat.completions.create(**kwargs)
    except Exception as e:
        logger.error("Groq call failed on backup key too: %s", e)
        return None