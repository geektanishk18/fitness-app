import { z } from 'zod'
import { transformationMeasurementSchema, type TransformationMeasurement } from '../transformation'

export interface TransformationRepository {
  listMeasurements(): TransformationMeasurement[]
  saveMeasurement(record: TransformationMeasurement): TransformationMeasurement[]
  deleteMeasurement(id: string): TransformationMeasurement[]
}

const recordsKey = 'v-taper-transformation-measurements'
const recordsSchema = z.array(transformationMeasurementSchema)

export class LocalTransformationRepository implements TransformationRepository {
  listMeasurements() {
    const raw = localStorage.getItem(recordsKey)
    return recordsSchema.parse(raw ? JSON.parse(raw) : []).sort((a, b) => b.date.localeCompare(a.date))
  }

  saveMeasurement(record: TransformationMeasurement) {
    const valid = transformationMeasurementSchema.parse(record)
    const records = [valid, ...this.listMeasurements().filter((item) => item.id !== valid.id && item.date !== valid.date)].sort((a, b) => b.date.localeCompare(a.date))
    localStorage.setItem(recordsKey, JSON.stringify(records))
    return records
  }

  deleteMeasurement(id: string) {
    const records = this.listMeasurements().filter((record) => record.id !== id)
    localStorage.setItem(recordsKey, JSON.stringify(records))
    return records
  }
}

export type ProgressPhoto = { id: string; date: string; name: string; mimeType: string; blob: Blob }

export interface ProgressPhotoRepository {
  list(): Promise<ProgressPhoto[]>
  save(photo: ProgressPhoto): Promise<void>
  remove(id: string): Promise<void>
}

export class IndexedDbProgressPhotoRepository implements ProgressPhotoRepository {
  private database(): Promise<IDBDatabase> {
    if (!globalThis.indexedDB) return Promise.reject(new Error('Private photo storage is unavailable in this browser.'))
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('v-taper-private-progress', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Private photo storage could not be opened.'))
    })
  }

  async list() {
    const db = await this.database()
    return new Promise<ProgressPhoto[]>((resolve, reject) => {
      const request = db.transaction('photos', 'readonly').objectStore('photos').getAll()
      request.onsuccess = () => resolve((request.result as ProgressPhoto[]).sort((a, b) => b.date.localeCompare(a.date)))
      request.onerror = () => reject(new Error('Progress photos could not be loaded.'))
    })
  }

  async save(photo: ProgressPhoto) {
    const db = await this.database()
    return new Promise<void>((resolve, reject) => {
      const request = db.transaction('photos', 'readwrite').objectStore('photos').put(photo)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Progress photo could not be saved locally.'))
    })
  }

  async remove(id: string) {
    const db = await this.database()
    return new Promise<void>((resolve, reject) => {
      const request = db.transaction('photos', 'readwrite').objectStore('photos').delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Progress photo could not be removed.'))
    })
  }
}
