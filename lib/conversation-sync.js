/**
 * Conversation Sync Service
 *
 * Handles bidirectional conversation synchronization between
 * AI Widget and Command Center interfaces.
 *
 * Features:
 * - One-way sync (Widget → Command Center or vice versa)
 * - Two-way merge sync (combines both sources)
 * - Duplicate detection and removal
 * - User-scoped storage keys for security
 * - Automatic format conversion using conversation-adapter
 */

import conversationAdapter from './conversation-adapter.js';

/**
 * ConversationSync class handles all syncing operations
 */
export class ConversationSync {
  constructor(userId, barbershopContext = null) {
    if (!userId) {
      throw new Error('User ID is required for conversation sync');
    }

    this.userId = userId;
    this.barbershopContext = barbershopContext;

    // Storage keys
    this.widgetKey = this._getWidgetStorageKey();
    this.commandCenterKey = this._getCommandCenterStorageKey();
  }

  /**
   * Get user-scoped Widget storage key
   * @returns {string} - Storage key for Widget conversations
   * @private
   */
  _getWidgetStorageKey() {
    if (this.barbershopContext) {
      return `ai-widget-conversation-${this.userId}-${this.barbershopContext}`;
    }
    return `ai-widget-conversation-${this.userId}`;
  }

  /**
   * Get user-scoped Command Center storage key
   * @returns {string} - Storage key for Command Center conversations
   * @private
   */
  _getCommandCenterStorageKey() {
    return `ai-conversations-${this.userId}`;
  }

  /**
   * Load Widget conversation from localStorage
   * @returns {array} - Array of Widget messages
   */
  loadWidgetConversation() {
    try {
      const stored = localStorage.getItem(this.widgetKey);
      if (!stored) {
        console.log('[ConversationSync] No Widget conversation found');
        return [];
      }

      const conversation = JSON.parse(stored);

      // Widget stores as a flat array of messages
      return Array.isArray(conversation) ? conversation : [];
    } catch (error) {
      console.error('[ConversationSync] Error loading Widget conversation:', error);
      return [];
    }
  }

  /**
   * Load Command Center conversations from localStorage
   * @returns {array} - Array of conversations (each with messages array)
   */
  loadCommandCenterConversations() {
    try {
      const stored = localStorage.getItem(this.commandCenterKey);
      if (!stored) {
        console.log('[ConversationSync] No Command Center conversations found');
        return [];
      }

      const conversations = JSON.parse(stored);

      // Command Center stores as array of conversation objects
      return Array.isArray(conversations) ? conversations : [];
    } catch (error) {
      console.error('[ConversationSync] Error loading Command Center conversations:', error);
      return [];
    }
  }

  /**
   * Save Widget conversation to localStorage
   * @param {array} conversation - Array of Widget messages
   */
  saveWidgetConversation(conversation) {
    try {
      if (!Array.isArray(conversation)) {
        throw new Error('Widget conversation must be an array');
      }

      localStorage.setItem(this.widgetKey, JSON.stringify(conversation));
      console.log(`[ConversationSync] Saved ${conversation.length} Widget messages`);
    } catch (error) {
      console.error('[ConversationSync] Error saving Widget conversation:', error);
      throw error;
    }
  }

  /**
   * Save Command Center conversations to localStorage
   * @param {array} conversations - Array of conversation objects
   */
  saveCommandCenterConversations(conversations) {
    try {
      if (!Array.isArray(conversations)) {
        throw new Error('Command Center conversations must be an array');
      }

      localStorage.setItem(this.commandCenterKey, JSON.stringify(conversations));
      console.log(`[ConversationSync] Saved ${conversations.length} Command Center conversations`);
    } catch (error) {
      console.error('[ConversationSync] Error saving Command Center conversations:', error);
      throw error;
    }
  }

