require("dotenv").config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require("express");
const axios = require("axios"); // Adicionado para fazer requisições HTTP
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const nodemailer = require("nodemailer");
const logger = require("./logger"); // Importa nosso logger customizado
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

// Middlewares
app.use(bodyParser.json());

// Middleware para logar todas as requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// --- Configuração do Nodemailer (usando variáveis de ambiente) ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Middleware para servir arquivos estáticos da pasta 'public' se ela existir
const publicPath = path.join(__dirname, "public");
if (fs.existsSync(publicPath)) {
  app.use("/public", express.static(publicPath));
}

// Chaves secretas para os tokens (use variáveis de ambiente em produção)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// --- Configuração da API do TMDB ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// --- Configuração da Criptografia Híbrida (RSA + AES) ---

// 1. Carrega as chaves RSA (a chave privada NUNCA deve ir para o controle de versão)
const privateKey = fs.readFileSync(
  path.join(__dirname, "private_key.pem"),
  "utf8"
);
const publicKey = fs.readFileSync(
  path.join(__dirname, "public_key.pem"),
  "utf8"
);

// 2. A chave AES que será protegida. Em um cenário real, ela não estaria no código.
const AES_KEY_TO_PROTECT = Buffer.from(process.env.ENCRYPTION_KEY); // Garantir que tem 32 bytes

// 3. Criptografa a chave AES com a chave pública RSA.
//    Este valor criptografado é o que você armazenaria de forma segura (ex: em um arquivo de config ou variável de ambiente).
const ENCRYPTED_AES_KEY = crypto.publicEncrypt(
  {
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  AES_KEY_TO_PROTECT
);

// 4. Na inicialização do servidor, descriptografa a chave AES e a mantém em memória.
const DECRYPTED_AES_KEY = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  ENCRYPTED_AES_KEY
);

const ALGORITHM = "aes-256-cbc";

// Função para criptografar texto
function encrypt(text) {
  // Gera um Initialization Vector (IV) aleatório de 16 bytes
  const iv = crypto.randomBytes(16);
  // Cria o cifrador com o algoritmo, a chave e o IV
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    DECRYPTED_AES_KEY, // Usa a chave AES descriptografada que está em memória
    iv
  );
  // Criptografa o texto
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // Retorna o IV e o texto criptografado, separados por um delimitador
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Função para descriptografar texto
function decrypt(text) {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  // Cria o decifrador
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    DECRYPTED_AES_KEY, // Usa a chave AES descriptografada que está em memória
    iv
  );
  // Descriptografa e retorna o texto original
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Middleware para proteger rotas
function protectRoute(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato: Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ erro: "Acesso não autorizado." });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ erro: "Token inválido ou expirado." });
    }
    req.user = user; // Adiciona o payload do token (ex: { userId, nome }) ao request
    next();
  });
}

// --- Configuração do Multer para Upload de Avatar ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Garante que o diretório exista
    const uploadPath = path.join(__dirname, "public/uploads/avatars");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único para evitar conflitos
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      req.user.userId + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// Conexão com o banco de dados
const db = mysql
  .createConnection({
    host: "localhost",
    user: "root",
    password: "200604Colly.", // Substitua pela sua senha
    database: "serialboxd", // Substitua pelo nome do seu banco de dados
  })
  .promise();

logger.info("Pool de conexão com o banco de dados MySQL pronto.");

// Middleware para servir arquivos estáticos
app.use(express.static(__dirname));

// Middleware para servir a pasta de uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Rota para servir a página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Rota para servir a página de "Esqueci a senha"
app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "forgot-password.html"));
});

// Rota para servir a página de catálogo
app.get("/catalog", (req, res) => {
  res.sendFile(path.join(__dirname, "catalog.html"));
});

// Rota para servir a página de detalhes da série
app.get("/serie.html", (req, res) => {
  res.sendFile(path.join(__dirname, "serie.html"));
});

