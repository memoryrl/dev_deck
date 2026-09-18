-- 게임리뷰 > 추천 게임: 랜딩 해시(/#games)는 같은 페이지라 클릭이 죽은 것처럼 보임.
-- Top 10 시상식 화면으로 보낸다. 재실행해도 동일.

UPDATE devdeck.menus
SET href = '/games/top'
WHERE href = '/#games'
   OR (location = 'header' AND label IN ('추천 게임', '추천 글'));
