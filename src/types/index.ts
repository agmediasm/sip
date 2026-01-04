// Re-export all types
export * from './database'
export * from './frontend'

// Utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined

// Make all properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Make specific properties required
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>

// Extract ID type
export type EntityId = string

// Common callback types
export type VoidCallback = () => void
export type AsyncCallback = () => Promise<void>
export type ErrorCallback = (error: Error) => void

// Form event types
export type FormSubmitHandler = (e: React.FormEvent) => void | Promise<void>
export type InputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => void
export type SelectChangeHandler = (e: React.ChangeEvent<HTMLSelectElement>) => void