// Rota para buscar dados
app.get("/api/data", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM data");
    res.json(results);
  } catch (err) {
    logger.error("Erro ao buscar dados:", { error: err });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Rota para inserir dados
app.post("/api/data", async (req, res) => {
  const { name } = req.body;
  try {
    await db.query("INSERT INTO data (name) VALUES (?)", [name]);
    res.sendStatus(201);
  } catch (err) {
    logger.error("Erro ao inserir dados:", { error: err });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Rota para cadastro
app.post("/api/register", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
  }
  // A função bcrypt.hash recebe a senha e o "custo" do salt (10 é um bom padrão).
  // Ela gera o salt e o hash de forma segura.
  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [nome, email, hashedPassword] // Apenas o hash é salvo no banco.
    );
    logger.info(`Novo usuário cadastrado: ${email}`, {
      userId: result.insertId,
    });
    res.status(201).json({ nome: nome, userId: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "E-mail já cadastrado." });
    }
    logger.error("Erro ao cadastrar usuário:", { error: error });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Rota para login
app.post("/login", async (req, res) => {
  // 1. Extrai o e-mail e a senha do corpo da requisição.
  const { email, senha } = req.body;

  // 2. Validação básica para garantir que ambos os campos foram enviados.
  if (!email || !senha) {
    return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
  }

  try {
    // 3. Procura no banco de dados por um usuário com o e-mail fornecido.
    const [results] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    // 4. Se nenhum usuário for encontrado, retorna um erro genérico.
    //    (Por segurança, não informamos se o erro foi no e-mail ou na senha).
    if (results.length === 0) {
      logger.warn(
        `Tentativa de login falhou para o e-mail: ${email} (usuário não encontrado)`
      );
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    // 5. Se o usuário foi encontrado, armazena seus dados.
    const user = results[0];
    // 6. Compara a senha enviada pelo usuário com o hash da senha armazenado no banco.
    //    A função `bcrypt.compare` faz isso de forma segura.
    const isPasswordValid = await bcrypt.compare(senha, user.password);

    // 7. Se a senha não for válida, retorna o mesmo erro genérico.
    if (!isPasswordValid) {
      logger.warn(
        `Tentativa de login falhou para o e-mail: ${email} (senha incorreta)`,
        { userId: user.id }
      );
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    // --- Se a autenticação for bem-sucedida ---

    // 8. Gera um "Access Token" de curta duração (15 minutos).
    //    Ele será usado para autorizar o acesso a rotas protegidas.
    const accessToken = jwt.sign(
      { userId: user.id, nome: user.username },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    // 9. Gera um "Refresh Token" de longa duração (7 dias).
    //    Ele será usado para obter um novo Access Token quando o antigo expirar,
    //    sem que o usuário precise fazer login novamente.
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    // 10. Criptografa o refresh token usando AES antes de salvá-lo no banco de dados.
    //     Isso protege o token caso o banco de dados seja comprometido.
    const encryptedRefreshToken = encrypt(refreshToken);

    // 11. Salva o refresh token criptografado no registro do usuário no banco.
    //     Isso permite invalidar a sessão no futuro (no logout).
    await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
      encryptedRefreshToken,
      user.id,
    ]);

    // 12. Registra o login bem-sucedido nos logs.
    logger.info(`Login bem-sucedido para o e-mail: ${email}`, {
      userId: user.id,
    });

    // 13. Envia a resposta para o cliente com os dados do usuário e os tokens.
    res.status(200).json({
      nome: user.username,
      email: user.email, // Adiciona o e-mail na resposta
      avatarUrl: user.avatar_url, // Adiciona a URL do avatar
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // Captura e registra qualquer erro inesperado que ocorra durante o processo.
    logger.error("Erro no login:", { error: error });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Rota para renovar o Access Token usando o Refresh Token (com rotação)
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ erro: "Refresh token não fornecido." });
  }

  try {
    // 1. Verifica a assinatura do refresh token para obter o userId
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // 2. Busca o token criptografado no banco de dados para o usuário correspondente
    const [users] = await db.query(
      "SELECT refresh_token FROM users WHERE id = ?",
      [payload.userId]
    );
    if (users.length === 0 || !users[0].refresh_token) {
      return res.status(403).json({ erro: "Sessão inválida ou revogada." });
    }

    // 3. Descriptografa o token do banco e compara com o token recebido
    const dbToken = decrypt(users[0].refresh_token);
    if (dbToken !== refreshToken) {
      return res.status(403).json({ erro: "Token de atualização inválido." });
    }

    // 4. Se tudo estiver correto, gera um novo par de tokens (rotação)
    const newAccessToken = jwt.sign(
      { userId: payload.userId },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { userId: payload.userId },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
      encrypt(newRefreshToken),
      payload.userId,
    ]);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error("Erro ao renovar token:", { error: error });
    return res
      .status(403)
      .json({ erro: "Token de atualização inválido ou expirado." });
  }
});

// Rota para alterar a senha (protegida por autenticação)
app.post("/api/user/change-password", protectRoute, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId; // ID do usuário obtido do token JWT

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ erro: "A nova senha deve ter no mínimo 8 caracteres." });
  }

  try {
    // 1. Buscar o usuário e sua senha atual no banco
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }
    const user = users[0];

    // 2. Verificar se a senha atual fornecida está correta
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(403).json({ erro: "A senha atual está incorreta." });
    }

    // 3. Gerar o hash da nova senha e atualizar no banco
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedNewPassword,
      userId,
    ]);

    logger.info(`Senha alterada com sucesso para o usuário`, { userId });
    res.status(200).json({ message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Rota para upload de avatar
app.post(
  "/api/user/avatar",
  protectRoute,
  upload.single("avatar"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ erro: "Nenhum arquivo foi enviado." });
    }

    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [
        avatarUrl,
        req.user.userId,
      ]);
      logger.info(`Avatar atualizado para o usuário`, {
        userId: req.user.userId,
        avatarUrl,
      });
      res
        .status(200)
        .json({ message: "Avatar atualizado com sucesso!", avatarUrl });
    } catch (error) {
      logger.error("Erro ao salvar avatar no banco de dados:", {
        error: error,
      });
      res.status(500).json({ erro: "Erro ao atualizar o avatar." });
    }
  }
);