  /**
   * Sync current Widget conversation to Command Center
   * Creates a new conversation in Command Center with Widget messages
   * @returns {object} - Sync result with success status and conversation ID
   */
  syncWidgetToCommandCenter() {
    try {
      console.log('[ConversationSync] Starting Widget → Command Center sync...');

      // Load Widget conversation
      const widgetConversation = this.loadWidgetConversation();

      if (widgetConversation.length === 0) {
        return {
          success: true,
          message: 'No Widget conversation to sync',
          conversationId: null
        };
      }

      // Convert Widget messages to Command Center format
      const commandCenterMessages = conversationAdapter.widgetToCommandCenter(widgetConversation);

      // Load existing Command Center conversations
      const existingConversations = this.loadCommandCenterConversations();

      // Create new conversation object
      const newConversation = {
        id: `synced-${Date.now()}`,
        title: this._generateConversationTitle(widgetConversation),
        messages: commandCenterMessages,
        created_at: widgetConversation[0]?.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced_from: 'widget'
      };

      // Add to beginning of conversations array
      const updatedConversations = [newConversation, ...existingConversations];

      // Save back to localStorage
      this.saveCommandCenterConversations(updatedConversations);

      console.log(`[ConversationSync] ✅ Synced ${widgetConversation.length} messages to Command Center`);

      return {
        success: true,
        message: `Synced ${widgetConversation.length} messages`,
        conversationId: newConversation.id,
        messageCount: widgetConversation.length
      };
    } catch (error) {
      console.error('[ConversationSync] Widget → Command Center sync failed:', error);
      return {
        success: false,
        message: error.message,
        conversationId: null
      };
    }
  }

