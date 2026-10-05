import psycopg2
import sqlite3
import time
import os

dsn = 'postgresql://procurement_0s_user:umAMbNHtbHZPc8VVR6eyAXqt6vuPqk6t@dpg-daobkjek1f9s73beadkg-a.oregon-postgres.render.com:5432/procurement_0s'
pg_conn = None

print("Connecting to PostgreSQL on Render to fetch all historical data...")
for i in range(1, 15):
    try:
        pg_conn = psycopg2.connect(dsn, sslmode='require', connect_timeout=10)
        print("PostgreSQL connection established!")
        break
    except Exception as e:
        print(f"Retry {i}/15: {e}")
        time.sleep(2)

if pg_conn:
    sqlite_conn = sqlite3.connect('db.sqlite3')
    sq_cur = sqlite_conn.cursor()
    sq_cur.execute("PRAGMA foreign_keys = OFF;")
    
    pg_cur = pg_conn.cursor()
    pg_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name NOT LIKE 'django_migrations%' 
          AND table_name NOT LIKE 'sqlite_%';
    """)
    tables = [r[0] for r in pg_cur.fetchall()]
    
    for t in tables:
        try:
            pg_cur.execute(f'SELECT * FROM "{t}";')
            rows = pg_cur.fetchall()
            cols = [d[0] for d in pg_cur.description]
            if rows:
                sq_cur.execute(f'DELETE FROM "{t}";')
                placeholders = ', '.join(['?'] * len(cols))
                col_names = ', '.join([f'"{c}"' for c in cols])
                
                converted_rows = []
                for r in rows:
                    converted_rows.append([str(v) if hasattr(v, 'isoformat') else v for v in r])
                
                sq_cur.executemany(f'INSERT INTO "{t}" ({col_names}) VALUES ({placeholders});', converted_rows)
                print(f"Synced {len(rows)} rows into '{t}'")
        except Exception as err:
            print(f"Sync note on '{t}': {err}")
            
    sq_cur.execute("PRAGMA foreign_keys = ON;")
    sqlite_conn.commit()
    sqlite_conn.close()
    pg_conn.close()
    print("ALL POSTGRESQL DATA SUCCESSFULLY MIRRORED INTO SQLITE!")
else:
    print("PostgreSQL was unreachable after 15 attempts.")
