import { arcNumberLayout } from '../diffusePickers/arcDial'

test('centers the selected value at full size + opacity', () => {
  const rows = arcNumberLayout(28, 21, 35)
  const center = rows.find((r) => r.value === 28)!
  expect(center.size).toBe(76)
  expect(center.opacity).toBe(1)
  expect(center.k).toBe(0)
})

test('window is 7 wide when interior', () => {
  expect(arcNumberLayout(28, 21, 35)).toHaveLength(7)
})

test('clamps window at min', () => {
  const rows = arcNumberLayout(21, 21, 35)
  expect(rows.every((r) => r.value >= 21)).toBe(true)
  expect(rows.find((r) => r.k === 0)!.value).toBe(21)
})

test('off-center rows use the SIZES/OPAC tables by |k|', () => {
  const rows = arcNumberLayout(28, 21, 35)
  const kp1 = rows.find((r) => r.k === 1)!
  expect(kp1.size).toBe(42)
  expect(kp1.opacity).toBe(0.5)
})
