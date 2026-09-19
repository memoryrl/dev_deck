-- 헤더·푸터 공개 메뉴에 i18n label_key를 채운다.
-- 이미 값이 있어도 기본 시드 라벨이면 키를 맞춘다. 재실행해도 동일.

UPDATE devdeck.menus SET label_key = 'mega.prompt.label'
WHERE location = 'header' AND parent_id IS NULL AND label = 'AI Prompt';

UPDATE devdeck.menus SET label_key = 'footer.publicPrompts'
WHERE location IN ('header', 'footer') AND label = '공개 프롬프트';

UPDATE devdeck.menus SET label_key = 'mega.prompt.public'
WHERE location = 'header' AND label IN ('AI 프롬프트 목록', '공개 프롬프트') AND href IN ('/b/prompts', '/#prompts');

UPDATE devdeck.menus SET label_key = 'mega.prompt.home'
WHERE location = 'header' AND label = '허브 홈';

UPDATE devdeck.menus SET label_key = 'mega.prompt.top'
WHERE location = 'header' AND label = '추천 프롬프트';

UPDATE devdeck.menus SET label_key = 'mega.prompt.manage'
WHERE location IN ('header', 'footer') AND label = '프롬프트 관리';

UPDATE devdeck.menus SET label_key = 'mega.career.label'
WHERE location = 'header' AND parent_id IS NULL AND label = '커리어로그';

UPDATE devdeck.menus SET label_key = 'mega.career.posts'
WHERE location = 'header' AND label = '전체 글';

UPDATE devdeck.menus SET label_key = 'mega.career.all'
WHERE location = 'header' AND label = '그동안의 업무내용';

UPDATE devdeck.menus SET label_key = 'mega.career.recent'
WHERE location = 'header' AND label = '최근 커리어';

UPDATE devdeck.menus SET label_key = 'mega.career.skills'
WHERE location = 'header' AND label = '스킬';

UPDATE devdeck.menus SET label_key = 'mega.career.skillsTop'
WHERE location = 'header' AND label = '스킬 추천';

UPDATE devdeck.menus SET label_key = 'footer.skills'
WHERE location = 'footer' AND label = '스킬';

UPDATE devdeck.menus SET label_key = 'mega.career.manage'
WHERE location IN ('header', 'footer') AND label = '글·스킬 관리';

UPDATE devdeck.menus SET label_key = 'mega.games.label'
WHERE location = 'header' AND parent_id IS NULL AND label IN ('게임리뷰', '게임 리뷰');

UPDATE devdeck.menus SET label_key = 'mega.games.list'
WHERE location = 'header' AND label = '게임 목록';

UPDATE devdeck.menus SET label_key = 'mega.games.featured'
WHERE location = 'header' AND label IN ('추천 게임', '추천 글');

UPDATE devdeck.menus SET label_key = 'mega.games.manage'
WHERE location IN ('header', 'footer') AND label = '리뷰 관리';

UPDATE devdeck.menus SET label_key = 'mega.community.label'
WHERE location IN ('header', 'footer') AND parent_id IS NULL AND label = '커뮤니티';

UPDATE devdeck.menus SET label_key = 'mega.community.notice'
WHERE location IN ('header', 'footer') AND label = '공지사항';

UPDATE devdeck.menus SET label_key = 'mega.community.free'
WHERE location IN ('header', 'footer') AND label = '자유게시판';

UPDATE devdeck.menus SET label_key = 'footer.browse'
WHERE location = 'footer' AND parent_id IS NULL AND label = '둘러보기';

UPDATE devdeck.menus SET label_key = 'common.home'
WHERE location = 'footer' AND label = '홈';

UPDATE devdeck.menus SET label_key = 'footer.career'
WHERE location = 'footer' AND label = '커리어';

UPDATE devdeck.menus SET label_key = 'footer.games'
WHERE location = 'footer' AND label = '게임';

UPDATE devdeck.menus SET label_key = 'nav.promptkit'
WHERE location = 'footer' AND parent_id IS NULL AND label = 'PromptKit';

UPDATE devdeck.menus SET label_key = 'footer.dashboard'
WHERE location = 'footer' AND label = '대시보드';

UPDATE devdeck.menus SET label_key = 'nav.career'
WHERE location = 'footer' AND parent_id IS NULL AND label = 'CareerLog';

UPDATE devdeck.menus SET label_key = 'footer.board'
WHERE location = 'footer' AND label = '게시판';

UPDATE devdeck.menus SET label_key = 'steam.title'
WHERE location = 'footer' AND parent_id IS NULL AND label = 'Steam';

UPDATE devdeck.menus SET label_key = 'footer.library'
WHERE location = 'footer' AND label = '라이브러리';

UPDATE devdeck.menus SET label_key = 'footer.reviews'
WHERE location = 'footer' AND label = '리뷰';
