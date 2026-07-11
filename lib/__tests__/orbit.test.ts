import { orbitNodePositions } from '../diffusePickers/orbit'

test('4-node layout matches the reference corners', () => {
  const p = orbitNodePositions(4)
  expect(p).toEqual([
    { left: '27%', top: '22%' },
    { left: '73%', top: '22%' },
    { left: '27%', top: '78%' },
    { left: '73%', top: '78%' },
  ])
})

test('returns one position per option', () => {
  expect(orbitNodePositions(4)).toHaveLength(4)
})
