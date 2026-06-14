#!/usr/bin/env python3
"""open-provenance — unified "verify any image" front door.

Given ANY image, run the full pipeline and return one honest, layered result:

  1. C2PA verification (offline) -> verified / invalid, with signer, trust, AI marker.
  2. If no credentials are present, attempt durable recovery from the registry
     (perceptual hash, then crop-robust ORB).
  3. If nothing is found, report 'unknown' -- explicitly NOT 'fake'. Absence of provenance
     is not evidence of manipulation.

This is the tool that gives *a* result for any media, without ever manufacturing a
provenance verdict for content that was never signed.

Usage: python3 verify_any.py <image> [--json] [--registry PATH]
"""
import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "durable"))
from registry import DEFAULT_REGISTRY, recover  # noqa: E402

VERIFY_JS = os.path.join(HERE, "src", "verify.mjs")
EXIT = {"verified": 0, "recovered": 0, "invalid": 4, "unknown": 3, "error": 2}


def c2pa_verify(image):
    try:
        out = subprocess.run(["node", VERIFY_JS, image, "--json"],
                             capture_output=True, text=True, timeout=180)
        if out.stdout.strip():
            return json.loads(out.stdout)
        return {"verdict": "ERROR", "error": out.stderr.strip() or "no output"}
    except Exception as e:  # node missing, bad file, etc.
        return {"verdict": "ERROR", "error": str(e)}


def verify_any(image, registry_path=DEFAULT_REGISTRY):
    c = c2pa_verify(image)
    v = c.get("verdict")
    r = {"file": os.path.basename(image), "c2pa_verdict": v}

    if v == "VERIFIED":
        r.update({"status": "verified", "signer": c.get("signer"), "tool": c.get("tool"),
                  "trust": (c.get("trust") or {}).get("status"),
                  "ai_generated": c.get("aiGenerated"), "ai_source": c.get("aiSourceType")})
    elif v == "INVALID":
        r.update({"status": "invalid", "failures": c.get("failures")})
    elif v == "NO_CREDENTIALS":
        rec = recover(image, registry_path)
        if rec.get("match"):
            r.update({"status": "recovered", "manifest_id": rec["match"],
                      "recovery_method": rec.get("method"),
                      "note": "provenance recovered from the durable registry; "
                              "re-verify the referenced manifest for full assurance"})
        else:
            r.update({"status": "unknown",
                      "note": "no provenance found. This is NOT evidence of fakery; "
                              "absence of provenance is uninformative."})
    else:
        r.update({"status": "error", "error": c.get("error")})
    return r


def render(r):
    s = r["status"]
    L = [f"file: {r['file']}"]
    if s == "verified":
        L.append("VERIFIED — a provenance chain is present and intact.")
        if r.get("tool"):
            L.append(f"  produced by: {r['tool']}")
        if r.get("signer"):
            L.append(f"  signed by:   {r['signer']}  (trust: {r.get('trust')})")
        if r.get("ai_generated"):
            L.append(f"  AI-GENERATED — declared {r.get('ai_source')}")
        L.append('  "verified" means the chain is intact, not that the events are true.')
    elif s == "invalid":
        L.append("INVALID — a manifest is present but failed validation (altered/broken).")
    elif s == "recovered":
        L.append(f"RECOVERED — metadata was stripped, but the content matches a registered "
                 f"manifest ({r['manifest_id']}) via {r['recovery_method']}.")
        L.append("  re-verify the referenced manifest for full assurance.")
    elif s == "unknown":
        L.append("UNKNOWN — no provenance found.")
        L.append("  This is NOT evidence of fakery; absence of provenance is uninformative.")
    else:
        L.append(f"ERROR — {r.get('error')}")
    return "\n".join(L)


def main(argv=None):
    p = argparse.ArgumentParser(description="Verify any image (provenance front door)")
    p.add_argument("image")
    p.add_argument("--registry", default=DEFAULT_REGISTRY)
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    r = verify_any(a.image, a.registry)
    print(json.dumps(r, indent=2) if a.json else render(r))
    return EXIT.get(r["status"], 2)


if __name__ == "__main__":
    sys.exit(main())
