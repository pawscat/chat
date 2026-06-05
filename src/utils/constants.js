module.exports = {
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin'
  },
  TARGETS: {
    USERS: 'users',
    GROUPS: 'groups',
    CHANNELS: 'channels',
    ALL: 'all'
  },
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
  },
  BROADCAST_STATUS: {
    RUNNING: 'running',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed'
  },
  LOG_TYPES: {
    INFO: 'info',
    ERROR: 'error',
    SECURITY: 'security',
    API: 'api',
    BROADCAST: 'broadcast'
  }
};
