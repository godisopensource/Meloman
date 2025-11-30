import { useState } from "react"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"

export interface SortOption {
  value: string
  label: string
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}

interface SortFilterProps {
  sortOptions: SortOption[]
  filterOptions?: FilterOption[]
  currentSort: string
  currentFilter?: string
  onSortChange: (sort: string) => void
  onFilterChange?: (filter: string) => void
  className?: string
}

export function SortFilter({
  sortOptions,
  filterOptions,
  currentSort,
  currentFilter,
  onSortChange,
  onFilterChange,
  className = "",
}: SortFilterProps) {
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  const currentSortLabel = sortOptions.find(opt => opt.value === currentSort)?.label || sortOptions[0]?.label
  const currentFilterLabel = filterOptions?.find(opt => opt.value === currentFilter)?.label

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Sort Dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSort(!showSort)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          style={{ color: showSort ? 'var(--accent-color, #3b82f6)' : undefined }}
        >
          <span className="text-sm">Sort: {currentSortLabel}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showSort ? 'rotate-180' : ''}`} />
        </Button>

        <AnimatePresence>
          {showSort && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowSort(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 right-0 min-w-48 rounded-lg shadow-xl z-20 border overflow-hidden"
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.98)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(var(--accent-color-rgb, 59, 130, 246), 0.3)'
                }}
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value)
                      setShowSort(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-700/50"
                    style={
                      currentSort === option.value
                        ? { backgroundColor: 'rgba(var(--accent-color-rgb, 59, 130, 246), 0.15)', color: 'var(--accent-color, #3b82f6)' }
                        : { color: '#d1d5db' }
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Dropdown */}
      {filterOptions && filterOptions.length > 0 && (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            style={{ color: showFilter || currentFilter ? 'var(--accent-color, #3b82f6)' : undefined }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {currentFilterLabel && (
              <>
                <span className="text-sm">{currentFilterLabel}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onFilterChange?.('')
                  }}
                  className="hover:bg-gray-700 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </Button>

          <AnimatePresence>
            {showFilter && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowFilter(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 right-0 min-w-48 max-h-96 overflow-y-auto rounded-lg shadow-xl z-20 border"
                  style={{
                    backgroundColor: 'rgba(31, 41, 55, 0.98)',
                    backdropFilter: 'blur(12px)',
                    borderColor: 'rgba(var(--accent-color-rgb, 59, 130, 246), 0.3)'
                  }}
                >
                  <button
                    onClick={() => {
                      onFilterChange?.('')
                      setShowFilter(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-700/50 text-gray-400 border-b border-gray-700"
                  >
                    All
                  </button>
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onFilterChange?.(option.value)
                        setShowFilter(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-700/50 flex items-center justify-between"
                      style={
                        currentFilter === option.value
                          ? { backgroundColor: 'rgba(var(--accent-color-rgb, 59, 130, 246), 0.15)', color: 'var(--accent-color, #3b82f6)' }
                          : { color: '#d1d5db' }
                      }
                    >
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-gray-500">({option.count})</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
