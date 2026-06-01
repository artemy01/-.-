const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { getDb, initSchema, seedAdmin } = require("./db");

const PORT = Number(process.env.PORT) || 3000;
const app = express();

const db = getDb();
initSchema(db);
seedAdmin(db);

function json(res, data, code = 200) {
  return res.status(code).json(data);
}

const COURSES = [
  "Основы алгоритмизации и программирования",
  "Основы веб-дизайна",
  "Основы проектирования баз данных",
];

const APPLICATION_STATUSES = ["Новая", "Идет обучение", "Обучение завершено"];

function paymentLabel(type) {
  return type === "cash" ? "Наличными" : "Переводом по номеру телефона";
}

function userHasCompletedCourse(userId) {
  const row = db
    .prepare(
      `SELECT 1 AS ok FROM applications
       WHERE user_id = ? AND status = 'Обучение завершено' LIMIT 1`
    )
    .get(userId);
  return !!row;
}

function getUserIdByLogin(login) {
  const row = db.prepare("SELECT id FROM users WHERE login = ? LIMIT 1").get(login);
  return row ? row.id : null;
}

function requireUser(req, res) {
  const login = req.session.userLogin || "";
  if (!login) {
    json(res, { success: false, message: "Требуется авторизация." }, 401);
    return null;
  }
  return login;
}

function requireAdmin(req, res) {
  if (!req.session.isAdmin) {
    json(res, { success: false, message: "Доступ только для администратора." }, 403);
    return false;
  }
  return true;
}

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "korochki-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.static(__dirname));

// ——— Регистрация ———
app.post("/api/register", (req, res) => {
  const login = String(req.body.login || "").trim();
  const password = String(req.body.password || "");
  const fio = String(req.body.fio || "").trim();
  const phone = String(req.body.phone || "").trim();
  const email = String(req.body.email || "").trim();

  if (!login || !password || !fio || !phone || !email) {
    return json(res, { success: false, message: "Заполните все поля." }, 400);
  }
  if (!/^[A-Za-z0-9]{6,}$/.test(login)) {
    return json(
      res,
      { success: false, message: "Логин: только латиница и цифры, минимум 6 символов." },
      400
    );
  }
  if (password.length < 8) {
    return json(res, { success: false, message: "Пароль должен быть не короче 8 символов." }, 400);
  }
  if (!/^8\([0-9]{3}\)[0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(phone)) {
    return json(
      res,
      { success: false, message: "Неверный формат телефона. Укажите 8(999)999-99-99." },
      400
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, { success: false, message: "Некорректный e-mail." }, 400);
  }
  if (!/^[А-Яа-яЁё\s-]+$/.test(fio)) {
    return json(res, { success: false, message: "ФИО: только кириллица, пробелы и дефис." }, 400);
  }

  const exists = db.prepare("SELECT id FROM users WHERE login = ? LIMIT 1").get(login);
  if (exists) {
    return json(res, { success: false, message: "Пользователь с таким логином уже существует." }, 409);
  }

  const emailExists = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(email);
  if (emailExists) {
    return json(res, { success: false, message: "Пользователь с таким e-mail уже зарегистрирован." }, 409);
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare(
      "INSERT INTO users (login, password_hash, fio, phone, email) VALUES (?, ?, ?, ?, ?)"
    ).run(login, hash, fio, phone, email);
  } catch (err) {
    return json(res, { success: false, message: "Ошибка сохранения пользователя." }, 500);
  }

  return json(res, { success: true, message: "Регистрация успешна." });
});

// ——— Вход ———
app.post("/api/login", (req, res) => {
  const login = String(req.body.login || "").trim();
  const password = String(req.body.password || "");

  if (!login || !password) {
    return json(res, { success: false, message: "Введите логин и пароль." }, 400);
  }

  if (login === "Admin") {
    const admin = db.prepare("SELECT password_hash FROM admins WHERE login = ? LIMIT 1").get("Admin");
    if (admin && bcrypt.compareSync(password, admin.password_hash)) {
      req.session.isAdmin = true;
      delete req.session.userLogin;
      return json(res, { success: true, role: "admin" });
    }
    return json(res, { success: false, message: "Неверный пароль администратора." }, 401);
  }

  const user = db.prepare("SELECT login, password_hash FROM users WHERE login = ? LIMIT 1").get(login);
  if (!user) {
    return json(res, { success: false, message: "Пользователь с таким логином не найден." }, 401);
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return json(res, { success: false, message: "Неверный пароль. Повторите попытку." }, 401);
  }

  req.session.userLogin = user.login;
  delete req.session.isAdmin;
  return json(res, { success: true, role: "user", login: user.login });
});

// ——— Выход ———
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    json(res, { success: true });
  });
});

