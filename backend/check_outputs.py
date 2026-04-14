import sqlite3
conn = sqlite3.connect('miro.db')
c = conn.cursor()
c.execute('SELECT id, task_id, title, preview_text FROM generated_outputs ORDER BY created_at DESC LIMIT 5')
for row in c.fetchall():
    print('output_id:', row[0])
    print('task_id:', row[1])
    print('title:', row[2])
    print('preview_text (first 500):', repr(row[3][:500] if row[3] else None))
    print('---')
