import * as THREE from "three"

// 포커스(책상 확대) 카메라가 접근하는 대각선 오프셋. topology-scene.tsx의 CameraFocus와
// topology-robot.tsx의 "선택된 로봇이 카메라 쪽을 바라보게" 회전 계산이 같은 값을
// 공유해야 카메라가 서는 자리와 로봇이 돌아보는 방향이 어긋나지 않는다.
export const FOCUS_CAM_LOCAL = new THREE.Vector3(2.35, 2.52, 2.05)

const FOCUS_CAM_ANGLE = Math.atan2(FOCUS_CAM_LOCAL.x, FOCUS_CAM_LOCAL.z)

// side: 책상이 방 왼쪽(-X)에 있으면 -1(카메라가 -X 쪽 대각선에서 접근), 아니면 1.
// 반환값은 topology-robot.tsx의 idle 기준 yaw 좌표계(0 = -Z를 보는 상태, 책상을 향함)다.
export function focusFacingYaw(side: 1 | -1): number {
  return side * FOCUS_CAM_ANGLE + Math.PI
}
