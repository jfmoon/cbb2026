"""
team_names.py — Single source of truth for NCAA team name resolution.

Both score_scraper.py and odds_scraper.py import this module.
When a new name variant comes through from ESPN or Action Network,
add it here and rebuild the Docker image.

To validate: python3 team_names.py
"""

import unicodedata  # fix #15

# ── Canonical names (must match App.jsx TEAM_DATA exactly) ───────────────────
CANONICAL = {
    "Akron", "Alabama", "Arizona", "Arkansas", "BYU", "Cal Baptist",
    "Clemson", "Duke", "Florida", "Furman", "Georgia", "Gonzaga",
    "Hawai'i", "High Point", "Hofstra", "Houston", "Howard", "Idaho",
    "Illinois", "Iowa", "Iowa State", "Kansas", "Kennesaw State",
    "Kentucky", "Lehigh", "Long Island University", "Louisville",
    "McNeese", "Miami (FL)", "Miami (Ohio)", "Michigan", "Michigan State",
    "Missouri", "NC State", "Nebraska", "North Carolina",
    "North Dakota State", "Northern Iowa", "Ohio State", "Penn",
    "Prairie View A&M", "Purdue", "Queens", "SMU", "Saint Louis",
    "Saint Mary's", "Santa Clara", "Siena", "South Florida", "St. John's",
    "TCU", "Tennessee", "Tennessee State", "Texas", "Texas A&M",
    "Texas Tech", "Troy", "UCF", "UCLA", "UConn", "UMBC", "Utah State",
    "VCU", "Vanderbilt", "Villanova", "Virginia", "Wisconsin",
    "Wright State",
}

# ── Name map: raw ESPN/Action Network name → canonical ────────────────────────
# Add new variants here whenever a scraper logs an unresolved name.
NAME_MAP = {
    # ESPN full mascot names
    "Howard Bison":                  "Howard",
    "UMBC Retrievers":               "UMBC",
    "Texas Longhorns":               "Texas",
    "NC State Wolfpack":             "NC State",
    "Prairie View A&M Panthers":     "Prairie View A&M",
    "Lehigh Mountain Hawks":         "Lehigh",
    "Miami RedHawks":                "Miami (Ohio)",
    "Miami (OH) RedHawks":           "Miami (Ohio)",
    "Miami (OH)":                    "Miami (Ohio)",
    "Miami Ohio":                    "Miami (Ohio)",
    "SMU Mustangs":                  "SMU",
    "Duke Blue Devils":              "Duke",
    "Michigan Wolverines":           "Michigan",
    "Arizona Wildcats":              "Arizona",
    "Florida Gators":                "Florida",
    "Houston Cougars":               "Houston",
    "Iowa State Cyclones":           "Iowa State",
    "Purdue Boilermakers":           "Purdue",
    "Illinois Fighting Illini":      "Illinois",
    "Alabama Crimson Tide":          "Alabama",
    "Vanderbilt Commodores":         "Vanderbilt",
    "Arkansas Razorbacks":           "Arkansas",
    "Virginia Cavaliers":            "Virginia",
    "Wisconsin Badgers":             "Wisconsin",
    "Louisville Cardinals":          "Louisville",
    "Texas Tech Red Raiders":        "Texas Tech",
    "Nebraska Cornhuskers":          "Nebraska",
    "Gonzaga Bulldogs":              "Gonzaga",
    "Michigan State Spartans":       "Michigan State",
    "St. John's Red Storm":          "St. John's",
    "Kansas Jayhawks":               "Kansas",
    "UCLA Bruins":                   "UCLA",
    "Ohio State Buckeyes":           "Ohio State",
    "UConn Huskies":                 "UConn",
    "Connecticut Huskies":           "UConn",
    "Tennessee Volunteers":          "Tennessee",
    "Georgia Bulldogs":              "Georgia",
    "Kentucky Wildcats":             "Kentucky",
    "Iowa Hawkeyes":                 "Iowa",
    "Clemson Tigers":                "Clemson",
    "VCU Rams":                      "VCU",
    "North Carolina Tar Heels":      "North Carolina",
    "Texas A&M Aggies":              "Texas A&M",
    "Saint Mary's Gaels":            "Saint Mary's",
    "Saint Mary's (CA)":             "Saint Mary's",
    "BYU Cougars":                   "BYU",
    "Miami Hurricanes":              "Miami (FL)",
    "Miami (FL) Hurricanes":         "Miami (FL)",
    "Villanova Wildcats":            "Villanova",
    "Utah State Aggies":             "Utah State",
    "Missouri Tigers":               "Missouri",
    "South Florida Bulls":           "South Florida",
    "TCU Horned Frogs":              "TCU",
    "UCF Knights":                   "UCF",
    "Saint Louis Billikens":         "Saint Louis",
    "Santa Clara Broncos":           "Santa Clara",
    "High Point Panthers":           "High Point",
    "Hawaii Rainbow Warriors":       "Hawai'i",
    "Hawai'i Rainbow Warriors":      "Hawai'i",
    "Kennesaw State Owls":           "Kennesaw State",
    "Kennesaw St.":                  "Kennesaw State",
    "Queens Royals":                 "Queens",
    "Long Island University Sharks": "Long Island University",
    "LIU Sharks":                    "Long Island University",
    "Long Island Univ.":             "Long Island University",
    "North Dakota State Bison":      "North Dakota State",
    "North Dakota St.":              "North Dakota State",
    "Akron Zips":                    "Akron",
    "Hofstra Pride":                 "Hofstra",
    "Wright State Raiders":          "Wright State",
    "Wright St.":                    "Wright State",
    "Tennessee State Tigers":        "Tennessee State",
    "Tennessee St.":                 "Tennessee State",
    "McNeese Cowboys":               "McNeese",
    "Troy Trojans":                  "Troy",
    "Penn Quakers":                  "Penn",
    "Idaho Vandals":                 "Idaho",
    "Furman Paladins":               "Furman",
    "Siena Saints":                  "Siena",
    "Cal Baptist Lancers":           "Cal Baptist",
    "California Baptist Lancers":    "Cal Baptist",
    "California Baptist":            "Cal Baptist",
    "Northern Iowa Panthers":        "Northern Iowa",
    "California Baptist University": "Cal Baptist",
}


