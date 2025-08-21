'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  CameraIcon, 
  ClockIcon, 
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { format, formatDistanceToNow } from 'date-fns'

export default function QuickNotesTimeline({ customerId, customerName }) {
  const [notes, setNotes] = useState([])
  const [photos, setPhotos] = useState([])
  const [timeline, setTimeline] = useState([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('timeline')

  // Fetch timeline data
  useEffect(() => {
    if (customerId) {
      fetchTimeline()
    }
  }, [customerId])

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/timeline`)
      const data = await response.json()
      
      if (data.success) {
        setNotes(data.notes || [])
        setPhotos(data.photos || [])
        
        // Combine notes and photos into unified timeline
        const combined = [
          ...data.notes.map(n => ({ ...n, type: 'note' })),
          ...data.photos.map(p => ({ ...p, type: 'photo' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        
        setTimeline(combined)
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return

    try {
      const response = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteText,
          category: 'general',
          created_at: new Date().toISOString()
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setNotes([data.note, ...notes])
        setTimeline([{ ...data.note, type: 'note' }, ...timeline])
        setNoteText('')
        setIsAddingNote(false)
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('photo', file)
    formData.append('customerId', customerId)
    formData.append('caption', prompt('Add a caption for this photo (optional):') || '')

    try {
      const response = await fetch(`/api/customers/${customerId}/photos`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        setPhotos([data.photo, ...photos])
        setTimeline([{ ...data.photo, type: 'photo' }, ...timeline])
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/customers/${customerId}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId))
        setTimeline(timeline.filter(t => !(t.type === 'note' && t.id === noteId)))
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const formatTimelineDate = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffInDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return formatDistanceToNow(d, { addSuffix: true })
    return format(d, 'MMM d, yyyy')
  }

  const getCategoryColor = (category) => {
    const colors = {
      preference: 'bg-blue-100 text-blue-800',
      complaint: 'bg-red-100 text-red-800',
      compliment: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800',
      style: 'bg-purple-100 text-purple-800',
      health: 'bg-yellow-100 text-yellow-800'
    }
    return colors[category] || colors.general
  }

  const noteCategories = [
    { value: 'general', label: 'General', icon: '📝' },
    { value: 'preference', label: 'Preference', icon: '⭐' },
    { value: 'style', label: 'Style Notes', icon: '✂️' },
    { value: 'complaint', label: 'Issue', icon: '⚠️' },
    { value: 'compliment', label: 'Compliment', icon: '👍' },
    { value: 'health', label: 'Health/Allergy', icon: '🏥' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Customer Timeline</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track notes, photos, and interactions for {customerName}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddingNote(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Note
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
              <CameraIcon className="w-4 h-4" />
              Add Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Timeline ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'notes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'photos'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Photos ({photos.length})
          </button>
        </nav>
      </div>

      {/* Add Note Form */}
      {isAddingNote && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="space-y-3">
            <div className="flex gap-2">
              {noteCategories.map(cat => (
                <button
                  key={cat.value}
                  className="px-3 py-1 text-sm bg-white rounded-lg border hover:bg-gray-50"
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note here..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAddingNote(false)
                  setNoteText('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading timeline...</p>
          </div>
        ) : (
          <>
            {/* Timeline View */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No timeline entries yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add notes and photos to build {customerName}'s history
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {timeline.map((item, index) => (
                      <div key={`${item.type}-${item.id}`} className="relative flex items-start mb-6">
                        {/* Timeline dot */}
                        <div className={`absolute left-6 w-4 h-4 rounded-full border-2 border-white z-10 ${
                          item.type === 'photo' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        
                        {/* Content */}
                        <div className="ml-16 flex-1">
                          {item.type === 'note' ? (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(item.category)}`}>
                                      {item.category}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatTimelineDate(item.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-gray-800">{item.content}</p>
                                  {item.created_by && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      Added by {item.created_by}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteNote(item.id)}
                                  className="text-gray-400 hover:text-red-600 ml-2"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-start gap-4">
                                <img
                                  src={item.url || '/placeholder-image.jpg'}
                                  alt={item.caption || 'Customer photo'}
                                  className="w-24 h-24 rounded-lg object-cover cursor-pointer hover:opacity-90"
                                  onClick={() => {
                                    setSelectedPhoto(item)
                                    setPhotoGalleryOpen(true)
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <PhotoIcon className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs text-gray-500">
                                      {formatTimelineDate(item.created_at)}
                                    </span>
                                  </div>
                                  {item.caption && (
                                    <p className="text-gray-800">{item.caption}</p>
                                  )}
                                  {item.service_type && (
                                    <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                      {item.service_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes View */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No notes yet</p>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(note.category)}`}>
                              {note.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimelineDate(note.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-800">{note.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600 ml-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Photos View */}
            {activeTab === 'photos' && (
              <div className="grid grid-cols-3 gap-4">
                {photos.length === 0 ? (
                  <div className="col-span-3 text-center py-8">
                    <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No photos yet</p>
                  </div>
                ) : (
                  photos.map(photo => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setSelectedPhoto(photo)
                        setPhotoGalleryOpen(true)
                      }}
                    >
                      <img
                        src={photo.url || '/placeholder-image.jpg'}
                        alt={photo.caption || 'Customer photo'}
                        className="w-full h-32 object-cover rounded-lg group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all">
                        <div className="absolute bottom-2 left-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs truncate">{photo.caption}</p>
                          <p className="text-xs">{formatTimelineDate(photo.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo Gallery Modal */}
      {photoGalleryOpen && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setPhotoGalleryOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            
            <img
              src={selectedPhoto.url || '/placeholder-image.jpg'}
              alt={selectedPhoto.caption || 'Customer photo'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            
            {selectedPhoto.caption && (
              <div className="mt-4 text-white text-center">
                <p className="text-lg">{selectedPhoto.caption}</p>
                <p className="text-sm opacity-75 mt-2">
                  {format(new Date(selectedPhoto.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            
            {/* Navigation arrows if multiple photos */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1
                    setSelectedPhoto(photos[prevIndex])
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
                    const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0
                    setSelectedPhoto(photos[nextIndex])
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronRightIcon className="w-8 h-8" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}