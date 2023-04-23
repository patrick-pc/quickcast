import { useState, useEffect } from 'react'

export const useLocalStorage = (key: string, defaultValue: string) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue)
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

const getStorageValue = (key: string, defaultValue: string) => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key)
    const initial = saved !== null ? JSON.parse(saved) : defaultValue
    return initial
  }
}