// Rota para Logout (revoga o refresh token)
app.post("/api/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.sendStatus(204); // Sucesso, mesmo sem token
  }

  try {
    // Apenas verifica o token para obter o ID do usuário e invalidar a sessão
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    await db.query("UPDATE users SET refresh_token = NULL WHERE id = ?", [
      payload.userId,
    ]);
    logger.info(`Sessão revogada (logout) para o usuário`, {
      userId: payload.userId,
    });
    res.status(200).json({ message: "Logout bem-sucedido." });
  } catch (error) {
    // Se o token for inválido/expirado, a sessão já não é mais utilizável.
    res.sendStatus(204);
  }
});

// Rota para solicitar a redefinição de senha
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ erro: "O e-mail é obrigatório." });
  }

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      // Responde com sucesso mesmo se o e-mail não existir para evitar enumeração de usuários
      return res.status(200).json({
        message: "Se o e-mail estiver cadastrado, um link será enviado.",
      });
    }

    const user = users[0];
    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000); // Token expira em 1 hora

    await db.query(
      "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
      [token, expires, user.id]
    );

    const resetURL = `http://${req.headers.host}/reset-password.html?token=${token}`;

    const mailOptions = {
      to: user.email,
      from: "Serialboxd <nicholasmoura00@gmail.com>",
      subject: "Redefinição de Senha - Serialboxd",
      text: `Você está recebendo este e-mail porque solicitou a redefinição de senha para sua conta.\n\n
             Por favor, clique no link a seguir ou cole no seu navegador para completar o processo:\n\n
             ${resetURL}\n\n
             Se você não solicitou isso, por favor, ignore este e-mail e sua senha permanecerá inalterada.\n`,
    };

    await transporter.sendMail(mailOptions);

    logger.info(`E-mail de redefinição de senha enviado para: ${user.email}`, {
      userId: user.id,
    });
    res.status(200).json({ message: "E-mail de redefinição enviado." });
  } catch (error) {
    logger.error("Erro no forgot-password:", { error: error });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Rota para efetivamente redefinir a senha
app.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()",
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ erro: "Token inválido ou expirado." });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    logger.info(`Senha redefinida com sucesso via token para o usuário`, {
      userId: user.id,
    });
    res.status(200).json({ message: "Senha redefinida com sucesso!" });
  } catch (error) {
    logger.error("Erro no reset-password:", { error: error });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// --- ROTAS DA API TMDB (PROXY) ---

// Rota para "descobrir" séries (usada para o catálogo geral com paginação)
app.get("/api/tmdb/discover", async (req, res) => {
  if (!TMDB_API_KEY) {
    return res
      .status(500)
      .json({ erro: "Chave da API do TMDB não configurada no servidor." });
  }
  try {
    const page = req.query.page || 1; // Pega o número da página da query, padrão é 1
    const response = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        language: "pt-BR",
        sort_by: "popularity.desc",
        page: page,
      },
    });
    res.json(response.data);
  } catch (error) {
    logger.error("Erro ao descobrir séries do TMDB:", {
      error: error.response?.data || error.message,
    });
    res.status(500).json({ erro: "Falha ao buscar dados do TMDB." });
  }
});

