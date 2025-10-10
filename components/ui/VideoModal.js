'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'

export default function VideoModal({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title = "Video Player",
  autoplay = false,
  showControls = true 
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const videoRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen && autoplay && videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [isOpen, autoplay])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return
      
      switch (event.key) {
        case 'Escape':
          handleClose()
          break
        case ' ':
        case 'k':
          event.preventDefault()
          togglePlayPause()
          break
        case 'm':
          toggleMute()
          break
        case 'f':
          toggleFullscreen()
          break
        default:
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
    onClose()
  }

  const togglePlayPause = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (!modalRef.current) return

    if (!isFullscreen) {
      if (modalRef.current.requestFullscreen) {
        modalRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleDurationChange = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
  }

  const handleSeek = (event) => {
    if (!videoRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    const newTime = percent * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className={`relative w-full max-w-6xl mx-4 ${
          isFullscreen ? 'h-full' : 'h-auto'
        }`}
      >
        {/* Header */}
        {!isFullscreen && (
          <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 text-white">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              aria-label="Close video"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Video Container */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full h-auto max-h-[80vh]"
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlayPause}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Custom Controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              {/* Progress Bar */}
              <div 
                className="w-full h-1 bg-gray-600 rounded-full mb-4 cursor-pointer"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-white rounded-full"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <PauseIcon className="h-6 w-6" />
                    ) : (
                      <PlayIcon className="h-6 w-6" />
                    )}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <SpeakerXMarkIcon className="h-6 w-6" />
                    ) : (
                      <SpeakerWaveIcon className="h-6 w-6" />
                    )}
                  </button>

                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  <span className="text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="h-6 w-6" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Play/Pause Overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlayPause}
          >
            {!isPlaying && (
              <div className="bg-black bg-opacity-50 rounded-full p-4">
                <PlayIcon className="h-12 w-12 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts info */}
        {!isFullscreen && (
          <div className="p-4 bg-black bg-opacity-50 text-white text-sm">
            <div className="flex flex-wrap gap-4 justify-center">
              <span>Spacebar: Play/Pause</span>
              <span>M: Mute/Unmute</span>
              <span>F: Fullscreen</span>
              <span>ESC: Close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}