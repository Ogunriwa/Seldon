PRAGMA foreign_keys = ON;
INSERT OR IGNORE INTO projects (id, name, instructions, created_at, updated_at) VALUES ('proj_test_A', 'Test Project', 'You are a test agent. Follow instructions strictly.', strftime('%s','now'), strftime('%s','now'));
INSERT OR IGNORE INTO conversations (id, project_id, title, created_at, updated_at) VALUES ('conv_test_A', 'proj_test_A', 'Test A', strftime('%s','now'), strftime('%s','now'));
INSERT OR IGNORE INTO memories (id, project_id, content, is_pinned, source, created_at, updated_at) VALUES ('mem_test_A1', 'proj_test_A', 'The user prefers short answers.', 1, 'manual', strftime('%s','now'), strftime('%s','now'));
INSERT OR IGNORE INTO attachments (id, conversation_id, filename, media_type, size_bytes, extracted_text, created_at) VALUES ('att_test_A1', 'conv_test_A', 'test.txt', 'text/plain', 15, 'File content A1', strftime('%s','now'));

INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at) VALUES ('conv_test_B', 'Test B', strftime('%s','now'), strftime('%s','now'));

INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at) VALUES ('conv_test_C', 'Test C', strftime('%s','now'), strftime('%s','now'));
INSERT OR IGNORE INTO attachments (id, conversation_id, filename, media_type, size_bytes, data, created_at) VALUES ('att_test_C1', 'conv_test_C', 'image.png', 'image/png', 100, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', strftime('%s','now'));
