import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection

tables = connection.introspection.table_names()
tables_to_truncate = [t for t in tables if t != 'django_migrations']

print(f"Found {len(tables_to_truncate)} tables to truncate (excluding django_migrations).")

with connection.cursor() as cursor:
    # Disable triggers/FK checks temporarily if needed, or use TRUNCATE ... CASCADE
    table_list_sql = ", ".join(f'"{t}"' for t in tables_to_truncate)
    sql = f"TRUNCATE TABLE {table_list_sql} RESTART IDENTITY CASCADE;"
    print("Executing TRUNCATE CASCADE on all data tables...")
    cursor.execute(sql)
    print("Truncation successful!")

# Re-verify row counts
print("\n--- Verifying Row Counts ---")
total_rows = 0
for t in tables_to_truncate:
    with connection.cursor() as cursor:
        cursor.execute(f'SELECT COUNT(*) FROM "{t}";')
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"Table '{t}': {count} rows")
            total_rows += count

print(f"\nTotal data rows across all application tables: {total_rows}")
if total_rows == 0:
    print("All tables and schemas preserved. All data successfully purged!")
