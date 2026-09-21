-- 시상식 메뉴명 현행화 + 푸터를 헤더와 맞춤 (재실행 안전)
-- 추천 프롬프트 → 등록된 프롬프트 시상식
-- 스킬 추천 → 등록된 스킬 시상식
-- 추천 게임 → 플레이한 게임 시상식

-- 1) 기존 시상식 항목 라벨·labels 강제 갱신
UPDATE devdeck.menus
SET
  label = '등록된 프롬프트 시상식',
  label_key = 'mega.prompt.top',
  labels = jsonb_build_object(
    'ko', '등록된 프롬프트 시상식',
    'en', 'Registered prompt awards'
  ),
  href = '/b/prompts/top',
  updated_at = now()
WHERE location IN ('header', 'footer')
  AND (
    label_key = 'mega.prompt.top'
    OR label IN ('추천 프롬프트', '등록된 프롬프트 시상식')
    OR href = '/b/prompts/top'
  );

UPDATE devdeck.menus
SET
  label = '등록된 스킬 시상식',
  label_key = 'mega.career.skillsTop',
  labels = jsonb_build_object(
    'ko', '등록된 스킬 시상식',
    'en', 'Registered skill awards'
  ),
  href = '/b/skills/top',
  updated_at = now()
WHERE location IN ('header', 'footer')
  AND (
    label_key = 'mega.career.skillsTop'
    OR label IN ('스킬 추천', '등록된 스킬 시상식')
    OR href = '/b/skills/top'
  );

UPDATE devdeck.menus
SET
  label = '플레이한 게임 시상식',
  label_key = 'mega.games.featured',
  labels = jsonb_build_object(
    'ko', '플레이한 게임 시상식',
    'en', 'Played game awards'
  ),
  href = '/games/top',
  updated_at = now()
WHERE location IN ('header', 'footer')
  AND (
    label_key = 'mega.games.featured'
    OR label IN ('추천 게임', '추천 글', '플레이한 게임 시상식')
    OR href IN ('/games/top', '/#games')
  );

-- 2) 푸터 PromptKit / CareerLog / Steam 컬럼 현행화
DO $$
DECLARE
  id_pk UUID;
  id_cl UUID;
  id_st UUID;
