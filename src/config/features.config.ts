export const featuresConfig = {
  // File management features (used by useUploadConfig)
  fileManager: {
    enabled: true,
    storage: 'r2',
    thumbnails: true,
    imageProcessing: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
  },

  // Admin features (used by useAdminConfig → useIsAdmin)
  admin: {
    enabled: true,
    userManagement: true,
    systemSettings: true,
    analytics: true,
  },
};
