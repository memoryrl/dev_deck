-- AI 글쓰기 양식 캐시. 게시판×템플릿당 한 건. 재실행해도 안전하다.

CREATE TABLE IF NOT EXISTS devdeck.ai_board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES devdeck.boards(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  html TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_board_templates_template_id_format CHECK (template_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT ai_board_templates_board_template_unique UNIQUE (board_id, template_id)
);

ALTER TABLE devdeck.ai_board_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_board_templates_select ON devdeck.ai_board_templates;
CREATE POLICY ai_board_templates_select ON devdeck.ai_board_templates
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS ai_board_templates_insert ON devdeck.ai_board_templates;
CREATE POLICY ai_board_templates_insert ON devdeck.ai_board_templates
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS ai_board_templates_update ON devdeck.ai_board_templates;
CREATE POLICY ai_board_templates_update ON devdeck.ai_board_templates
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE devdeck.ai_board_templates FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE devdeck.ai_board_templates TO authenticated, service_role;