BEGIN
  SELECT id INTO id_pk
  FROM devdeck.menus
  WHERE location = 'footer' AND parent_id IS NULL
    AND (label_key = 'nav.promptkit' OR label = 'PromptKit')
  ORDER BY sort_order
  LIMIT 1;

  SELECT id INTO id_cl
  FROM devdeck.menus
  WHERE location = 'footer' AND parent_id IS NULL
    AND (label_key = 'nav.career' OR label = 'CareerLog')
  ORDER BY sort_order
  LIMIT 1;

  SELECT id INTO id_st
  FROM devdeck.menus
  WHERE location = 'footer' AND parent_id IS NULL
    AND (label_key = 'steam.title' OR label = 'Steam')
  ORDER BY sort_order
  LIMIT 1;

  ------------------------------------------------------------------
  -- PromptKit
  ------------------------------------------------------------------
  IF id_pk IS NOT NULL THEN
    -- 대시보드 → AI 프롬프트 목록
    UPDATE devdeck.menus
    SET label = 'AI 프롬프트 목록',
        label_key = 'mega.prompt.public',
        labels = jsonb_build_object('ko', 'AI 프롬프트 목록', 'en', 'AI Prompt list'),
        href = '/b/prompts',
        view_role = 'visitor',
        is_active = true,
        sort_order = 0,
        updated_at = now()
    WHERE parent_id = id_pk
      AND (label_key = 'footer.dashboard' OR label = '대시보드' OR href = '/login');

    -- 공개 프롬프트 → AI 프롬프트 목록 (대시보드가 없으면 이쪽으로)
    UPDATE devdeck.menus
    SET label = 'AI 프롬프트 목록',
        label_key = 'mega.prompt.public',
        labels = jsonb_build_object('ko', 'AI 프롬프트 목록', 'en', 'AI Prompt list'),
        href = '/b/prompts',
        view_role = 'visitor',
        is_active = true,
        sort_order = 0,
        updated_at = now()
    WHERE parent_id = id_pk
      AND (label_key IN ('footer.publicPrompts', 'mega.prompt.public') OR label IN ('공개 프롬프트', 'AI 프롬프트 목록'))
      AND NOT EXISTS (
        SELECT 1 FROM devdeck.menus m2
        WHERE m2.parent_id = id_pk AND m2.label_key = 'mega.prompt.public' AND m2.id <> menus.id
      );

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_pk, 'AI 프롬프트 목록', 'mega.prompt.public',
           jsonb_build_object('ko', 'AI 프롬프트 목록', 'en', 'AI Prompt list'),
           '/b/prompts', 'footer', 'visitor', true, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_pk AND label_key = 'mega.prompt.public'
    );

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_pk, '등록된 프롬프트 시상식', 'mega.prompt.top',
           jsonb_build_object('ko', '등록된 프롬프트 시상식', 'en', 'Registered prompt awards'),
           '/b/prompts/top', 'footer', 'visitor', true, 10
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_pk AND label_key = 'mega.prompt.top'
    );

    UPDATE devdeck.menus
    SET sort_order = 10, is_active = true, view_role = 'visitor', updated_at = now()
    WHERE parent_id = id_pk AND label_key = 'mega.prompt.top';

    UPDATE devdeck.menus
    SET sort_order = 20, is_active = true, view_role = 'owner',
        label = '프롬프트 관리', label_key = 'mega.prompt.manage',
        labels = jsonb_build_object('ko', '프롬프트 관리', 'en', 'Manage prompts'),
        href = '/promptkit', updated_at = now()
    WHERE parent_id = id_pk
      AND (label_key = 'mega.prompt.manage' OR href = '/promptkit' OR label = '프롬프트 관리');

    -- 중복 공개 프롬프트(홈) 비활성
    UPDATE devdeck.menus
    SET is_active = false, updated_at = now()
    WHERE parent_id = id_pk
      AND is_active = true
      AND label_key IS DISTINCT FROM 'mega.prompt.public'
      AND label_key IS DISTINCT FROM 'mega.prompt.top'
      AND label_key IS DISTINCT FROM 'mega.prompt.manage'
      AND (href IN ('/', '/login') OR label_key IN ('footer.dashboard', 'footer.publicPrompts'));
  END IF;

  ------------------------------------------------------------------
  -- CareerLog
  ------------------------------------------------------------------
  IF id_cl IS NOT NULL THEN
    UPDATE devdeck.menus
    SET label = '그동안의 업무내용',
        label_key = 'mega.career.all',
        labels = jsonb_build_object('ko', '그동안의 업무내용', 'en', 'What I''ve worked on'),
        href = '/work',
        view_role = 'visitor',
        is_active = true,
        sort_order = 0,
        updated_at = now()
    WHERE parent_id = id_cl
      AND (label_key IN ('footer.board', 'mega.career.all', 'mega.career.posts') OR label IN ('게시판', '그동안의 업무내용', '전체 글'));

    UPDATE devdeck.menus
    SET label = '스킬',
        label_key = 'mega.career.skills',
        labels = jsonb_build_object('ko', '스킬', 'en', 'Skills'),
        href = '/b/skills',
        view_role = 'visitor',
        is_active = true,
        sort_order = 10,
        updated_at = now()
    WHERE parent_id = id_cl
      AND (label_key IN ('footer.skills', 'mega.career.skills') OR (label = '스킬' AND href IS DISTINCT FROM '/b/skills/top'));

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_cl, '그동안의 업무내용', 'mega.career.all',
           jsonb_build_object('ko', '그동안의 업무내용', 'en', 'What I''ve worked on'),
           '/work', 'footer', 'visitor', true, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_cl AND label_key = 'mega.career.all'
    );

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_cl, '스킬', 'mega.career.skills',
           jsonb_build_object('ko', '스킬', 'en', 'Skills'),
           '/b/skills', 'footer', 'visitor', true, 10
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_cl AND label_key = 'mega.career.skills'
    );

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_cl, '등록된 스킬 시상식', 'mega.career.skillsTop',
           jsonb_build_object('ko', '등록된 스킬 시상식', 'en', 'Registered skill awards'),
           '/b/skills/top', 'footer', 'visitor', true, 20
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_cl AND label_key = 'mega.career.skillsTop'
    );

    UPDATE devdeck.menus
    SET sort_order = 20, is_active = true, view_role = 'visitor', updated_at = now()
    WHERE parent_id = id_cl AND label_key = 'mega.career.skillsTop';

    UPDATE devdeck.menus
    SET sort_order = 30, is_active = true, view_role = 'owner',
        label = '글·스킬 관리', label_key = 'mega.career.manage',
        labels = jsonb_build_object('ko', '글·스킬 관리', 'en', 'Manage posts & skills'),
        href = '/career', updated_at = now()
    WHERE parent_id = id_cl
      AND (label_key = 'mega.career.manage' OR href = '/career' OR label = '글·스킬 관리');
  END IF;

  ------------------------------------------------------------------
  -- Steam
  ------------------------------------------------------------------
  IF id_st IS NOT NULL THEN
    UPDATE devdeck.menus
    SET label = '게임 목록',
        label_key = 'mega.games.list',
        labels = jsonb_build_object('ko', '게임 목록', 'en', 'Game list'),
        href = '/games',
        view_role = 'visitor',
        is_active = true,
        sort_order = 0,
        updated_at = now()
    WHERE parent_id = id_st
      AND (label_key IN ('footer.library', 'mega.games.list') OR label IN ('라이브러리', '게임 목록'));

    -- 구형 '리뷰'(/games) → 시상식으로 바꾸지 않고 비활성 (시상식은 별도 행)
    UPDATE devdeck.menus
    SET is_active = false, updated_at = now()
    WHERE parent_id = id_st
      AND (label_key = 'footer.reviews' OR label = '리뷰')
      AND label_key IS DISTINCT FROM 'mega.games.featured'
      AND label_key IS DISTINCT FROM 'mega.games.manage';

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_st, '게임 목록', 'mega.games.list',
           jsonb_build_object('ko', '게임 목록', 'en', 'Game list'),
           '/games', 'footer', 'visitor', true, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_st AND label_key = 'mega.games.list'
    );

    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_st, '플레이한 게임 시상식', 'mega.games.featured',
           jsonb_build_object('ko', '플레이한 게임 시상식', 'en', 'Played game awards'),
           '/games/top', 'footer', 'visitor', true, 10
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus WHERE parent_id = id_st AND label_key = 'mega.games.featured'
    );

    UPDATE devdeck.menus
    SET sort_order = 10, is_active = true, view_role = 'visitor', updated_at = now()
    WHERE parent_id = id_st AND label_key = 'mega.games.featured';

    UPDATE devdeck.menus
    SET sort_order = 20, is_active = true, view_role = 'owner',
        label = '리뷰 관리', label_key = 'mega.games.manage',
        labels = jsonb_build_object('ko', '리뷰 관리', 'en', 'Manage reviews'),
        href = '/steam', updated_at = now()
    WHERE parent_id = id_st
      AND (label_key = 'mega.games.manage' OR href = '/steam' OR label = '리뷰 관리');
  END IF;
