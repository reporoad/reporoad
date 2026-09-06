import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3, Matrix4, Quaternion, Euler } from 'three';
import { steeringWheelModel } from '../lib/voxel-models.ts';
import { driverSeatPosition, driverSeatScale, wheelPosition, wheelScale, wheelRotation } from '../lib/cabin-layout.ts';

test('driver seat stays clear of every wheel part in depth', () => {
  const matrix = new Matrix4().compose(new Vector3(...wheelPosition),
    new Quaternion().setFromEuler(new Euler(...wheelRotation)), new Vector3(...wheelScale));
  // Base rear is -.25; cushion/bolster rear is -.24. Use the larger envelope.
  const seatRear = driverSeatPosition[2] - .25 * driverSeatScale;
  for (const part of steeringWheelModel()) {
    const box = new Box3().setFromCenterAndSize(new Vector3(...part.position), new Vector3(...part.size)).applyMatrix4(matrix);
    assert.ok(seatRear - box.max.z > .025, `wheel-to-seat clearance ${seatRear - box.max.z}`);
  }
  assert.ok(Math.abs(driverSeatPosition[0] / driverSeatScale - 1.31) < 1e-9);
  assert.ok(Math.abs(driverSeatPosition[2] / driverSeatScale + 1.1) < 1e-9);
});
