function log(level, msg, err) {
  console.log(`[${level}] ${new Date().toISOString()} — ${msg}`);
  if (err) console.log(err.stack ?? String(err));
}

export const logger = {
  info:  (msg, err) => log('INFO',  msg, err),
  warn:  (msg, err) => log('WARN',  msg, err),
  error: (msg, err) => log('ERROR', msg, err),
};
