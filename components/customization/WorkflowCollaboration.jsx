'use client'

import {
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  EyeIcon,
  PlayIcon,
  BellIcon,
  CalendarIcon,
  TagIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeTransparentIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

const ApprovalWorkflowCard = ({ workflow, onAction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'in_review': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />
      case 'approved': return <CheckCircleIcon className="w-4 h-4" />
      case 'rejected': return <XCircleIcon className="w-4 h-4" />
      case 'in_review': return <EyeIcon className="w-4 h-4" />
      default: return <ExclamationTriangleIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{workflow.title}</h3>
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${
                getStatusColor(workflow.status)
              }`}>
                {getStatusIcon(workflow.status)}
                <span className="capitalize">{workflow.status.replace('_', ' ')}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
            
            {/* Workflow Details */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <UserGroupIcon className="w-4 h-4" />
                <span>{workflow.submitter?.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{new Date(workflow.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <TagIcon className="w-4 h-4" />
                <span className="capitalize">{workflow.type}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Changes Preview */}
        {workflow.changes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Proposed Changes</h4>
            <div className="space-y-2">
              {workflow.changes.map((change, index) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-600">{change.field}:</span>
                  <span className="ml-2 text-red-600 line-through">{change.from}</span>
                  <span className="ml-2 text-green-600">{change.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assignees & Reviewers */}
        <div className="mb-4">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm text-gray-500">Assigned to:</span>
              <div className="flex items-center space-x-2 mt-1">
                {workflow.reviewers?.map((reviewer, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {reviewer.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700">{reviewer.name}</span>
                    {reviewer.status && (
                      <div className={`w-3 h-3 rounded-full ${
                        reviewer.status === 'approved' ? 'bg-green-500' :
                        reviewer.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comments */}
        {workflow.comments && workflow.comments.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Latest Comments:</div>
            <div className="space-y-2">
              {workflow.comments.slice(-2).map((comment, index) => (
                <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                  <div className="font-medium text-blue-900">{comment.author}:</div>
                  <div className="text-blue-800">{comment.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onAction('view', workflow.id)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
            <span>Review</span>
          </button>
          
          {workflow.status === 'pending' && (
            <>
              <button
                onClick={() => onAction('approve', workflow.id)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => onAction('reject', workflow.id)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircleIcon className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </>
          )}
          
          {workflow.status === 'approved' && (
            <button
              onClick={() => onAction('deploy', workflow.id)}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              <span>Deploy</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const VersionControlPanel = ({ versions, onRevert, onCompare }) => {
  const [selectedVersions, setSelectedVersions] = useState([])

  const handleVersionSelect = (versionId) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      } else if (prev.length < 2) {
        return [...prev, versionId]
      } else {
        return [prev[1], versionId]
      }
    })
  }

  const getVersionIcon = (type) => {
    switch (type) {
      case 'major': return <CubeTransparentIcon className="w-4 h-4 text-red-600" />
      case 'minor': return <Cog6ToothIcon className="w-4 h-4 text-blue-600" />
      case 'patch': return <PencilSquareIcon className="w-4 h-4 text-green-600" />
      default: return <DocumentTextIcon className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
          <div className="flex items-center space-x-2">
            {selectedVersions.length === 2 && (
              <button
                onClick={() => onCompare(selectedVersions)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Compare Selected
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                selectedVersions.includes(version.id)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${index === 0 ? 'ring-2 ring-green-200' : ''}`}
              onClick={() => handleVersionSelect(version.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getVersionIcon(version.type)}
                  <div>
                    <div className="font-medium text-gray-900">
                      v{version.version}
                      {index === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                    <div className="text-sm text-gray-600">{version.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">{version.author}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(version.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Changes Summary */}
              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{version.stats.additions} additions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{version.stats.deletions} deletions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{version.stats.modifications} modifications</span>
                </div>
              </div>

              {/* Actions */}
              {index !== 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRevert(version.id)
                    }}
                    className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Revert to this version
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const CollaborationTools = ({ collaborators, permissions, onUpdatePermissions, onInvite }) => {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer',
    message: ''
  })

  const permissionLevels = {
    owner: {
      name: 'Owner',
      description: 'Full access to all features and settings',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <ShieldCheckIcon className="w-4 h-4" />
    },
    editor: {
      name: 'Editor',
      description: 'Can edit and submit changes for approval',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <PencilSquareIcon className="w-4 h-4" />
    },
    reviewer: {
      name: 'Reviewer',
      description: 'Can review and approve/reject changes',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircleIcon className="w-4 h-4" />
    },
    viewer: {
      name: 'Viewer',
      description: 'Can view and comment on changes',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <EyeIcon className="w-4 h-4" />
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    try {
      await onInvite(inviteForm)
      setInviteForm({ email: '', role: 'viewer', message: '' })
      setShowInviteModal(false)
    } catch (error) {
      console.error('Error sending invite:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Collaborators List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Team Collaborators</h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="space-y-4">
            {collaborators.map(collaborator => {
              const permission = permissionLevels[collaborator.role]
              
              return (
                <div key={collaborator.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {collaborator.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{collaborator.name}</div>
                      <div className="text-sm text-gray-600">{collaborator.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${
                      permission.color
                    }`}>
                      {permission.icon}
                      <span>{permission.name}</span>
                    </div>
                    
                    <select
                      value={collaborator.role}
                      onChange={(e) => onUpdatePermissions(collaborator.id, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={collaborator.role === 'owner'}
                    >
                      {Object.entries(permissionLevels).map(([key, level]) => (
                        <option key={key} value={key} disabled={key === 'owner'}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Permission Matrix</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Permission</th>
                  {Object.entries(permissionLevels).map(([key, level]) => (
                    <th key={key} className="text-center py-3 px-4">
                      <div className="flex flex-col items-center space-y-1">
                        {level.icon}
                        <span className="text-sm font-medium">{level.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { name: 'View customizations', owner: true, editor: true, reviewer: true, viewer: true },
                  { name: 'Edit settings', owner: true, editor: true, reviewer: false, viewer: false },
                  { name: 'Submit for approval', owner: true, editor: true, reviewer: false, viewer: false },
                  { name: 'Approve/reject changes', owner: true, editor: false, reviewer: true, viewer: false },
                  { name: 'Deploy to production', owner: true, editor: false, reviewer: false, viewer: false },
                  { name: 'Manage team members', owner: true, editor: false, reviewer: false, viewer: false },
                  { name: 'Version control', owner: true, editor: true, reviewer: true, viewer: true },
                  { name: 'Export settings', owner: true, editor: true, reviewer: true, viewer: true }
                ].map((permission, index) => (
                  <tr key={index}>
                    <td className="py-3 px-4 font-medium text-gray-900">{permission.name}</td>
                    {Object.keys(permissionLevels).map(role => (
                      <td key={role} className="py-3 px-4 text-center">
                        {permission[role] ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <form onSubmit={handleInvite}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="colleague@barbershop.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(permissionLevels).filter(([key]) => key !== 'owner').map(([key, level]) => (
                        <option key={key} value={key}>{level.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {permissionLevels[inviteForm.role].description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      value={inviteForm.message}
                      onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Welcome to our team! Looking forward to collaborating..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const ActivityFeed = ({ activities }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'edit': return <PencilSquareIcon className="w-5 h-5 text-blue-600" />
      case 'approve': return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'reject': return <XCircleIcon className="w-5 h-5 text-red-600" />
      case 'comment': return <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
      case 'deploy': return <PlayIcon className="w-5 h-5 text-indigo-600" />
      case 'invite': return <UserGroupIcon className="w-5 h-5 text-yellow-600" />
      default: return <DocumentTextIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'edit': return 'border-blue-200'
      case 'approve': return 'border-green-200'
      case 'reject': return 'border-red-200'
      case 'comment': return 'border-purple-200'
      case 'deploy': return 'border-indigo-200'
      case 'invite': return 'border-yellow-200'
      default: return 'border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Feed</h3>
        
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className={`flex items-start space-x-4 p-4 border-l-4 rounded-r-lg ${
              getActivityColor(activity.type)
            } bg-gray-50`}>
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
                {activity.details && (
                  <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                )}
                {activity.changes && (
                  <div className="mt-2 space-y-1">
                    {activity.changes.map((change, idx) => (
                      <div key={idx} className="text-xs text-gray-500">
                        {change.field}: <span className="line-through text-red-500">{change.from}</span> → <span className="text-green-600">{change.to}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WorkflowCollaboration() {
  const { user: _user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState([])
  const [versions, setVersions] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [activities, setActivities] = useState([])
  const [activeTab, setActiveTab] = useState('workflows')
  const [message, setMessage] = useState({ type: '', text: '' })

  const _supabase = createClient()

  // Mock data
  const mockData = useMemo(() => ({
    workflows: [
      {
        id: 'wf_1',
        title: 'Color Scheme Update',
        description: 'Update primary color scheme to match new branding guidelines',
        type: 'branding',
        status: 'pending',
        submitter: { name: 'John Barber', id: 'user_1' },
        reviewers: [
          { name: 'Sarah Manager', id: 'user_2', status: 'pending' },
          { name: 'Mike Owner', id: 'user_3', status: 'pending' }
        ],
        created_at: '2024-01-15T10:00:00Z',
        changes: [
          { field: 'Primary Color', from: '#3B82F6', to: '#1E40AF' },
          { field: 'Accent Color', from: '#F59E0B', to: '#D97706' }
        ],
        comments: [
          { author: 'Sarah Manager', text: 'Looks good, but can we make it slightly lighter?', timestamp: '2024-01-15T11:00:00Z' }
        ]
      },
      {
        id: 'wf_2',
        title: 'Service Menu Restructure',
        description: 'Reorganize service categories for better user experience',
        type: 'content',
        status: 'approved',
        submitter: { name: 'Lisa Editor', id: 'user_4' },
        reviewers: [
          { name: 'Mike Owner', id: 'user_3', status: 'approved' }
        ],
        created_at: '2024-01-14T15:30:00Z',
        changes: [
          { field: 'Categories', from: '5 categories', to: '3 streamlined categories' }
        ]
      }
    ],
    versions: [
      {
        id: 'v_1',
        version: '2.1.0',
        type: 'minor',
        description: 'Updated color scheme and improved mobile responsiveness',
        author: 'John Barber',
        created_at: '2024-01-15T14:00:00Z',
        stats: { additions: 15, deletions: 8, modifications: 12 }
      },
      {
        id: 'v_2',
        version: '2.0.1',
        type: 'patch',
        description: 'Fixed booking form validation bug',
        author: 'Sarah Manager',
        created_at: '2024-01-12T09:15:00Z',
        stats: { additions: 3, deletions: 1, modifications: 5 }
      },
      {
        id: 'v_3',
        version: '2.0.0',
        type: 'major',
        description: 'Major redesign with new template system',
        author: 'Mike Owner',
        created_at: '2024-01-10T16:45:00Z',
        stats: { additions: 142, deletions: 89, modifications: 76 }
      }
    ],
    collaborators: [
      {
        id: 'user_3',
        name: 'Mike Owner',
        email: 'mike@barbershop.com',
        role: 'owner',
        avatar: null
      },
      {
        id: 'user_2',
        name: 'Sarah Manager',
        email: 'sarah@barbershop.com',
        role: 'reviewer',
        avatar: null
      },
      {
        id: 'user_1',
        name: 'John Barber',
        email: 'john@barbershop.com',
        role: 'editor',
        avatar: null
      },
      {
        id: 'user_4',
        name: 'Lisa Editor',
        email: 'lisa@barbershop.com',
        role: 'editor',
        avatar: null
      }
    ],
    activities: [
      {
        type: 'approve',
        user: 'Mike Owner',
        action: 'approved workflow',
        details: 'Service Menu Restructure',
        timestamp: '2024-01-15T16:30:00Z'
      },
      {
        type: 'comment',
        user: 'Sarah Manager',
        action: 'commented on',
        details: 'Color Scheme Update: "Looks good, but can we make it slightly lighter?"',
        timestamp: '2024-01-15T11:00:00Z'
      },
      {
        type: 'edit',
        user: 'John Barber',
        action: 'submitted changes for review',
        details: 'Color Scheme Update',
        timestamp: '2024-01-15T10:00:00Z',
        changes: [
          { field: 'Primary Color', from: '#3B82F6', to: '#1E40AF' }
        ]
      },
      {
        type: 'deploy',
        user: 'Mike Owner',
        action: 'deployed to production',
        details: 'Version 2.0.1 changes are now live',
        timestamp: '2024-01-12T10:00:00Z'
      },
      {
        type: 'invite',
        user: 'Sarah Manager',
        action: 'invited new team member',
        details: 'Lisa Editor joined as Editor',
        timestamp: '2024-01-11T14:20:00Z'
      }
    ]
  }), [])

  useEffect(() => {
    if (user) {
      // Simulate loading data
      setTimeout(() => {
        setWorkflows(mockData.workflows)
        setVersions(mockData.versions)
        setCollaborators(mockData.collaborators)
        setActivities(mockData.activities)
        setLoading(false)
      }, 1000)
    }
  }, [user, mockData])

  const handleWorkflowAction = async (action, workflowId) => {
    try {

      switch (action) {
        case 'approve':
          setWorkflows(prev => prev.map(wf => 
            wf.id === workflowId ? { ...wf, status: 'approved' } : wf
          ))
          setMessage({ type: 'success', text: 'Workflow approved successfully!' })
          break
        case 'reject':
          setWorkflows(prev => prev.map(wf => 
            wf.id === workflowId ? { ...wf, status: 'rejected' } : wf
          ))
          setMessage({ type: 'success', text: 'Workflow rejected.' })
          break
        case 'deploy':
          setMessage({ type: 'success', text: 'Changes deployed to production!' })
          break
        default:
          setMessage({ type: 'info', text: `${action} action triggered for workflow ${workflowId}` })
      }
    } catch (error) {
      console.error('Error handling workflow action:', error)
      setMessage({ type: 'error', text: 'Error performing action.' })
    }
  }

  const handleVersionRevert = async (versionId) => {
    try {
      
      setMessage({ type: 'success', text: 'Reverted to selected version successfully!' })
    } catch (error) {
      console.error('Error reverting version:', error)
      setMessage({ type: 'error', text: 'Error reverting version.' })
    }
  }

  const handleVersionCompare = async (versionIds) => {
    try {
      
      setMessage({ type: 'info', text: 'Version comparison feature coming soon!' })
    } catch (error) {
      console.error('Error comparing versions:', error)
      setMessage({ type: 'error', text: 'Error comparing versions.' })
    }
  }

  const handleUpdatePermissions = async (userId, newRole) => {
    try {
      setCollaborators(prev => prev.map(collab => 
        collab.id === userId ? { ...collab, role: newRole } : collab
      ))
      setMessage({ type: 'success', text: 'Permissions updated successfully!' })
    } catch (error) {
      console.error('Error updating permissions:', error)
      setMessage({ type: 'error', text: 'Error updating permissions.' })
    }
  }

  const handleInviteCollaborator = async (inviteData) => {
    try {
      const newCollaborator = {
        id: `user_${Date.now()}`,
        name: inviteData.email.split('@')[0],
        email: inviteData.email,
        role: inviteData.role,
        avatar: null
      }
      
      setCollaborators(prev => [...prev, newCollaborator])
      setMessage({ type: 'success', text: `Invite sent to ${inviteData.email}!` })
    } catch (error) {
      console.error('Error inviting collaborator:', error)
      setMessage({ type: 'error', text: 'Error sending invite.' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow & Collaboration</h2>
          <p className="text-gray-600 mt-1">
            Manage approvals, version control, and team collaboration for your customizations
          </p>
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{workflows.length}</div>
            <div className="text-sm text-gray-600">Active Workflows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{collaborators.length}</div>
            <div className="text-sm text-gray-600">Team Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{versions.length}</div>
            <div className="text-sm text-gray-600">Versions</div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 text-current hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'workflows', name: 'Approval Workflows', icon: ClipboardDocumentListIcon },
            { id: 'versions', name: 'Version Control', icon: ArchiveBoxIcon },
            { id: 'collaboration', name: 'Team Collaboration', icon: UserGroupIcon },
            { id: 'activity', name: 'Activity Feed', icon: BellIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'workflows' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {workflows.map(workflow => (
                <ApprovalWorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onAction={handleWorkflowAction}
                />
              ))}
            </div>
            {workflows.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <ClipboardDocumentListIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
                <p className="text-gray-600">Workflows will appear here when team members submit changes for approval.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <VersionControlPanel
            versions={versions}
            onRevert={handleVersionRevert}
            onCompare={handleVersionCompare}
          />
        )}

        {activeTab === 'collaboration' && (
          <CollaborationTools
            collaborators={collaborators}
            onUpdatePermissions={handleUpdatePermissions}
            onInvite={handleInviteCollaborator}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityFeed activities={activities} />
        )}
      </div>
    </div>
  )
}