'use client'

import {
  HeartIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
  HandRaiseIcon,
  SparklesIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpDownIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

// Default caring outreach steps that focus on relationship building
const DEFAULT_CARE_STEPS = [
  {
    stepNumber: 1,
    title: 'Gentle Check-In',
    method: 'email',
    timing: 'within 24 hours',
    tone: 'warm and understanding',
    message: 'We noticed we haven\'t seen you lately and wanted to check in. We hope everything is going well!',
    action: 'caring_outreach',
    followUp: true,
    personalTouch: 'Include their preferred service and last visit date'
  },
  {
    stepNumber: 2,
    title: 'Personal Phone Call',
    method: 'phone',
    timing: '3-5 days later',
    tone: 'caring and supportive',
    message: 'A brief, friendly call to see how they\'re doing and offer flexible scheduling options.',
    action: 'personal_connection',
    followUp: true,
    personalTouch: 'Ask about their preferences and any challenges they\'re facing'
  },
  {
    stepNumber: 3,
    title: 'Special Offer',
    method: 'sms',
    timing: '1 week later',
    tone: 'generous and welcoming',
    message: 'We miss you! Here\'s a special welcome-back offer just for you.',
    action: 'value_offering',
    followUp: false,
    personalTouch: 'Offer their favorite service or a complementary add-on'
  },
  {
    stepNumber: 4,
    title: 'Relationship Building',
    method: 'email',
    timing: '2 weeks later',
    tone: 'genuine and relationship-focused',
    message: 'Share updates about the shop, new services, and let them know their chair is always ready.',
    action: 'relationship_nurturing',
    followUp: true,
    personalTouch: 'Mention their favorite barber or specific preferences'
  }
]

const COMMUNICATION_METHODS = {
  email: { icon: EnvelopeIcon, label: 'Email', color: 'blue' },
  phone: { icon: PhoneIcon, label: 'Phone Call', color: 'green' },
  sms: { icon: ChatBubbleLeftRightIcon, label: 'Text Message', color: 'purple' },
  in_person: { icon: UserGroupIcon, label: 'In-Person', color: 'orange' }
}

const CARE_ACTIONS = {
  caring_outreach: { icon: HeartIcon, label: 'Caring Outreach', description: 'Show genuine care and concern' },
  personal_connection: { icon: UserGroupIcon, label: 'Personal Connection', description: 'Build personal relationship' },
  value_offering: { icon: GiftIcon, label: 'Value Offering', description: 'Provide special value or incentive' },
  relationship_nurturing: { icon: SparklesIcon, label: 'Relationship Nurturing', description: 'Strengthen the relationship bond' }
}

/**
 * ClientCareEditor - Visual editor for relationship-focused client care steps
 * 
 * Features:
 * - Drag-and-drop care step reordering
 * - Step-by-step relationship building configuration
 * - Real-time care progression preview
 * - Dale Carnegie principle integration
 * - Visual care escalation chart
 */
export function ClientCareEditor({ 
  careSteps = DEFAULT_CARE_STEPS, 
  onStepsChange, 
  barbershopSettings = {},
  isManager = false 
}) {
  const [editingSteps, setEditingSteps] = useState(careSteps)
  const [selectedScenario, setSelectedScenario] = useState({ 
    name: 'Valued Regular Client', 
    lastVisit: '2 months ago',
    totalVisits: 15,
    relationship: 'strong'
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(true)

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(editingSteps) !== JSON.stringify(careSteps))
  }, [editingSteps, careSteps])

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(editingSteps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update step numbers based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      stepNumber: index + 1
    }))

    setEditingSteps(updatedItems)
  }

  const addNewStep = () => {
    const newStep = {
      stepNumber: editingSteps.length + 1,
      title: 'New Care Step',
      method: 'email',
      timing: 'custom timing',
      tone: 'caring and supportive',
      message: 'New caring outreach message',
      action: 'caring_outreach',
      followUp: true,
      personalTouch: 'Add personal touch here'
    }
    setEditingSteps([...editingSteps, newStep])
  }

  const removeStep = (index) => {
    const updatedSteps = editingSteps
      .filter((_, i) => i !== index)
      .map((step, idx) => ({
        ...step,
        stepNumber: idx + 1
      }))
    setEditingSteps(updatedSteps)
  }

  const updateStep = (index, field, value) => {
    const updatedSteps = editingSteps.map((step, idx) => 
      idx === index ? { ...step, [field]: value } : step
    )
    setEditingSteps(updatedSteps)
  }

  const saveChanges = () => {
    onStepsChange?.(editingSteps)
    setHasUnsavedChanges(false)
  }

  const resetChanges = () => {
    setEditingSteps(careSteps)
    setHasUnsavedChanges(false)
  }

  const formatCurrency = (amount) => `$${amount.toFixed(2)}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HeartIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Client Care Steps</h3>
              <p className="text-sm text-gray-600">Configure relationship-focused outreach steps</p>
            </div>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
              <div className="flex space-x-2">
                <button
                  onClick={resetChanges}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={saveChanges}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>

        {!isManager && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Manager approval required</strong> for changes to care step configuration
            </p>
          </div>
        )}
      </div>

      {/* Care Steps Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span>Care Steps</span>
            <span className="text-sm text-gray-500">
              {editingSteps.length} steps configured
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop to reorder steps. Each step represents a caring touchpoint to build stronger relationships.
          </p>
        </div>

        <div className="p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="care-steps">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''} transition-colors rounded-lg p-2`}
                >
                  {editingSteps.map((step, index) => {
                    const MethodIcon = COMMUNICATION_METHODS[step.method]?.icon || EnvelopeIcon
                    const ActionIcon = CARE_ACTIONS[step.action]?.icon || HeartIcon
                    
                    return (
                      <Draggable key={index} draggableId={`step-${index}`} index={index} isDragDisabled={!isManager}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white border border-gray-200 rounded-lg p-4 ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50' : 'hover:shadow-sm'
                            } transition-all`}
                          >
                            <div className="flex items-start space-x-4">
                              {/* Step Number & Drag Handle */}
                              <div className="flex items-center space-x-2" {...provided.dragHandleProps}>
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                                  <span className="text-sm font-bold text-blue-700">{step.stepNumber}</span>
                                </div>
                                {isManager && <ChevronUpDownIcon className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />}
                              </div>

                              {/* Step Content */}
                              <div className="flex-1 space-y-4">
                                {/* Step Title & Method */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Step Title
                                    </label>
                                    <input
                                      type="text"
                                      value={step.title}
                                      onChange={(e) => updateStep(index, 'title', e.target.value)}
                                      disabled={!isManager}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Communication Method
                                    </label>
                                    <select
                                      value={step.method}
                                      onChange={(e) => updateStep(index, 'method', e.target.value)}
                                      disabled={!isManager}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    >
                                      {Object.entries(COMMUNICATION_METHODS).map(([key, method]) => (
                                        <option key={key} value={key}>{method.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Timing & Tone */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Timing
                                    </label>
                                    <input
                                      type="text"
                                      value={step.timing}
                                      onChange={(e) => updateStep(index, 'timing', e.target.value)}
                                      disabled={!isManager}
                                      placeholder="e.g., within 24 hours, 3-5 days later"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Care Action Type
                                    </label>
                                    <select
                                      value={step.action}
                                      onChange={(e) => updateStep(index, 'action', e.target.value)}
                                      disabled={!isManager}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    >
                                      {Object.entries(CARE_ACTIONS).map(([key, action]) => (
                                        <option key={key} value={key}>{action.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Message & Personal Touch */}
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Care Message
                                    </label>
                                    <textarea
                                      value={step.message}
                                      onChange={(e) => updateStep(index, 'message', e.target.value)}
                                      disabled={!isManager}
                                      rows={3}
                                      placeholder="Craft a caring, relationship-building message..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Personal Touch
                                    </label>
                                    <input
                                      type="text"
                                      value={step.personalTouch}
                                      onChange={(e) => updateStep(index, 'personalTouch', e.target.value)}
                                      disabled={!isManager}
                                      placeholder="How to personalize this step..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    />
                                  </div>
                                </div>

                                {/* Icons and Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <MethodIcon className="h-4 w-4 text-gray-500" />
                                      <span className="text-xs text-gray-500">{COMMUNICATION_METHODS[step.method]?.label}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <ActionIcon className="h-4 w-4 text-blue-500" />
                                      <span className="text-xs text-gray-500">{CARE_ACTIONS[step.action]?.label}</span>
                                    </div>
                                    {step.followUp && (
                                      <div className="flex items-center space-x-2">
                                        <CalendarIcon className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-600">Follow-up enabled</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {isManager && (
                                    <button
                                      onClick={() => removeStep(index)}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {isManager && (
            <button
              onClick={addNewStep}
              className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
            >
              <PlusIcon className="h-6 w-6 mx-auto mb-2" />
              Add New Care Step
            </button>
          )}
        </div>
      </div>

      {/* Care Process Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <button
            onClick={() => setPreviewExpanded(!previewExpanded)}
            className="flex items-center justify-between w-full"
          >
            <span>Care Process Preview</span>
            <ChevronUpDownIcon className={`h-5 w-5 transition-transform ${previewExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {previewExpanded && (
          <div className="p-6">
            {/* Scenario Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview Scenario
              </label>
              <select
                value={selectedScenario.name}
                onChange={(e) => {
                  const scenarios = [
                    { name: 'Valued Regular Client', lastVisit: '2 months ago', totalVisits: 15, relationship: 'strong' },
                    { name: 'New Client', lastVisit: '3 weeks ago', totalVisits: 2, relationship: 'building' },
                    { name: 'Long-term Client', lastVisit: '6 months ago', totalVisits: 50, relationship: 'established' }
                  ]
                  setSelectedScenario(scenarios.find(s => s.name === e.target.value))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option>Valued Regular Client</option>
                <option>New Client</option>
                <option>Long-term Client</option>
              </select>
            </div>

            {/* Preview Timeline */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Care Process Timeline for {selectedScenario.name}</h4>
              
              {editingSteps.map((step, index) => {
                const MethodIcon = COMMUNICATION_METHODS[step.method]?.icon || EnvelopeIcon
                const ActionIcon = CARE_ACTIONS[step.action]?.icon || HeartIcon
                
                return (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm">
                      <span className="text-xs font-bold">{step.stepNumber}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <ActionIcon className="h-5 w-5 text-blue-600" />
                        <h5 className="font-medium text-gray-900">{step.title}</h5>
                        <span className="text-xs text-gray-500">({step.timing})</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <MethodIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">via {COMMUNICATION_METHODS[step.method]?.label}</span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{step.message}</p>
                      
                      {step.personalTouch && (
                        <div className="flex items-center space-x-2 text-xs text-blue-600">
                          <SparklesIcon className="h-4 w-4" />
                          <span>{step.personalTouch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  Relationship-building process: {editingSteps.length} caring touchpoints configured
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Best Practices Guide */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-purple-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium mb-2">Client Care Best Practices:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Always lead with genuine care and concern for their wellbeing</li>
              <li>• Personalize each message with specific details about their preferences</li>
              <li>• Focus on understanding their needs rather than pushing services</li>
              <li>• Offer flexible solutions and accommodate their schedule</li>
              <li>• Show appreciation for their past loyalty and relationship</li>
              <li>• Make them feel valued as a person, not just a customer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientCareEditor