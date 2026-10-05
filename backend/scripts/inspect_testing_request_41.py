import sqlite3

conn = sqlite3.connect('file:backend/db.sqlite3?mode=ro', uri=True)
c = conn.cursor()

print('=== CHECKING REQ-FBFE510F ===')
c.execute("""
    SELECT id, request_id, title, status, current_stage
    FROM request_management_purchaserequest
    WHERE request_id LIKE '%FBFE510F%' OR request_id LIKE '%SW%'
""")
print('Requests with FBFE510F or SW:', c.fetchall())

print('\n=== CHECKING ALL POS IN DB ===')
c.execute("""
    SELECT po.id, po.po_id, po.status, po.purchase_request_id, pr.request_id, pr.title
    FROM procurement_purchaseorder po
    LEFT JOIN request_management_purchaserequest pr ON po.purchase_request_id = pr.id
""")
pos = c.fetchall()
print(f'Total POs in DB: {len(pos)}')
for p in pos:
    print(p)

print('\n=== CHECKING ALL RECEIPTS IN DB ===')
c.execute("""
    SELECT gr.id, gr.receipt_id, gr.status, gr.purchase_order_id, po.po_id, pr.request_id
    FROM procurement_goodsreceipt gr
    LEFT JOIN procurement_purchaseorder po ON gr.purchase_order_id = po.id
    LEFT JOIN request_management_purchaserequest pr ON po.purchase_request_id = pr.id
""")
receipts = c.fetchall()
print(f'Total Receipts in DB: {len(receipts)}')
for r in receipts:
    print(r)

conn.close()
