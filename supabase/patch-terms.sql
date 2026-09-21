-- 이용약관 · 개인정보처리방침 — 본문, 수정 이력, 회원 동의 기록.
-- 회원가입(첫 Google 로그인) 직후 /signup/terms 에서 두 약관을 모두 확인해야 가입이 완료된다.
-- 관리자는 /site/terms 에서 본문을 고치고, 저장할 때마다 버전이 오르며 terms_revisions 에 스냅샷이 남는다.
-- 재실행해도 안전하다.

-- 1) 현재 본문. slug 는 'terms'(이용약관) · 'privacy'(개인정보처리방침) 두 개만 쓴다.
--    title/content 는 한국어(기본), title_en/content_en 은 영문. 영문이 비어 있으면 화면은 한국어로 대체한다.
CREATE TABLE IF NOT EXISTS devdeck.terms_documents (
  slug TEXT PRIMARY KEY CHECK (slug IN ('terms', 'privacy')),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES devdeck.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 수정 이력. 저장할 때마다 한 행. 본문 스냅샷(한/영)을 그대로 들고 있어 나중에 그 시점 문구를 다시 볼 수 있다.
CREATE TABLE IF NOT EXISTS devdeck.terms_revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL REFERENCES devdeck.terms_documents(slug) ON DELETE CASCADE,
  version INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  note TEXT,
  edited_by UUID REFERENCES devdeck.profiles(id) ON DELETE SET NULL,
  -- profiles 에는 이메일이 없어 표시용으로 저장 시점의 이메일을 함께 남긴다.
  edited_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);

-- 영문 컬럼이 없는 초기 버전으로 만든 테이블에도 붙인다.
ALTER TABLE devdeck.terms_documents ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT '';
ALTER TABLE devdeck.terms_documents ADD COLUMN IF NOT EXISTS content_en TEXT NOT NULL DEFAULT '';
ALTER TABLE devdeck.terms_revisions ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT '';
ALTER TABLE devdeck.terms_revisions ADD COLUMN IF NOT EXISTS content_en TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS terms_revisions_created_idx
  ON devdeck.terms_revisions (created_at DESC);

-- 3) 회원 동의. 문서마다 한 행(재동의하면 버전만 갱신). 탈퇴하면 프로필과 함께 지워진다.
CREATE TABLE IF NOT EXISTS devdeck.terms_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES devdeck.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug IN ('terms', 'privacy')),
  version INT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS terms_consents_user_idx
  ON devdeck.terms_consents (user_id);

ALTER TABLE devdeck.terms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.terms_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.terms_consents ENABLE ROW LEVEL SECURITY;

-- 본문은 누구나 읽는다(가입 화면은 로그인 직후, 약관 확인 전이라 authenticated 이지만 anon 도 열어 둔다).
DROP POLICY IF EXISTS terms_documents_select_public ON devdeck.terms_documents;
CREATE POLICY terms_documents_select_public ON devdeck.terms_documents
  FOR SELECT TO anon, authenticated
  USING (true);

-- 쓰기는 terms_save() 함수(SECURITY DEFINER)로만 한다. 직접 UPDATE 는 관리자에게만 열어 둔다.
DROP POLICY IF EXISTS terms_documents_write_owner ON devdeck.terms_documents;
CREATE POLICY terms_documents_write_owner ON devdeck.terms_documents
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

DROP POLICY IF EXISTS terms_revisions_select_owner ON devdeck.terms_revisions;
CREATE POLICY terms_revisions_select_owner ON devdeck.terms_revisions
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

DROP POLICY IF EXISTS terms_revisions_insert_owner ON devdeck.terms_revisions;
CREATE POLICY terms_revisions_insert_owner ON devdeck.terms_revisions
  FOR INSERT TO authenticated
  WITH CHECK (devdeck.is_owner());

DROP POLICY IF EXISTS terms_consents_select_own ON devdeck.terms_consents;
CREATE POLICY terms_consents_select_own ON devdeck.terms_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR devdeck.is_owner());