# ── fix #15: normalize pre-pass ───────────────────────────────────────────────
def normalize_name(raw: str) -> str:
    """
    Pre-process a raw team name before dictionary lookup.
    Handles Unicode variants, curly apostrophes, and whitespace noise.

    Does NOT do fuzzy matching — explicit NAME_MAP entries remain the source of truth.
    """
    if not raw:
        return raw
    # NFC normalization handles composed vs decomposed Unicode characters
    name = unicodedata.normalize("NFC", raw)
    # Standardize apostrophe variants to plain ASCII apostrophe
    # (curly single quote, right single quote, modifier letter apostrophe, etc.)
    name = name.replace("\u2019", "'").replace("\u2018", "'").replace("\u02bc", "'")
    # Collapse multiple spaces and strip leading/trailing whitespace
    name = " ".join(name.split())
    return name
# ── end fix #15 ───────────────────────────────────────────────────────────────


def resolve(raw_name: str) -> str:
    """
    Resolve a raw ESPN/Action Network team name to its canonical form.
    If unrecognized, returns the (normalized) raw name.
    """
    if not raw_name:
        return raw_name

    # fix #15: normalize before any lookup
    name = normalize_name(raw_name)

    # Direct match in NAME_MAP
    if name in NAME_MAP:
        return NAME_MAP[name]

    # Already canonical
    if name in CANONICAL:
        return name

    # Also try the original raw string in case NAME_MAP has an un-normalized key
    # (shouldn't happen with a clean NAME_MAP, but safe fallback during transition)
    if raw_name in NAME_MAP:
        return NAME_MAP[raw_name]

    return name  # return normalized form even if unresolved


def resolve_with_warning(raw_name: str, source: str = "") -> str:
    """
    Like resolve() but prints a warning for unrecognized names.
    Use this in scrapers so unresolved names surface immediately.
    """
    canonical = resolve(raw_name)
    if canonical not in CANONICAL:
        src = f" [{source}]" if source else ""
        print(f"  [WARN] Unresolved name{src}: '{raw_name}' → '{canonical}' (not in tournament field)")
    return canonical


def validate_all():
    """Check that all NAME_MAP values are canonical."""
    errors = []
    for raw, canon in NAME_MAP.items():
        if canon not in CANONICAL:
            errors.append(f"  BAD: '{raw}' → '{canon}' (not canonical)")
    return errors


if __name__ == "__main__":
    print(f"Canonical teams: {len(CANONICAL)}")
    print(f"Name map entries: {len(NAME_MAP)}")

    errors = validate_all()
    if errors:
        print(f"\n❌ {len(errors)} bad mappings:")
        for e in errors: print(e)
    else:
        print("✅ All NAME_MAP values are canonical")

    # Test a few — including Unicode apostrophe variants
    tests = [
        "Miami (OH) RedHawks", "UConn Huskies", "Cal Baptist Lancers",
        "Connecticut Huskies", "St. John\u2019s Red Storm",  # curly apostrophe
        "Saint Mary\u2019s Gaels",                           # curly apostrophe
        "Duke", "Unknown Team XYZ",
        "  Duke  ",                                           # extra whitespace
    ]
    print("\nResolution tests:")
    for t in tests:
        r = resolve_with_warning(t, "test")
        print(f"  '{t}' → '{r}'")