// ——— Заявки пользователя ———
app.get("/api/applications", (req, res) => {
  const login = requireUser(req, res);
  if (!login) return;

  const userId = getUserIdByLogin(login);
  if (!userId) {
    return json(res, { success: false, message: "Пользователь не найден." }, 404);
  }

  const rows = db
    .prepare(
      `SELECT id, course, start_date, payment_type, status, created_at
       FROM applications WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId);

  const applications = rows.map((row) => ({
    id: row.id,
    course: row.course,
    startDate: row.start_date,
    payment: row.payment_type,
    paymentLabel: paymentLabel(row.payment_type),
    status: row.status,
    createdAt: row.created_at,
  }));

  return json(res, { success: true, applications });
});

app.post("/api/applications", (req, res) => {
  const login = requireUser(req, res);
  if (!login) return;

  const userId = getUserIdByLogin(login);
  if (!userId) {
    return json(res, { success: false, message: "Пользователь не найден." }, 404);
  }

  const course = String(req.body.course || "").trim();
  const startDate = String(req.body.startDate || "").trim();
  const payment = String(req.body.payment || "");

  if (!course || !COURSES.includes(course)) {
    return json(res, { success: false, message: "Выберите курс из списка." }, 400);
  }
  if (!/^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19|20)\d{2}$/.test(startDate)) {
    return json(res, { success: false, message: "Дата в формате дд.мм.гггг." }, 400);
  }
  if (!["cash", "phone"].includes(payment)) {
    return json(res, { success: false, message: "Выберите способ оплаты." }, 400);
  }

  const result = db
    .prepare(
      `INSERT INTO applications (user_id, course, start_date, payment_type, status)
       VALUES (?, ?, ?, ?, 'Новая')`
    )
    .run(userId, course, startDate, payment);

  return json(res, {
    success: true,
    message: "Заявка отправлена на рассмотрение администратору портала.",
    id: result.lastInsertRowid,
  });
});

// ——— Отзывы ———
app.get("/api/feedback", (req, res) => {
  const login = requireUser(req, res);
  if (!login) return;

  const userId = getUserIdByLogin(login);
  if (!userId) {
    return json(res, { success: false, message: "Пользователь не найден." }, 404);
  }

  const row = db
    .prepare(
      "SELECT rating, feedback_text, created_at, updated_at FROM feedbacks WHERE user_id = ? LIMIT 1"
    )
    .get(userId);

  const canLeaveFeedback = userHasCompletedCourse(userId);

  if (!row) {
    return json(res, { success: true, feedback: null, canLeaveFeedback });
  }

  return json(res, {
    success: true,
    canLeaveFeedback,
    feedback: {
      rating: String(row.rating),
      text: row.feedback_text,
      createdAt: row.updated_at || row.created_at,
    },
  });
});

app.post("/api/feedback", (req, res) => {
  const login = requireUser(req, res);
  if (!login) return;

  const userId = getUserIdByLogin(login);
  if (!userId) {
    return json(res, { success: false, message: "Пользователь не найден." }, 404);
  }

  const rating = Number(req.body.rating);
  const text = String(req.body.text || "").trim();

  if (rating < 1 || rating > 5) {
    return json(res, { success: false, message: "Выберите оценку от 1 до 5." }, 400);
  }
  if (text.length < 10) {
    return json(res, { success: false, message: "Отзыв должен содержать не менее 10 символов." }, 400);
  }
  if (!userHasCompletedCourse(userId)) {
    return json(
      res,
      {
        success: false,
        message:
          "Отзыв доступен только после завершения обучения по курсу (статус «Обучение завершено»).",
      },
      403
    );
  }

  db.prepare(
    `INSERT INTO feedbacks (user_id, rating, feedback_text, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       rating = excluded.rating,
       feedback_text = excluded.feedback_text,
       updated_at = datetime('now')`
  ).run(userId, rating, text);

  return json(res, { success: true, message: "Спасибо! Ваш отзыв успешно сохранён." });
});

// ——— Админ: все заявки ———
app.get("/api/admin/applications", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const rows = db
    .prepare(
      `SELECT a.id, u.login, u.fio, a.course, a.start_date, a.payment_type,
              a.status, a.created_at
       FROM applications a
       INNER JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC`
    )
    .all();

  const applications = rows.map((row) => ({
    id: row.id,
    login: row.login,
    fio: row.fio,
    course: row.course,
    startDate: row.start_date,
    paymentLabel: paymentLabel(row.payment_type),
    status: row.status,
    createdAt: row.created_at,
  }));

  return json(res, { success: true, applications });
});

app.post("/api/admin/applications", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const id = Number(req.body.id);
  const status = String(req.body.status || "");
  if (!id || id <= 0 || !APPLICATION_STATUSES.includes(status)) {
    return json(res, { success: false, message: "Некорректные данные статуса." }, 400);
  }

  const result = db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) {
    return json(res, { success: false, message: "Заявка не найдена." }, 404);
  }

  return json(res, { success: true });
});

app.post("/api/admin/clear-test-data", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const applications = db.prepare("DELETE FROM applications").run().changes;
  const feedbacks = db.prepare("DELETE FROM feedbacks").run().changes;
  const users = db.prepare("DELETE FROM users").run().changes;

  return json(res, {
    success: true,
    message: "Тестовые данные удалены.",
    deleted: { applications, feedbacks, users },
  });
});

app.listen(PORT, () => {
  console.log(`Корочки.есть: http://localhost:${PORT}/login.html`);
});
