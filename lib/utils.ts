import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKRW(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('ko-KR').format(abs)
  return value < 0 ? `-${formatted}` : formatted
}

export function formatKRWFull(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
}

export function ymToLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}년 ${Number(m)}월`
}
