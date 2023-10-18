import pino from 'pino';

export default pino({
    level: process.env.PINO_LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
          return { level: label.toUpperCase() }
        },
        bindings: () => {},
    },
    timestamp: () => `,"time":"${new Date(Date.now()).toLocaleString()}"`,
});