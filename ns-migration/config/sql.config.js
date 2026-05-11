export const sqlConfig = {
  host: process.env.SQL_HOST ?? "localhost",
  port: parseInt(process.env.SQL_PORT ?? "3306", 10),
  user: process.env.SQL_USER ?? "root",
  password: process.env.SQL_PASSWORD ?? "",
  database: process.env.SQL_DATABASE ?? "legacy_db",
  charset: "utf8mb3",
  connectionLimit: parseInt(process.env.SQL_CONNECTION_LIMIT ?? "5", 10),
};
