'use client'

const SimpleTimePicker = ({ value, onChange, placeholder = "Select time" }) => {
  // Generate time options in 30-minute intervals
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
        
        options.push({ value: time24, label: time12 })
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
    >
      <option value="">{placeholder}</option>
      {timeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default SimpleTimePicker