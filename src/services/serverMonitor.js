const os = require('os');
const { formatBytes, formatDuration } = require('../utils/format');

function getServerStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  
  const pingStart = performance.now();
  // Simulate internal ping logic just by measuring performance.now
  const pingEnd = performance.now();
  const pingInternalMs = (pingEnd - pingStart).toFixed(2);

  return {
    ram: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      percent: ((usedMem / totalMem) * 100).toFixed(2)
    },
    cpu: {
      load1m: loadAvg[0].toFixed(2),
      load5m: loadAvg[1].toFixed(2),
      load15m: loadAvg[2].toFixed(2)
    },
    os: {
      platform: os.platform(),
      arch: os.arch(),
      uptime: formatDuration(os.uptime() * 1000)
    },
    process: {
      uptime: formatDuration(process.uptime() * 1000),
      version: process.version,
      pid: process.pid,
      memory: formatBytes(process.memoryUsage().rss)
    },
    ping: `${pingInternalMs} ms`
  };
}

module.exports = {
  getServerStats
};
