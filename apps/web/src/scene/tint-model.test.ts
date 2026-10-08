import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, ShadowMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { tintModel } from './tint-model'

describe('tintModel', () => {
  it('sets the colour of every material under the root, multi-material meshes and children included', () => {
    const body = new MeshStandardMaterial()
    const [left, right] = [new MeshBasicMaterial(), new MeshBasicMaterial()]
    const root = new Group().add(new Mesh(new BoxGeometry(), body))
    root.children[0]!.add(new Mesh(new BoxGeometry(), [left, right]))

    tintModel(root, '#b3ccff')

    const expected = new Color('#b3ccff')
    for (const material of [body, left, right]) expect(material.color.equals(expected)).toBe(true)
  })

  it('converts the sRGB hex into three’s linear working colour, as the colour test assumes', () => {
    const material = new MeshStandardMaterial()
    tintModel(new Mesh(new BoxGeometry(), material), '#808080')
    // sRGB 0x80 is about 0.216 in linear light; an unconverted value would be 0.502.
    expect(material.color.r).toBeCloseTo(0.2158, 3)
  })

  it('setting twice leaves the same colour rather than darkening further', () => {
    const material = new MeshStandardMaterial()
    const mesh = new Mesh(new BoxGeometry(), material)
    tintModel(mesh, '#66b3ff')
    tintModel(mesh, '#66b3ff')
    expect(material.color.equals(new Color('#66b3ff'))).toBe(true)
  })

  it('refuses a material with no colour to tint instead of silently drawing it untinted', () => {
    const material = new ShadowMaterial()
    Reflect.deleteProperty(material, 'color')
    expect(() => tintModel(new Mesh(new BoxGeometry(), material), '#ffffff')).toThrow(/ShadowMaterial/)
  })
})
