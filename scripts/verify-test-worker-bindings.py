"""Validate the exact storage bindings allowed on the isolated test Worker."""
import json
import os
import re
from pathlib import Path

config = json.loads(Path("dist/server/wrangler.json").read_text())
databases = config.get("d1_databases", [])
assert len(databases) == 1, "Expected exactly one test database"
assert databases[0]["binding"] == "DB"
assert databases[0]["database_id"] == "827dd8d1-53b2-460c-9594-2435db824432"
assert databases[0]["database_name"] == "eternal-idle-v198-test-db"

expected = {"BUCKET": "eternal-idle-v198-test-assets"}
private_bucket = os.environ.get("PRIVATE_POLYMORPH_BUCKET", "").strip()
if private_bucket:
    assert re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", private_bucket)
    assert private_bucket != expected["BUCKET"], "The private bucket must be separate"
    expected["PRIVATE_POLYMORPH"] = private_bucket

buckets = config.get("r2_buckets", [])
assert len(buckets) == len(expected), "Unexpected R2 binding count"
assert {item["binding"]: item["bucket_name"] for item in buckets} == expected, "Unexpected R2 binding mapping"
print("Verified isolated test D1 and R2 bindings")
