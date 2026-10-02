import React from 'react'
import { Layers, Laptop, Code2 } from 'lucide-react'

export type RequestCategoryType = 'ALL' | 'SOFTWARE' | 'HARDWARE' | 'all' | 'software' | 'hardware'

export interface RequestTypeFilterProps {
  value: RequestCategoryType
  onChange: (value: any) => void
  totalCount?: number
  softwareCount?: number
  hardwareCount?: number
  counts?: {
    all?: number
    software?: number
    hardware?: number
  }
  className?: string
  compact?: boolean
}

export const RequestTypeFilter: React.FC<RequestTypeFilterProps> = ({
  value,
  onChange,
  totalCount,
  softwareCount,
  hardwareCount,
  counts,
  className = '',
  compact = false,
}) => {
  const normValue = String(value || 'ALL').toUpperCase()
  const isLowercase = String(value) === String(value).toLowerCase()

  const tabs = [
    {
      id: 'ALL' as const,
      label: 'All Requests',
      shortLabel: 'All',
      icon: Layers,
      color: 'blue',
      count: totalCount ?? counts?.all,
    },
    {
      id: 'SOFTWARE' as const,
      label: 'Software Requests',
      shortLabel: 'Software',
      icon: Code2,
      color: 'indigo',
      count: softwareCount ?? counts?.software,
    },
    {
      id: 'HARDWARE' as const,
      label: 'Hardware Requests',
      shortLabel: 'Hardware',
      icon: Laptop,
      color: 'emerald',
      count: hardwareCount ?? counts?.hardware,
    },
  ]

  return (
    <div
      className={`inline-flex items-center p-1 bg-gray-100/90 border border-gray-200 rounded-xl shadow-2xs ${className}`}
      role="group"
      aria-label="Request Type Filter"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = normValue === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(isLowercase ? tab.id.toLowerCase() : tab.id)}
            className={`
              flex items-center gap-2 rounded-lg font-bold transition-all duration-150 cursor-pointer
              ${compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'}
              ${
                isActive
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }
            `}
          >
            <Icon
              size={compact ? 13 : 14}
              className={isActive ? (tab.id === 'SOFTWARE' ? 'text-indigo-600' : tab.id === 'HARDWARE' ? 'text-emerald-600' : 'text-blue-600') : 'text-gray-400'}
            />
            <span>{compact ? tab.shortLabel : tab.label}</span>

            {typeof tab.count === 'number' && (
              <span
                className={`
                  text-[10px] px-1.5 py-0.2 rounded-full font-bold
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
