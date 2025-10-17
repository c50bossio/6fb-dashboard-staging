/**
 * Conversation Message Format Adapter
 *
 * Converts between AI Widget and Command Center message formats
 * for seamless conversation syncing across interfaces.
 *
 * Widget Format:
 * {
 *   id: number,
 *   role: 'user' | 'assistant',
 *   content: string,
 *   timestamp: string,
 *   data: object (optional),
 *   error: boolean (optional)
 * }
 *
 * Command Center Format:
 * {
 *   id: string,
 *   text: string,
 *   isUser: boolean,
 *   agent: {
 *     name: string,
 *     personality: string,
 *     confidence: number,
 *     recommendations: array,
 *     action_items: array
 *   },
 *   timestamp: string,
 *   isLoading: boolean (optional),
 *   isError: boolean (optional)
 * }
 *
 * Unified Format (Internal):
 * {
 *   id: string,
 *   role: 'user' | 'assistant',
 *   content: string,
 *   timestamp: string,
 *   agent: object (optional),
 *   metadata: object (optional)
 * }
 */

/**
 * Convert Widget message format to Unified format
 * @param {object} widgetMessage - Message in Widget format
 * @returns {object} - Message in Unified format
 */
export function widgetToUnified(widgetMessage) {
  if (!widgetMessage) {
    throw new Error('Widget message is required');
  }

  return {
    id: String(widgetMessage.id),
    role: widgetMessage.role, // 'user' or 'assistant'
    content: widgetMessage.content || '',
    timestamp: widgetMessage.timestamp || new Date().toISOString(),
    agent: widgetMessage.role === 'assistant' ? {
      name: 'AI Assistant',
      personality: 'strategic_mindset',
      confidence: 0.8
    } : null,
    metadata: {
      source: 'widget',
      data: widgetMessage.data || {},
      error: widgetMessage.error || false
    }
  };
}

/**
 * Convert Command Center message format to Unified format
 * @param {object} commandCenterMessage - Message in Command Center format
 * @returns {object} - Message in Unified format
 */
export function commandCenterToUnified(commandCenterMessage) {
  if (!commandCenterMessage) {
    throw new Error('Command Center message is required');
  }

  return {
    id: String(commandCenterMessage.id),
    role: commandCenterMessage.isUser ? 'user' : 'assistant',
    content: commandCenterMessage.text || '',
    timestamp: commandCenterMessage.timestamp || new Date().toISOString(),
    agent: commandCenterMessage.agent || null,
    metadata: {
      source: 'command-center',
      isLoading: commandCenterMessage.isLoading || false,
      isError: commandCenterMessage.isError || false,
      canRetry: commandCenterMessage.canRetry || false
    }
  };
}

/**
 * Convert Unified format to Widget message format
 * @param {object} unifiedMessage - Message in Unified format
 * @returns {object} - Message in Widget format
 */
export function unifiedToWidget(unifiedMessage) {
  if (!unifiedMessage) {
    throw new Error('Unified message is required');
  }

  return {
    id: Number(unifiedMessage.id) || Date.now(),
    role: unifiedMessage.role, // 'user' or 'assistant'
    content: unifiedMessage.content,
    timestamp: unifiedMessage.timestamp,
    data: unifiedMessage.metadata?.data || {},
    error: unifiedMessage.metadata?.error || false
  };
}

/**
 * Convert Unified format to Command Center message format
 * @param {object} unifiedMessage - Message in Unified format
 * @returns {object} - Message in Command Center format
 */
export function unifiedToCommandCenter(unifiedMessage) {
  if (!unifiedMessage) {
    throw new Error('Unified message is required');
  }

  return {
    id: String(unifiedMessage.id),
    text: unifiedMessage.content,
    isUser: unifiedMessage.role === 'user',
    agent: unifiedMessage.agent || (unifiedMessage.role === 'assistant' ? {
      name: 'AI Assistant',
      personality: 'strategic_mindset',
      confidence: 0.8,
      recommendations: [],
      action_items: []
    } : null),
    timestamp: unifiedMessage.timestamp,
    isLoading: unifiedMessage.metadata?.isLoading || false,
    isError: unifiedMessage.metadata?.isError || false,
    canRetry: unifiedMessage.metadata?.canRetry || false
  };
}

/**
 * Convert Widget conversation (array of messages) to Unified format
 * @param {array} widgetConversation - Array of Widget messages
 * @returns {array} - Array of Unified messages
 */
export function widgetConversationToUnified(widgetConversation) {
  if (!Array.isArray(widgetConversation)) {
    throw new Error('Widget conversation must be an array');
  }

  return widgetConversation.map(msg => widgetToUnified(msg));
}

/**
 * Convert Command Center conversation (array of messages) to Unified format
 * @param {array} commandCenterConversation - Array of Command Center messages
 * @returns {array} - Array of Unified messages
 */
export function commandCenterConversationToUnified(commandCenterConversation) {
  if (!Array.isArray(commandCenterConversation)) {
    throw new Error('Command Center conversation must be an array');
  }

  return commandCenterConversation.map(msg => commandCenterToUnified(msg));
}

/**
 * Convert Unified conversation to Widget format
 * @param {array} unifiedConversation - Array of Unified messages
 * @returns {array} - Array of Widget messages
 */
