create database serialboxd;
use serialboxd;
#drop database serialboxd;
-- Criação da tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) NULL DEFAULT NULL,
    refresh_token TEXT DEFAULT NULL,
    password_reset_token VARCHAR(255) NULL,
	password_reset_expires DATETIME NULL
);

-- Criação de uma tabela para armazenar tokens de acesso (opcional, se necessário)
CREATE TABLE IF NOT EXISTS tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    type ENUM('access', 'refresh') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

select * from users;
SHOW TABLES;
DESCRIBE tokens;