  /**
   * Sync specific Command Center conversation to Widget
   * Replaces current Widget conversation with Command Center conversation
   * @param {string} conversationId - ID of Command Center conversation to sync
   * @returns {object} - Sync result with success status
   */
  syncCommandCenterToWidget(conversationId) {
    try {
      console.log(`[ConversationSync] Starting Command Center → Widget sync for conversation ${conversationId}...`);

      // Load Command Center conversations
      const commandCenterConversations = this.loadCommandCenterConversations();

      // Find the specific conversation
      const conversation = commandCenterConversations.find(c => c.id === conversationId);

      if (!conversation) {
        return {
          success: false,
          message: `Conversation ${conversationId} not found`
        };
      }

      if (!conversation.messages || conversation.messages.length === 0) {
        return {
          success: false,
          message: 'Conversation has no messages'
        };
      }

      // Convert Command Center messages to Widget format
      const widgetMessages = conversationAdapter.commandCenterToWidget(conversation.messages);

      // Save to Widget storage (replaces existing conversation)
      this.saveWidgetConversation(widgetMessages);

      console.log(`[ConversationSync] ✅ Synced ${widgetMessages.length} messages to Widget`);

      return {
        success: true,
        message: `Synced ${widgetMessages.length} messages`,
        messageCount: widgetMessages.length
      };
    } catch (error) {
      console.error('[ConversationSync] Command Center → Widget sync failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Merge Widget and Command Center conversations (two-way sync)
   * Combines messages from both sources, removes duplicates, and updates both storages
   * @returns {object} - Merge result with statistics
   */
  mergeConversations() {
    try {
      console.log('[ConversationSync] Starting bidirectional merge...');

      // Load both conversations
      const widgetConversation = this.loadWidgetConversation();
      const commandCenterConversations = this.loadCommandCenterConversations();

      // Get latest Command Center conversation for merging
      const latestCommandCenterConv = commandCenterConversations[0];
      const commandCenterMessages = latestCommandCenterConv?.messages || [];

      // Merge using adapter
      const mergedUnified = conversationAdapter.mergeConversations(
        widgetConversation,
        commandCenterMessages
      );

      // Convert merged back to both formats
      const mergedWidget = conversationAdapter.unifiedConversationToWidget(mergedUnified);
      const mergedCommandCenter = conversationAdapter.unifiedConversationToCommandCenter(mergedUnified);

      // Update Widget storage
      this.saveWidgetConversation(mergedWidget);

      // Update Command Center storage
      if (latestCommandCenterConv) {
        // Update existing conversation
        latestCommandCenterConv.messages = mergedCommandCenter;
        latestCommandCenterConv.updated_at = new Date().toISOString();
        this.saveCommandCenterConversations(commandCenterConversations);
      } else {
        // Create new conversation
        const newConversation = {
          id: `merged-${Date.now()}`,
          title: this._generateConversationTitle(mergedWidget),
          messages: mergedCommandCenter,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          synced_from: 'merge'
        };
        this.saveCommandCenterConversations([newConversation]);
      }

      console.log(`[ConversationSync] ✅ Merged conversations: ${mergedUnified.length} total messages`);

      return {
        success: true,
        message: 'Conversations merged successfully',
        stats: {
          totalMessages: mergedUnified.length,
          widgetOriginal: widgetConversation.length,
          commandCenterOriginal: commandCenterMessages.length,
          duplicatesRemoved: widgetConversation.length + commandCenterMessages.length - mergedUnified.length
        }
      };
    } catch (error) {
      console.error('[ConversationSync] Merge failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Clear Widget conversation
   */
  clearWidgetConversation() {
    try {
      localStorage.removeItem(this.widgetKey);
      console.log('[ConversationSync] Widget conversation cleared');
    } catch (error) {
      console.error('[ConversationSync] Error clearing Widget conversation:', error);
    }
  }

  /**
   * Clear all Command Center conversations
   */
  clearCommandCenterConversations() {
    try {
      localStorage.removeItem(this.commandCenterKey);
      console.log('[ConversationSync] Command Center conversations cleared');
    } catch (error) {
      console.error('[ConversationSync] Error clearing Command Center conversations:', error);
    }
  }

  /**
   * Get sync status and statistics
   * @returns {object} - Status information
   */
  getSyncStatus() {
    const widgetConversation = this.loadWidgetConversation();
    const commandCenterConversations = this.loadCommandCenterConversations();

    return {
      userId: this.userId,
      barbershopContext: this.barbershopContext,
      widget: {
        messageCount: widgetConversation.length,
        lastUpdate: widgetConversation[widgetConversation.length - 1]?.timestamp || null
      },
      commandCenter: {
        conversationCount: commandCenterConversations.length,
        totalMessages: commandCenterConversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0),
        lastUpdate: commandCenterConversations[0]?.updated_at || null
      },
      storageKeys: {
        widget: this.widgetKey,
        commandCenter: this.commandCenterKey
      }
    };
  }

  /**
   * Generate a conversation title from messages
   * @param {array} conversation - Array of messages
   * @returns {string} - Generated title
   * @private
   */
  _generateConversationTitle(conversation) {
    if (!conversation || conversation.length === 0) {
      return 'New Conversation';
    }

    // Find first user message
    const firstUserMessage = conversation.find(msg =>
      msg.role === 'user' || msg.isUser === true
    );

    if (firstUserMessage) {
      const text = firstUserMessage.content || firstUserMessage.text || '';
      return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    }

    return 'New Conversation';
  }
}

/**
 * Factory function to create a ConversationSync instance
 * @param {string} userId - User ID for scoped storage
 * @param {string} barbershopContext - Optional barbershop context
 * @returns {ConversationSync} - Sync service instance
 */
export function createConversationSync(userId, barbershopContext = null) {
  return new ConversationSync(userId, barbershopContext);
}

/**
 * Quick sync function for Widget → Command Center
 * @param {string} userId - User ID
 * @param {string} barbershopContext - Optional barbershop context
 * @returns {object} - Sync result
 */
export function quickSyncToCommandCenter(userId, barbershopContext = null) {
  const sync = new ConversationSync(userId, barbershopContext);
  return sync.syncWidgetToCommandCenter();
}

/**
 * Quick sync function for Command Center → Widget
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID to sync
 * @param {string} barbershopContext - Optional barbershop context
 * @returns {object} - Sync result
 */
export function quickSyncToWidget(userId, conversationId, barbershopContext = null) {
  const sync = new ConversationSync(userId, barbershopContext);
  return sync.syncCommandCenterToWidget(conversationId);
}

// Default export
export default {
  ConversationSync,
  createConversationSync,
  quickSyncToCommandCenter,
  quickSyncToWidget
};