export function unifiedConversationToWidget(unifiedConversation) {
  if (!Array.isArray(unifiedConversation)) {
    throw new Error('Unified conversation must be an array');
  }

  return unifiedConversation.map(msg => unifiedToWidget(msg));
}

/**
 * Convert Unified conversation to Command Center format
 * @param {array} unifiedConversation - Array of Unified messages
 * @returns {array} - Array of Command Center messages
 */
export function unifiedConversationToCommandCenter(unifiedConversation) {
  if (!Array.isArray(unifiedConversation)) {
    throw new Error('Unified conversation must be an array');
  }

  return unifiedConversation.map(msg => unifiedToCommandCenter(msg));
}

/**
 * Direct conversion from Widget to Command Center format
 * @param {array} widgetConversation - Array of Widget messages
 * @returns {array} - Array of Command Center messages
 */
export function widgetToCommandCenter(widgetConversation) {
  const unified = widgetConversationToUnified(widgetConversation);
  return unifiedConversationToCommandCenter(unified);
}

/**
 * Direct conversion from Command Center to Widget format
 * @param {array} commandCenterConversation - Array of Command Center messages
 * @returns {array} - Array of Widget messages
 */
export function commandCenterToWidget(commandCenterConversation) {
  const unified = commandCenterConversationToUnified(commandCenterConversation);
  return unifiedConversationToWidget(unified);
}

/**
 * Validate that a message conforms to Widget format
 * @param {object} message - Message to validate
 * @returns {boolean} - True if valid
 */
export function isValidWidgetMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    (typeof message.id === 'number' || typeof message.id === 'string') &&
    ['user', 'assistant'].includes(message.role) &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'string'
  );
}

/**
 * Validate that a message conforms to Command Center format
 * @param {object} message - Message to validate
 * @returns {boolean} - True if valid
 */
export function isValidCommandCenterMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    (typeof message.id === 'number' || typeof message.id === 'string') &&
    typeof message.text === 'string' &&
    typeof message.isUser === 'boolean' &&
    typeof message.timestamp === 'string'
  );
}

/**
 * Auto-detect message format and convert to Unified format
 * @param {object} message - Message in unknown format
 * @returns {object} - Message in Unified format
 */
export function autoConvertToUnified(message) {
  if (!message) {
    throw new Error('Message is required');
  }

  // Check if it's Widget format (has 'role' and 'content')
  if (message.role && message.content !== undefined) {
    return widgetToUnified(message);
  }

  // Check if it's Command Center format (has 'isUser' and 'text')
  if (message.isUser !== undefined && message.text !== undefined) {
    return commandCenterToUnified(message);
  }

  // Check if it's already Unified format
  if (message.role && message.content !== undefined && message.metadata) {
    return message;
  }

  throw new Error('Unable to detect message format. Message must be in Widget, Command Center, or Unified format.');
}

/**
 * Merge conversations from Widget and Command Center, removing duplicates
 * @param {array} widgetConversation - Array of Widget messages
 * @param {array} commandCenterConversation - Array of Command Center messages
 * @returns {array} - Merged array of Unified messages, sorted by timestamp
 */
export function mergeConversations(widgetConversation = [], commandCenterConversation = []) {
  // Convert both to unified format
  const widgetUnified = widgetConversationToUnified(widgetConversation);
  const commandCenterUnified = commandCenterConversationToUnified(commandCenterConversation);

  // Combine both arrays
  const combined = [...widgetUnified, ...commandCenterUnified];

  // Remove duplicates based on ID and timestamp
  const unique = [];
  const seen = new Set();

  for (const message of combined) {
    const key = `${message.id}-${message.timestamp}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(message);
    }
  }

  // Sort by timestamp (oldest first)
  unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return unique;
}

/**
 * Get conversation statistics
 * @param {array} conversation - Array of messages (any format)
 * @returns {object} - Statistics about the conversation
 */
export function getConversationStats(conversation) {
  if (!Array.isArray(conversation)) {
    return null;
  }

  // Auto-convert to unified format for analysis
  const unified = conversation.map(msg => {
    try {
      return autoConvertToUnified(msg);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const userMessages = unified.filter(msg => msg.role === 'user');
  const assistantMessages = unified.filter(msg => msg.role === 'assistant');

  return {
    totalMessages: unified.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    firstMessageTimestamp: unified[0]?.timestamp,
    lastMessageTimestamp: unified[unified.length - 1]?.timestamp,
    sources: {
      widget: unified.filter(msg => msg.metadata?.source === 'widget').length,
      commandCenter: unified.filter(msg => msg.metadata?.source === 'command-center').length
    }
  };
}

// Default export with all functions
export default {
  // Single message conversions
  widgetToUnified,
  commandCenterToUnified,
  unifiedToWidget,
  unifiedToCommandCenter,

  // Conversation (array) conversions
  widgetConversationToUnified,
  commandCenterConversationToUnified,
  unifiedConversationToWidget,
  unifiedConversationToCommandCenter,

  // Direct cross-conversions
  widgetToCommandCenter,
  commandCenterToWidget,

  // Validation
  isValidWidgetMessage,
  isValidCommandCenterMessage,

  // Auto-detection
  autoConvertToUnified,

  // Utilities
  mergeConversations,
  getConversationStats
};