DROP POLICY IF EXISTS terms_consents_insert_own ON devdeck.terms_consents;
CREATE POLICY terms_consents_insert_own ON devdeck.terms_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS terms_consents_update_own ON devdeck.terms_consents;
CREATE POLICY terms_consents_update_own ON devdeck.terms_consents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON TABLE devdeck.terms_documents TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE devdeck.terms_documents TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE devdeck.terms_revisions TO authenticated;
GRANT ALL ON TABLE devdeck.terms_revisions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE devdeck.terms_consents TO authenticated;
GRANT ALL ON TABLE devdeck.terms_consents TO service_role;

-- 4) 저장 = 본문(한/영) 갱신 + 버전 증가 + 이력 스냅샷을 한 트랜잭션으로. 새 버전 번호를 돌려준다.
--    영문 인자가 없는 초기 서명은 지운다 — PostgREST 는 이름이 같은 함수가 둘이면 호출을 애매하다고 거절한다.
DROP FUNCTION IF EXISTS devdeck.terms_save(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION devdeck.terms_save(
  p_slug TEXT,
  p_title TEXT,
  p_content TEXT,
  p_title_en TEXT,
  p_content_en TEXT,
  p_note TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
DECLARE
  v_version INT;
  v_editor UUID := auth.uid();
  v_email TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_title_en TEXT := coalesce(p_title_en, '');
  v_content_en TEXT := coalesce(p_content_en, '');
BEGIN
  IF NOT devdeck.is_owner() THEN
    RAISE EXCEPTION '관리자만 약관을 수정할 수 있습니다.' USING ERRCODE = '42501';
  END IF;
  IF p_slug NOT IN ('terms', 'privacy') THEN
    RAISE EXCEPTION '알 수 없는 약관 종류: %', p_slug USING ERRCODE = '22023';
  END IF;

  INSERT INTO devdeck.terms_documents (slug, title, content, title_en, content_en, version, updated_by, updated_at)
  VALUES (p_slug, p_title, p_content, v_title_en, v_content_en, 1, v_editor, now())
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        content = EXCLUDED.content,
        title_en = EXCLUDED.title_en,
        content_en = EXCLUDED.content_en,
        version = devdeck.terms_documents.version + 1,
        updated_by = v_editor,
        updated_at = now()
  RETURNING version INTO v_version;

  INSERT INTO devdeck.terms_revisions
    (slug, version, title, content, title_en, content_en, note, edited_by, edited_by_email)
  VALUES
    (p_slug, v_version, p_title, p_content, v_title_en, v_content_en,
     nullif(btrim(p_note), ''), v_editor, nullif(v_email, ''));

  RETURN v_version;
END;
$$;

REVOKE ALL ON FUNCTION devdeck.terms_save(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION devdeck.terms_save(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 5) 기본 본문. 이미 있으면 건드리지 않는다(관리자가 고친 내용을 덮지 않기 위해).
INSERT INTO devdeck.terms_documents (slug, title, content, version)
VALUES (
  'terms',
  '이용약관',
  '<h2>제1조 (목적)</h2><p>이 약관은 DevDeck(이하 "사이트")이 제공하는 서비스의 이용 조건과 절차, 사이트와 회원의 권리·의무 및 책임 사항을 정합니다.</p>'
  '<h2>제2조 (정의)</h2><ul><li>"서비스"란 사이트가 제공하는 프롬프트, 커리어 기록, 게임 리뷰, 게시판, 댓글 등 일체의 기능을 말합니다.</li><li>"회원"이란 Google 계정으로 로그인하여 이 약관에 동의한 사람을 말합니다.</li></ul>'
  '<h2>제3조 (약관의 효력과 변경)</h2><p>이 약관은 사이트에 게시함으로써 효력이 생깁니다. 사이트는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경된 약관은 게시한 때부터 적용됩니다.</p>'
  '<h2>제4조 (회원의 의무)</h2><ul><li>회원은 타인의 권리를 침해하거나 공공질서·미풍양속에 어긋나는 내용을 게시하지 않습니다.</li><li>회원은 계정을 타인에게 양도하거나 대여하지 않습니다.</li></ul>'
  '<h2>제5조 (게시물)</h2><p>회원이 작성한 댓글 등 게시물의 권리는 작성자에게 있습니다. 사이트는 약관이나 법령을 위반한 게시물을 사전 통지 없이 삭제할 수 있습니다.</p>'
  '<h2>제6조 (서비스의 변경과 중단)</h2><p>사이트는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</p>'
  '<h2>제7조 (탈퇴)</h2><p>회원은 마이페이지에서 언제든지 탈퇴할 수 있습니다. 탈퇴하면 계정과 프로필은 삭제되며 되돌릴 수 없습니다.</p>'
  '<h2>제8조 (면책)</h2><p>사이트는 개인 포트폴리오로 운영되는 무료 서비스입니다. 천재지변, 외부 서비스 장애 등 사이트의 귀책 사유가 없는 서비스 중단에 대해 책임을 지지 않습니다.</p>',
  1
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO devdeck.terms_documents (slug, title, content, version)
VALUES (
  'privacy',
  '개인정보처리방침',
  '<h2>1. 수집하는 개인정보</h2><p>사이트는 Google 로그인 시 다음 정보를 받습니다.</p><ul><li>이메일 주소, 이름, 프로필 사진 URL</li><li>서비스 이용 과정에서 생기는 접속 일시, IP 주소, 브라우저 정보</li></ul>'
  '<h2>2. 이용 목적</h2><ul><li>회원 식별과 로그인 유지</li><li>댓글 등 회원이 작성한 내용의 작성자 표시</li><li>부정 이용 방지와 접속 통계</li></ul>'
  '<h2>3. 보유 기간</h2><p>회원이 탈퇴하면 계정과 프로필 정보를 즉시 삭제합니다. 가입·탈퇴 일시 등 통계용 기록은 개인을 식별할 수 없는 형태로만 보관합니다.</p>'
  '<h2>4. 제3자 제공과 처리 위탁</h2><p>사이트는 개인정보를 제3자에게 제공하지 않습니다. 인증과 데이터 저장은 Supabase, 호스팅은 Vercel 을 이용합니다.</p>'
  '<h2>5. 쿠키</h2><p>로그인 세션 유지와 언어·테마 설정 저장을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 거부할 수 있으나 이 경우 로그인이 유지되지 않습니다.</p>'
  '<h2>6. 이용자의 권리</h2><p>회원은 마이페이지에서 자신의 정보를 확인하고, 언제든지 탈퇴하여 개인정보 삭제를 요청할 수 있습니다.</p>'
  '<h2>7. 문의</h2><p>개인정보 관련 문의는 사이트 하단의 연락처로 보내 주세요.</p>',
  1
)
ON CONFLICT (slug) DO NOTHING;

-- 영문 기본 본문. 관리자가 아직 영문을 넣지 않은(비어 있는) 문서에만 채운다.
UPDATE devdeck.terms_documents
SET title_en = 'Terms of Service',
    content_en =
      '<h2>Article 1 (Purpose)</h2><p>These Terms set out the conditions and procedures for using the services provided by DevDeck (the "Site"), and the rights, obligations and responsibilities of the Site and its members.</p>'
      '<h2>Article 2 (Definitions)</h2><ul><li>"Service" means every feature the Site provides, including prompts, career records, game reviews, boards and comments.</li><li>"Member" means a person who signs in with a Google account and agrees to these Terms.</li></ul>'
      '<h2>Article 3 (Effect and Changes)</h2><p>These Terms take effect when posted on the Site. The Site may amend them within the bounds of applicable law, and amended Terms apply from the time they are posted.</p>'
      '<h2>Article 4 (Member Obligations)</h2><ul><li>Members shall not post content that infringes the rights of others or violates public order and morals.</li><li>Members shall not transfer or lend their account to others.</li></ul>'
      '<h2>Article 5 (User Content)</h2><p>Rights to comments and other content created by a member belong to that member. The Site may remove content that violates these Terms or the law without prior notice.</p>'
      '<h2>Article 6 (Changes and Suspension of Service)</h2><p>The Site may change or suspend all or part of the Service for operational or technical reasons.</p>'
      '<h2>Article 7 (Withdrawal)</h2><p>Members may delete their account at any time from My Page. Deleting the account removes the account and profile and cannot be undone.</p>'
      '<h2>Article 8 (Disclaimer)</h2><p>The Site is a free service operated as a personal portfolio. It is not liable for service interruptions not attributable to the Site, such as natural disasters or failures of external services.</p>'
WHERE slug = 'terms' AND btrim(content_en) = '';

UPDATE devdeck.terms_documents
SET title_en = 'Privacy Policy',
    content_en =
      '<h2>1. Personal Data We Collect</h2><p>When you sign in with Google, the Site receives the following.</p><ul><li>Email address, name and profile picture URL</li><li>Access time, IP address and browser information generated while using the Service</li></ul>'
      '<h2>2. Purpose of Use</h2><ul><li>Identifying members and keeping you signed in</li><li>Showing the author of comments and other member content</li><li>Preventing abuse and compiling access statistics</li></ul>'
      '<h2>3. Retention Period</h2><p>When a member deletes their account, the account and profile data are removed immediately. Statistical records such as sign-up and withdrawal times are kept only in a form that cannot identify an individual.</p>'
      '<h2>4. Third Parties and Processing</h2><p>The Site does not provide personal data to third parties. Authentication and data storage use Supabase; hosting uses Vercel.</p>'
      '<h2>5. Cookies</h2><p>Cookies are used to keep the sign-in session and to remember language and theme settings. You may refuse cookies in your browser, but you will not stay signed in.</p>'
      '<h2>6. Your Rights</h2><p>Members can review their information on My Page and delete their account at any time to request removal of their personal data.</p>'
      '<h2>7. Contact</h2><p>For privacy inquiries, use the contact details at the bottom of the Site.</p>'
WHERE slug = 'privacy' AND btrim(content_en) = '';

-- 기본 본문도 이력 1번으로 남겨 두어 "처음 어떤 문구였나"를 볼 수 있게 한다.
INSERT INTO devdeck.terms_revisions (slug, version, title, content, title_en, content_en, note)
SELECT d.slug, d.version, d.title, d.content, d.title_en, d.content_en, '초기 등록'
FROM devdeck.terms_documents d
WHERE NOT EXISTS (
  SELECT 1 FROM devdeck.terms_revisions r WHERE r.slug = d.slug AND r.version = d.version
);

-- 초기 버전 패치로 만들어진 v1 이력에 영문이 비어 있으면 현재 문서의 영문을 채운다(같은 v1 인 경우만).
UPDATE devdeck.terms_revisions r
SET title_en = d.title_en, content_en = d.content_en
FROM devdeck.terms_documents d
WHERE r.slug = d.slug AND r.version = d.version AND btrim(r.content_en) = '' AND btrim(d.content_en) <> '';

-- 6) 관리자 사이드바에 "약관" 메뉴를 추가한다("운영" 그룹, 공유 링크와 설정 사이). 이미 있으면 건너뛴다.
DO $$
DECLARE
  ops_id UUID;
BEGIN
  IF to_regclass('devdeck.menus') IS NULL THEN
    RAISE NOTICE 'devdeck.menus 테이블이 없어 관리자 메뉴 추가를 건너뜁니다.';
    RETURN;
  END IF;

  SELECT id INTO ops_id
  FROM devdeck.menus
  WHERE location = 'admin' AND parent_id IS NULL AND label_key = 'nav.group.ops'
  LIMIT 1;

  IF ops_id IS NULL THEN
    RAISE NOTICE '관리자 "운영" 그룹을 찾지 못해 메뉴 추가를 건너뜁니다.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE location = 'admin' AND href = '/site/terms'
  ) THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order)
    VALUES (ops_id, '약관', 'nav.terms', '/site/terms', 'FileText', 'admin', 'owner', true, 17);
  END IF;
END;
$$;
