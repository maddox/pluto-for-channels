const chalk = require('chalk');

class Logger {
  constructor() {
    this.debugMode = process.env.DEBUG === 'true';
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    return new Date().toISOString().slice(11, 19);
  }

  /**
   * Log info message
   */
  info(message, ...args) {
    console.log(
      chalk.blue(`[${this.getTimestamp()}] [INFO]`),
      message,
      ...args
    );
  }

  /**
   * Log success message
   */
  success(message, ...args) {
    console.log(
      chalk.green(`[${this.getTimestamp()}] [SUCCESS]`),
      message,
      ...args
    );
  }

  /**
   * Log warning message
   */
  warn(message, ...args) {
    console.log(
      chalk.yellow(`[${this.getTimestamp()}] [WARN]`),
      message,
      ...args
    );
  }

  /**
   * Log error message
   */
  error(message, ...args) {
    console.error(
      chalk.red(`[${this.getTimestamp()}] [ERROR]`),
      message,
      ...args
    );
  }

  /**
   * Log debug message (only if debug mode is enabled)
   */
  debug(message, ...args) {
    if (this.debugMode) {
      console.log(
        chalk.gray(`[${this.getTimestamp()}] [DEBUG]`),
        message,
        ...args
      );
    }
  }
}

module.exports = new Logger();