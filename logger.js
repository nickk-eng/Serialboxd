const winston = require("winston");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  defaultMeta: { service: "serialboxd-app" },
  transports: [
    // Salva logs de nível 'error' no arquivo `error.log`
    new winston.transports.File({ filename: "error.log", level: "error" }),
    // Salva todos os logs no arquivo `combined.log`
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Se não estivermos em produção, também exibir os logs no console
// com um formato mais simples e colorido.
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    })
  );
}

module.exports = logger;
