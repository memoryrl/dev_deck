-- Uppy 첨부 업로드 + CKEditor 이미지 업로드용 Storage 버킷/정책.
-- docs/07-uploads.md 참고. 기존 스키마에 추가할 때 이 파일만 실행.

INSERT INTO storage.buckets (id, name, public)
VALUES ('editor-images', 'editor-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- editor-images: 공개 읽기만 허용. 쓰기는 app/api/uploads/editor-image가
-- 서비스 롤 키로 검증(매직바이트·용량·레이트리밋)한 뒤에만 하므로, RLS는
-- anon/authenticated 쓰기를 전부 막아 검증 우회 경로를 차단한다.
DROP POLICY IF EXISTS "editor-images public read" ON storage.objects;
CREATE POLICY "editor-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'editor-images');

-- uploads: 공개 읽기 + 로그인 사용자는 자기 폴더({auth.uid()}/...)에만 쓰기·삭제.
-- 실제 사용처(/site/uploads)는 middleware가 소유자 계정만 통과시키므로,
-- 이 정책은 표준 "본인 폴더" 경계로 충분하다.
DROP POLICY IF EXISTS "uploads public read" ON storage.objects;
CREATE POLICY "uploads public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads owner write" ON storage.objects;
CREATE POLICY "uploads owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "uploads owner delete" ON storage.objects;
CREATE POLICY "uploads owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 업로드 메타데이터 (devdeck.uploads) — 목록/삭제 UI에서 조회.
CREATE TABLE IF NOT EXISTS devdeck.uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE CASCADE NOT NULL,
  bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS uploads_user_idx ON devdeck.uploads (user_id, created_at DESC);

ALTER TABLE devdeck.uploads ENABLE ROW LEVEL SECURITY;

-- devdeck.is_owner()는 supabase/patch-owner-writes.sql / schema.sql에 이미 정의되어 있다.
DROP POLICY IF EXISTS uploads_select_own ON devdeck.uploads;
CREATE POLICY uploads_select_own ON devdeck.uploads
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS uploads_insert_own ON devdeck.uploads;
CREATE POLICY uploads_insert_own ON devdeck.uploads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS uploads_delete_own ON devdeck.uploads;
CREATE POLICY uploads_delete_own ON devdeck.uploads
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());
