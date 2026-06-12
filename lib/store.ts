'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Company = {
  id: string
  name: string
  code: string
}

export type Center = {
  id: string
  company_id: string
  name: string
  type: string
}

type AppState = {
  selectedCompany: Company | null
  selectedCenter: Center | null
  selectedYm: string
  companies: Company[]
  centers: Center[]
  setSelectedCompany: (company: Company | null) => void
  setSelectedCenter: (center: Center | null) => void
  setSelectedYm: (ym: string) => void
  setCompanies: (companies: Company[]) => void
  setCenters: (centers: Center[]) => void
}

const currentYm = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCompany: null,
      selectedCenter: null,
      selectedYm: currentYm(),
      companies: [],
      centers: [],
      setSelectedCompany: (company) => set({ selectedCompany: company, selectedCenter: null }),
      setSelectedCenter: (center) => set({ selectedCenter: center }),
      setSelectedYm: (ym) => set({ selectedYm: ym }),
      setCompanies: (companies) => set({ companies }),
      setCenters: (centers) => set({ centers }),
    }),
    { name: 'letus-app-store', partialize: (s) => ({ selectedCompany: s.selectedCompany, selectedYm: s.selectedYm }) }
  )
)