END $$;

-- 3) 헤더 시상식 링크 보강
DO $$
DECLARE
  id_prompt UUID;
  id_career UUID;
  id_games UUID;
BEGIN
  SELECT id INTO id_prompt
  FROM devdeck.menus
  WHERE location = 'header' AND parent_id IS NULL
    AND (label_key = 'mega.prompt.label' OR label = 'AI Prompt')
  ORDER BY sort_order LIMIT 1;

  SELECT id INTO id_career
  FROM devdeck.menus
  WHERE location = 'header' AND parent_id IS NULL
    AND (label_key = 'mega.career.label' OR label IN ('커리어로그', 'Career log'))
  ORDER BY sort_order LIMIT 1;

  SELECT id INTO id_games
  FROM devdeck.menus
  WHERE location = 'header' AND parent_id IS NULL
    AND (label_key = 'mega.games.label' OR label IN ('게임리뷰', 'Game reviews'))
  ORDER BY sort_order LIMIT 1;

  IF id_prompt IS NOT NULL THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_prompt, '등록된 프롬프트 시상식', 'mega.prompt.top',
           jsonb_build_object('ko', '등록된 프롬프트 시상식', 'en', 'Registered prompt awards'),
           '/b/prompts/top', 'header', 'visitor', true, 10
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus
      WHERE parent_id = id_prompt AND (label_key = 'mega.prompt.top' OR href = '/b/prompts/top')
    );
  END IF;

  IF id_career IS NOT NULL THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_career, '등록된 스킬 시상식', 'mega.career.skillsTop',
           jsonb_build_object('ko', '등록된 스킬 시상식', 'en', 'Registered skill awards'),
           '/b/skills/top', 'header', 'visitor', true, 20
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus
      WHERE parent_id = id_career AND (label_key = 'mega.career.skillsTop' OR href = '/b/skills/top')
    );
  END IF;

  IF id_games IS NOT NULL THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, labels, href, location, view_role, is_active, sort_order)
    SELECT id_games, '플레이한 게임 시상식', 'mega.games.featured',
           jsonb_build_object('ko', '플레이한 게임 시상식', 'en', 'Played game awards'),
           '/games/top', 'header', 'visitor', true, 10
    WHERE NOT EXISTS (
      SELECT 1 FROM devdeck.menus
      WHERE parent_id = id_games AND (label_key = 'mega.games.featured' OR href = '/games/top')
    );
  END IF;
END $$;
