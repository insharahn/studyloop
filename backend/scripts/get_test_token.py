"""
Mints a real JWT for the test user by signing in directly against
Supabase Auth -- no frontend needed. Use this token as the Bearer
token when testing endpoints via /docs or curl.

    python scripts/get_test_token.py
"""
import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

# Use the anon/publishable key here, NOT the service key -- signing in
# as a user is a client-side operation, not an admin one.
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

TEST_EMAIL = "test@studyloop.dev"     # whatever you used when creating the test user
TEST_PASSWORD = "12345678"  # whatever you set

client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
result = client.auth.sign_in_with_password({"email": TEST_EMAIL, "password": TEST_PASSWORD})

print("Access token (use as Bearer token):\n")
print(result.session.access_token)