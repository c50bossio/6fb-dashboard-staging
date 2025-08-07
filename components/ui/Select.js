import React from 'react'

const Select = ({ children, value, onValueChange, ...props }) => {
  return (
    <div className="relative" {...props}>
      {React.cloneElement(children, { value, onValueChange })}
    </div>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <button
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      ref={ref}
      {...props}
    >
      {children}
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        className="h-4 w-4 opacity-50"
      >
        <path
          d="m4.93179 5.43179 4.29289 4.29289c.39052.39052 1.02369.39052 1.41421 0l4.29289-4.29289c.39052-.39052.39052-1.02369 0-1.41421-.39052-.39052-1.02369-.39052-1.41421 0L10 7.58579 6.48579 4.07157c-.39052-.39052-1.02369-.39052-1.41421 0-.39052.39052-.39052 1.02369 0 1.41422Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
})

const SelectValue = ({ placeholder, value }) => {
  return <span>{value || placeholder}</span>
}

const SelectContent = ({ children }) => {
  return (
    <div className="absolute z-50 min-w-32 overflow-hidden rounded-md border bg-white p-1 shadow-md">
      {children}
    </div>
  )
}

const SelectItem = ({ value, children, onSelect }) => {
  return (
    <div
      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
      onClick={() => onSelect?.(value)}
    >
      {children}
    </div>
  )
}

SelectTrigger.displayName = "SelectTrigger"

export default Select
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }