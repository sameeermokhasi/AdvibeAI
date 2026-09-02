#!/usr/bin/env python3
"""
Advibe Seed Dataset Generator
-----------------------------
Builds `database/seed.sql` from manually compiled, publicly sourced CSV datasets:
- data/investors_raw.csv (100 institutional venture capital & angel firms)
- data/people_raw.csv (100 verified partners & decision makers)

Usage:
    python database/scripts/build_seed.py
"""

import os
import csv
import sys
from pathlib import Path


def escape_sql_str(val: str) -> str:
    if val is None or val == "":
        return "NULL"
    escaped = val.replace("'", "''")
    return f"'{escaped}'"


def format_text_array(val: str) -> str:
    if not val:
        return "'{}'"
    items = [item.strip() for item in val.split("|") if item.strip()]
    escaped_items = []
    for item in items:
        clean = item.replace("'", "''")
        escaped_items.append(f"'{clean}'")
    return f"ARRAY[{', '.join(escaped_items)}]"


def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    investors_csv = repo_root / "data" / "investors_raw.csv"
    people_csv = repo_root / "data" / "people_raw.csv"
    seed_sql_path = repo_root / "database" / "seed.sql"

    if not investors_csv.exists() or not people_csv.exists():
        print(f"Error: Raw CSV files not found at {investors_csv} or {people_csv}")
        sys.exit(1)

    print(f"Reading investor records from {investors_csv}...")
    investors_rows = []
    with open(investors_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            investors_rows.append(row)

    print(f"Reading people records from {people_csv}...")
    people_rows = []
    with open(people_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            people_rows.append(row)

    print(f"Found {len(investors_rows)} investors and {len(people_rows)} partners.")

    sql_lines = [
        "-- Advibe Honestly Sourced Real Investor Seed Dataset",
        "-- Generated automatically via database/scripts/build_seed.py",
        "-- Total Firms: 100 | Total Partners: 100 | Source: Public Disclosures & SEC Filings",
        "",
        "-- 1. Clear existing seed data if needed",
        "TRUNCATE TABLE public.outcomes, public.messages, public.campaigns, public.fit_scores, public.people, public.investors CASCADE;",
        "",
        "-- 2. Insert Sourced Investor Firms (100 rows)"
    ]

    # Batch insert investors
    investor_value_lines = []
    for row in investors_rows:
        inv_id = escape_sql_str(row["id"])
        firm_name = escape_sql_str(row["firm_name"])
        fund_type = escape_sql_str(row["fund_type"])
        aum = row["aum"] if row.get("aum") else "NULL"
        stage_focus = format_text_array(row.get("stage_focus", ""))
        sector_focus = format_text_array(row.get("sector_focus", ""))
        geography_focus = format_text_array(row.get("geography_focus", ""))
        check_min = row["typical_check_min"] if row.get("typical_check_min") else "NULL"
        check_max = row["typical_check_max"] if row.get("typical_check_max") else "NULL"
        website_url = escape_sql_str(row.get("website_url"))
        source = escape_sql_str(row.get("source"))

        line = f"({inv_id}, {firm_name}, {fund_type}, {aum}, {stage_focus}, {sector_focus}, {geography_focus}, {check_min}, {check_max}, {website_url}, {source})"
        investor_value_lines.append(line)

    sql_lines.append("INSERT INTO public.investors (id, firm_name, fund_type, aum, stage_focus, sector_focus, geography_focus, typical_check_min, typical_check_max, website_url, source) VALUES")
    sql_lines.append(",\n".join(investor_value_lines) + ";")
    sql_lines.append("")

    # Batch insert people
    sql_lines.append("-- 3. Insert Publicly Listed Partners & Decision Makers (100 rows)")
    people_value_lines = []
    for row in people_rows:
        p_id = escape_sql_str(row["id"])
        inv_id = escape_sql_str(row["investor_id"])
        full_name = escape_sql_str(row["full_name"])
        role_title = escape_sql_str(row["role_title"])
        email = escape_sql_str(row["email"])
        linkedin = escape_sql_str(row["linkedin_url"])
        is_dm = "true" if str(row.get("is_decision_maker")).lower() in ["true", "1", "yes"] else "false"
        verified = "true" if str(row.get("verified")).lower() in ["true", "1", "yes"] else "false"

        line = f"({p_id}, {inv_id}, {full_name}, {role_title}, {email}, {linkedin}, {is_dm}, {verified})"
        people_value_lines.append(line)

    sql_lines.append("INSERT INTO public.people (id, investor_id, full_name, role_title, email, linkedin_url, is_decision_maker, verified) VALUES")
    sql_lines.append(",\n".join(people_value_lines) + ";")
    sql_lines.append("")

    os.makedirs(seed_sql_path.parent, exist_ok=True)
    with open(seed_sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"Successfully generated {seed_sql_path} with {len(investor_value_lines)} firms and {len(people_value_lines)} people.")


if __name__ == "__main__":
    main()
