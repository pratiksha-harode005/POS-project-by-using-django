import sqlite3

conn = sqlite3.connect('file:backend/db.sqlite3?mode=ro', uri=True)
c = conn.cursor()

c.execute("SELECT id, email, first_name, last_name, role, department_id FROM users_user")
for u in c.fetchall():
    print(u)

conn.close()