// Rota para buscar séries por nome
app.get("/api/tmdb/search", async (req, res) => {
  if (!TMDB_API_KEY) {
    return res
      .status(500)
      .json({ erro: "Chave da API do TMDB não configurada no servidor." });
  }
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ erro: "O parâmetro 'query' é obrigatório." });
  }

  try {
    const page = req.query.page || 1;
    const response = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        language: "pt-BR",
        query: query,
        page: page,
      },
    });
    res.json(response.data);
  } catch (error) {
    logger.error("Erro ao buscar séries no TMDB:", {
      error: error.response?.data || error.message,
    });
    res.status(500).json({ erro: "Falha ao buscar dados do TMDB." });
  }
});

// Rota para buscar detalhes de uma série específica
app.get("/api/tmdb/tv/:id", async (req, res) => {
  if (!TMDB_API_KEY) {
    return res
      .status(500)
      .json({ erro: "Chave da API do TMDB não configurada no servidor." });
  }
  const { id } = req.params;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: "pt-BR",
        append_to_response: "credits,watch/providers,external_ids",
      },
    });
    res.json(response.data);
  } catch (error) {
    logger.error("Erro ao buscar detalhes da série no TMDB:", {
      error: error.response?.data || error.message,
    });
    res
      .status(error.response?.status || 500)
      .json({ erro: "Falha ao buscar dados do TMDB." });
  }
});

// Rota para buscar séries recentes (discover)
app.get("/api/tmdb/recent", async (req, res) => {
  if (!TMDB_API_KEY) {
    return res
      .status(500)
      .json({ erro: "Chave da API do TMDB não configurada no servidor." });
  }
  try {
    const endDate = "2025-12-31";
    const startDate = "2025-09-20";
    const response = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        language: "pt-BR",
        "first_air_date.gte": startDate,
        "first_air_date.lte": endDate,
        sort_by: "popularity.desc",
        page: 1,
      },
    });
    res.json(response.data);
  } catch (error) {
    logger.error("Erro ao buscar lançamentos do TMDB:", {
      error: error.response?.data || error.message,
    });
    res.status(500).json({ erro: "Falha ao buscar dados do TMDB." });
  }
});

// Middleware para capturar erros não tratados
app.use((err, req, res, next) => {
  logger.error("Erro não tratado:", { error: err });
  res.status(500).json({ erro: "Erro interno do servidor." });
});

// Inicia o servidor
app.listen(PORT, () => {
  logger.info(`Servidor rodando em http://localhost:${PORT}`);
});
