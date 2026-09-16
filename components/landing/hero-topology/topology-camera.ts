import * as THREE from "three"

// 선택 시 카메라를 로봇 월드 좌표에서 방 기준 아이소메트릭(+X+Y+Z)으로 띄운다.
// 책상 local 대각선이 아니라 항상 같은 월드 오프셋이라, 마주보는 좌석이어도
// 로봇은 실제 카메라 쪽을 보면 된다(회전에 카메라 좌표를 쓰는 쪽은 topology-robot).
export const FOCUS_WORLD_OFFSET = new THREE.Vector3(2.45, 2.55, 2.45)
