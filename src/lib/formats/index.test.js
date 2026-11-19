import { describe, it, expect } from 'vitest'
import {
  FORMATS,
  formatLabel,
  getFormat,
  getFormatByLabel,
  listFormats,
  normalizeFormatOptions,
  resolveFormatId,
} from './index.js'

describe('format registry', () => {
  it('registers the four formats with stable ids', () => {
    expect(FORMATS.map((format) => format.id)).toEqual(['e', 'd', 'r', 's'])
    expect(formatLabel('e')).toBe('Eliminación simple')
    expect(formatLabel('d')).toBe('Doble eliminación')
    expect(formatLabel('r')).toBe('Todos contra todos')
    expect(formatLabel('s')).toBe('Suizo')
  })

  it('only exposes formats that have an engine and a view', () => {
    for (const format of FORMATS) {
      if (!format.implemented) continue
      expect(format.engine, format.id).toBeTruthy()
      expect(format.view, format.id).toBeTruthy()
      expect(format.description, format.id).toBeTruthy()
      expect(format.optionSchema, format.id).toBeInstanceOf(Array)
    }
    const implemented = listFormats({ onlyImplemented: true })
    expect(implemented.map((format) => format.id)).toEqual(
      FORMATS.filter((format) => format.implemented).map((format) => format.id)
    )
  })

  it('marks a format as implemented only when its engine exists', () => {
    for (const format of FORMATS) {
      expect(format.implemented, format.id).toBe(Boolean(format.engine))
    }
    expect(getFormat('e').implemented).toBe(true)
    expect(getFormat('d').implemented).toBe(true)
  })

  it('resolves legacy labels in Spanish and English', () => {
    expect(resolveFormatId('Eliminación simple')).toBe('e')
    expect(resolveFormatId('Single Elimination')).toBe('e')
    expect(resolveFormatId('Doble eliminación')).toBe('d')
    expect(resolveFormatId('Double Elimination')).toBe('d')
    expect(resolveFormatId('Round Robin')).toBe('r')
    expect(resolveFormatId('Swiss')).toBe('s')
  })

  it('resolves ids and rejects unknown values', () => {
    expect(resolveFormatId('e')).toBe('e')
    expect(resolveFormatId('  e  ')).toBe('e')
    expect(resolveFormatId('Desconocido')).toBeNull()
    expect(resolveFormatId('')).toBeNull()
    expect(resolveFormatId(null)).toBeNull()
    expect(resolveFormatId(42)).toBeNull()
    expect(getFormat('zzz')).toBeNull()
    expect(getFormatByLabel('Swiss')?.id).toBe('s')
    expect(getFormatByLabel('nope')).toBeNull()
  })

  it('normalizes options to a plain serializable object', () => {
    expect(normalizeFormatOptions({ a: 1, b: true })).toEqual({ a: 1, b: true })
    expect(normalizeFormatOptions(null)).toEqual({})
    expect(normalizeFormatOptions([1, 2])).toEqual({})
    expect(normalizeFormatOptions('nope')).toEqual({})
    expect(normalizeFormatOptions(undefined)).toEqual({})
  })
})
