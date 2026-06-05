module.exports = {
  telegram: {
    botToken: "",
    botUsername: ""
  },

  youApi: {
    apiKey: "",
    mode: "research",
    researchEndpoint: "https://api.you.com/v1/research",
    searchEndpoint: "https://ydc-index.io/v1/search",
    timeoutMs: 30000
  },

  web: {
    enabled: true,
    port: 3000,
    baseUrl: "http://localhost:3000",
    sessionSecret: ""
  },

  admin: {
    superAdminId: "",
    multipleAdmin: true,
    allowOperatorEditSettings: false
  },

  bot: {
    name: "You AI Bot",
    maintenanceMode: false,
    allowPrivateAi: true,
    allowGroupAi: true,
    userDailyLimit: 50,
    broadcastDelayMs: 700,
    apiLimitMonthly: 1000,
    maxTelegramMessageLength: 3900,
    welcomeMessage: "Halo, saya bot AI. Kirim pertanyaan kamu sekarang."
  },

  broadcast: {
    enabled: true,
    delayMs: 700,
    realtimeProgress: true,
    updateIntervalMs: 1000,
    batchUpdateEvery: 5
  },

  storage: {
    dataPath: "./data",
    backupEnabled: true,
    backupOnStart: true,
    backupBeforeSettingsChange: true
  },

  security: {
    enableBlacklist: true,
    enableRateLimit: true,
    maxRequestPerMinute: 10,
    dashboardSessionMaxAgeMs: 86400000
  },

  logging: {
    enabled: true,
    maxLogs: 1000
  }
};
