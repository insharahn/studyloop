"""
Root-cause resolver for StudyLoop.
When a student fails a card, this finds which prerequisite concept
is the real reason — never invents a cause where there isn't one.
"""

from supabase import create_client, Client
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def find_root_cause(user_id: str, concept_id: str, concept_mastery: float) -> dict | None:
    """
    Looks up every prerequisite edge pointing into `concept_id`.
    Returns the weakest prerequisite's info ONLY if its mastery is
    below the failed concept's own mastery. Otherwise returns None.
    """
    edges_result = supabase.table("concept_edges").select("prerequisite_id").eq("concept_id", concept_id).execute()
    prereq_ids = [e["prerequisite_id"] for e in edges_result.data]

    if not prereq_ids:
        return None  # no prerequisites tracked for this concept

    ucs_result = (
        supabase.table("user_concept_state")
        .select("concept_id, mastery")
        .eq("user_id", user_id)
        .in_("concept_id", prereq_ids)
        .execute()
    )
    mastery_by_prereq = {row["concept_id"]: row["mastery"] for row in ucs_result.data}

    # Any prereq never attempted counts as mastery 0 (weakest possible)
    weakest_id = None
    weakest_mastery = None
    for pid in prereq_ids:
        m = mastery_by_prereq.get(pid, 0)
        if weakest_mastery is None or m < weakest_mastery:
            weakest_mastery = m
            weakest_id = pid

    if weakest_id is None or weakest_mastery >= concept_mastery:
        return None  # no prerequisite is actually weaker — don't invent a cause

    concept_row = supabase.table("concepts").select("name").eq("id", weakest_id).execute()
    prereq_name = concept_row.data[0]["name"] if concept_row.data else "an earlier concept"

    reason = f"You seem to be weaker on \"{prereq_name}\" (mastery {weakest_mastery:.0%}), which this concept depends on."

    return {
        "concept_id": weakest_id,
        "name": prereq_name,
        "mastery": weakest_mastery,
        "reason": reason,
    }