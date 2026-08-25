"""
Verification script for the review loop (FSRS scheduling).
Per the plan doc (section 11b, task 13):
Create a card state, submit grades 1, 2, 3, and 4 in sequence,
print the resulting due dates, and confirm intervals grow for
good grades and reset on a failure.

Each review is simulated as happening exactly on the card's due
date, since FSRS grows intervals based on real elapsed time —
reviewing instantly back-to-back would (correctly) not grow
intervals, which would give a false failure here.

Run from the backend/ folder with the venv active:
    python scripts/verify_review_loop.py
"""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scheduling.fsrs_wrapper import init_card_state, advance_card_state


def days_between(iso_a: str, iso_b: str) -> float:
    a = datetime.fromisoformat(iso_a)
    b = datetime.fromisoformat(iso_b)
    return (b - a).total_seconds() / 86400


def run():
    print("=== Review Loop Verification ===\n")

    state = init_card_state()
    print(f"Initial state: due_at={state['due_at']}, reps={state['reps']}, "
          f"lapses={state['lapses']}, state={state['state']}\n")

    previous_due = state["due_at"]
    intervals = []

    sequence = [3, 3, 3, 1]  # Good, Good, Good, Again (forces a lapse)
    print(f"Submitting grades in sequence: {sequence}")
    print("(each review is simulated as happening exactly on the card's due date)\n")

    for i, grade in enumerate(sequence, start=1):
        # Simulate the review happening exactly when the card was due,
        # so FSRS sees real elapsed time and grows intervals correctly.
        simulated_review_time = datetime.fromisoformat(state["due_at"])

        new_state = advance_card_state(state, grade, review_datetime=simulated_review_time)
        interval = days_between(previous_due, new_state["due_at"])

        print(f"Step {i} — grade {grade}:")
        print(f"  reviewed at: {simulated_review_time.isoformat()}")
        print(f"  due_at:      {new_state['due_at']}")
        print(f"  interval:    {interval:.3f} days since previous due date")
        print(f"  reps:        {new_state['reps']}")
        print(f"  lapses:      {new_state['lapses']}")
        print(f"  state:       {new_state['state']}")
        print()

        intervals.append((grade, interval))
        previous_due = new_state["due_at"]
        state = new_state

    print("=== Checks ===\n")

    good_intervals = [interval for grade, interval in intervals if grade in (2, 3, 4)]
    growing = all(good_intervals[i] <= good_intervals[i + 1] for i in range(len(good_intervals) - 1))
    print(f"Intervals grow across consecutive good grades: {growing}")
    print(f"  Good-grade intervals in order: {[round(x, 3) for x in good_intervals]}")

    last_grade, last_interval = intervals[-1]
    reset_on_failure = (last_grade == 1) and (last_interval < good_intervals[-1])
    print(f"Interval reset (shrunk) on the final 'Again' (grade 1): {reset_on_failure}")

    final_lapses = state["lapses"]
    print(f"Final lapse count after one failure: {final_lapses} (expected: 1)")

    final_state_after_failure = state["state"]
    dropped_to_relearning = final_state_after_failure in ("Relearning", "Learning")
    print(f"State correctly dropped after failure: {dropped_to_relearning} (state={final_state_after_failure})")

    all_passed = growing and reset_on_failure and final_lapses == 1 and dropped_to_relearning
    print(f"\n{'✅ ALL CHECKS PASSED' if all_passed else '❌ SOME CHECKS FAILED'}")

    return all_passed


if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)