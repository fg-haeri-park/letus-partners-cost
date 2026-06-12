'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  accept?: string
  label?: string
  onFile: (file: File) => void
  loading?: boolean
  className?: string
}

export function FileUpload({ accept = '.xlsx,.csv', label, onFile, loading, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFile(file: File) {
    setSelectedFile(file)
    onFile(file)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <Upload className="mx-auto mb-3 text-slate-400" size={28} />
        <p className="text-sm font-medium text-slate-700">{label ?? '파일을 끌어다 놓거나 클릭하여 업로드'}</p>
        <p className="text-xs text-slate-400 mt-1">{accept} 파일 지원</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border text-sm">
          <FileSpreadsheet size={16} className="text-green-600 shrink-0" />
          <span className="flex-1 truncate text-slate-700">{selectedFile.name}</span>
          <span className="text-slate-400 shrink-0">{(selectedFile.size / 1024).toFixed(0)} KB</span>
          <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {selectedFile && (
        <Button disabled={loading} className="w-full">
          {loading ? '업로드 중...' : '업로드'}
        </Button>
      )}
    </div>
  )
}
