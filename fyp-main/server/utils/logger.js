const AuditLog = require('../models/AuditLog.model');

/**
 * Utility to log audit actions in the database.
 * @param {Object} data
 * @param {string|ObjectId} data.actor - User ID
 * @param {string} data.actorRole - User Role
 * @param {string} data.action - Action performed (e.g. 'CREATED', 'UPDATED')
 * @param {string} data.entityType - Type of entity (e.g. 'User', 'Project')
 * @param {string|ObjectId} data.entityId - ID of entity
 * @param {string} data.description - Description of action
 * @param {Object} [data.metadata] - Additional JSON data
 */
exports.logAction = async (data) => {
  try {
    const log = new AuditLog({
      actor: data.actor,
      actorRole: data.actorRole || 'system',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      metadata: data.metadata || {}
    });
    await log.save();
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
};
