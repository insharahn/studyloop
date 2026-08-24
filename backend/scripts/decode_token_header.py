import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import base64
import json
import os
from dotenv import load_dotenv
load_dotenv()

with open("last_token.txt") as f:
    token = f.read().strip()

header_b64 = token.split(".")[0]
header_b64 += "=" * (-len(header_b64) % 4)  # pad for base64 decoding
header = json.loads(base64.urlsafe_b64decode(header_b64))

print("Token header:", header)
print()
print("SUPABASE_JWT_SECRET currently set (first/last 6 chars):",
      os.environ.get("SUPABASE_JWT_SECRET", "")[:6], "...",
      os.environ.get("SUPABASE_JWT_SECRET", "")[-6:])