// Simple layout for embeddable widgets (no navigation header)
export default function WidgetLayout({ children }) {
  return (
    <div className="widget-layout">
      {children}
    </div>
  )
}