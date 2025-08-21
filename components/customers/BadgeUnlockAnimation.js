'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/badge'
import { getBadgeRarityStyle, getBadgeNotificationMessage } from '../../utils/badgeSystem'

export default function BadgeUnlockAnimation({ 
  badges = [], 
  onAnimationComplete = null,
  autoClose = true,
  autoCloseDelay = 5000,
  showPoints = true,
  playSound = true 
}) {
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (badges.length > 0 && !hasStarted) {
      setHasStarted(true)
      setIsVisible(true)
      
      // Play celebration sound if enabled
      if (playSound) {
        try {
          // Create a simple celebration tone
          const audioContext = new (window.AudioContext || window.webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2) // E5
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.4) // G5
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.6)
        } catch (error) {
          console.log('Audio not supported or allowed')
        }
      }
      
      // Auto-close functionality
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose()
        }, autoCloseDelay)
        
        return () => clearTimeout(timer)
      }
    }
  }, [badges, hasStarted, autoClose, autoCloseDelay, playSound])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete()
      }
    }, 300)
  }

  const handleNext = () => {
    if (currentBadgeIndex < badges.length - 1) {
      setCurrentBadgeIndex(currentBadgeIndex + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentBadgeIndex > 0) {
      setCurrentBadgeIndex(currentBadgeIndex - 1)
    }
  }

  if (!isVisible || badges.length === 0) {
    return null
  }

  const currentBadge = badges[currentBadgeIndex]
  const rarityStyle = getBadgeRarityStyle(currentBadge.rarity)
  const notification = getBadgeNotificationMessage(currentBadge)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative">
        {/* Floating Sparkles Background */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(rarityStyle.sparkles * 3)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-400 animate-bounce"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '2s'
              }}
            >
              ✨
            </div>
          ))}
        </div>

        <Card className="w-96 mx-4 relative overflow-hidden animate-pulse">
          {/* Glow Effect Border */}
          <div 
            className="absolute inset-0 rounded-lg opacity-30"
            style={{
              background: `linear-gradient(45deg, ${rarityStyle.color}, transparent, ${rarityStyle.color})`,
              filter: 'blur(8px)'
            }}
          />
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 z-10"
            onClick={handleClose}
          >
            ×
          </Button>

          <CardContent className="pt-8 pb-6 relative z-10">
            {/* Celebration Header */}
            <div className="text-center mb-6">
              <div className="inline-block text-4xl mb-2 animate-spin">
                🎉
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {notification.title}
              </h2>
              <p className="text-sm text-gray-600">
                Badge {currentBadgeIndex + 1} of {badges.length}
              </p>
            </div>

            {/* Badge Display */}
            <div className="text-center mb-6">
              <div
                className="inline-block p-6 rounded-full mb-4 relative"
                style={{
                  background: `radial-gradient(circle, ${rarityStyle.color}20, ${rarityStyle.color}05)`,
                  border: `3px solid ${rarityStyle.color}`,
                  boxShadow: `0 0 30px ${rarityStyle.glowColor}60`
                }}
              >
                {/* Rotating Ring Effect */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
                  style={{ 
                    borderColor: rarityStyle.color,
                    animationDuration: '3s'
                  }}
                />
                
                <span className="text-6xl relative z-10 animate-pulse">
                  {currentBadge.icon}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {currentBadge.name}
              </h3>
              
              <Badge 
                variant="outline" 
                className="mb-3 text-sm px-3 py-1"
                style={{ 
                  borderColor: rarityStyle.color, 
                  color: rarityStyle.color,
                  background: `${rarityStyle.color}10`
                }}
              >
                {rarityStyle.label} Badge
              </Badge>
              
              <p className="text-gray-700 mb-4">
                {currentBadge.description}
              </p>

              {/* Points Display */}
              {showPoints && (
                <div
                  className="flex items-center justify-center gap-2 text-lg font-semibold"
                  style={{ color: rarityStyle.color }}
                >
                  ⭐ +{notification.points} Points
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            {badges.length > 1 && (
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentBadgeIndex === 0}
                >
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {badges.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentBadgeIndex 
                          ? 'bg-blue-500' 
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={handleNext}
                  style={{ backgroundColor: rarityStyle.color }}
                  className="text-white hover:opacity-90"
                >
                  {currentBadgeIndex === badges.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            )}

            {/* Single Badge Continue Button */}
            {badges.length === 1 && (
              <div className="text-center">
                <Button
                  onClick={handleClose}
                  size="lg"
                  style={{ backgroundColor: rarityStyle.color }}
                  className="text-white hover:opacity-90"
                >
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}