const { initDatabase, DB_PATH } = require("../db");

initDatabase();
console.log("База данных готова:", DB_PATH);
console.log("Администратор: логин Admin, пароль KorokNET");
