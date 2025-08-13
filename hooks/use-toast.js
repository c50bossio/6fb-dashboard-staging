import { useState, useEffect, useCallback } from 'react'

let listeners = []
let memoryState = { toasts: [] }

function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, 5), // Max 5 toasts
      }
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, open: false } : t
        ),
      }
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

let toastCount = 0

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_VALUE
  return toastCount.toString()
}

const toastTimeouts = new Map()

export function toast(props) {
  const id = genId()
  const duration = props.duration || 5000

  const { title, description, action, ...rest } = props

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      id,
      title,
      description,
      action,
      open: true,
      ...rest,
    },
  })

  if (duration > 0) {
    const timeout = setTimeout(() => {
      dismiss(id)
    }, duration)

    toastTimeouts.set(id, timeout)
  }

  return {
    id,
    dismiss: () => dismiss(id),
    update: (props) => update(id, props),
  }
}

function dismiss(toastId) {
  dispatch({ type: 'DISMISS_TOAST', toastId })

  const timeout = toastTimeouts.get(toastId)
  if (timeout) {
    clearTimeout(timeout)
    toastTimeouts.delete(toastId)
  }

  setTimeout(() => {
    dispatch({ type: 'REMOVE_TOAST', toastId })
  }, 300) // Animation duration
}

function update(toastId, props) {
  dispatch({
    type: 'UPDATE_TOAST',
    toast: { id: toastId, ...props },
  })
}

export function useToast() {
  const [state, setState] = useState(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss,
  }
}