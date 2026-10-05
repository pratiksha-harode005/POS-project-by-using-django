import os, sys, sqlite3
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

import django
django.setup()

from django.db import connection

print("=== PostgreSQL Remote DB Counts ===")
with connection.cursor() as cur:
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name NOT LIKE 'django_%' 
          AND table_name NOT LIKE 'auth_%'
        ORDER BY table_name;
    """)
    pg_tables = [r[0] for r in cur.fetchall()]
    for t in pg_tables:
        try:
            cur.execute(f'SELECT count(*) FROM "{t}"')
            print(f"PG {t}: {cur.fetchone()[0]}")
        except Exception as e:
            print(f"PG {t}: Error {e}")

print("\n=== Local SQLite DB Counts ===")
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'db.sqlite3')
if os.path.exists(db_path):
    s_conn = sqlite3.connect(db_path)
    sc = s_conn.cursor()
    sc.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'django_%' AND name NOT LIKE 'auth_%' ORDER BY name")
    s_tables = [r[0] for r in sc.fetchall()]
    for t in s_tables:
        try:
            sc.execute(f'SELECT count(*) FROM "{t}"')
            print(f"SQLite {t}: {sc.fetchone()[0]}")
        except Exception as e:
            print(f"SQLite {t}: Error {e}")
