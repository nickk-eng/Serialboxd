// API do TMDB (The Movie Database) - Funcionalidade para buscar lançamentos recentes
class TMDBApi {
  constructor() {
    this.baseUrl = "/api/tmdb"; // URL base para as rotas do nosso backend
    this.imageBaseUrl = "https://image.tmdb.org/t/p/w500"; // URL base para imagens
  }

  // Método para buscar séries populares
  async getPopularContent() {
    try {
      // Busca séries populares
      const seriesResponse = await fetch(`${this.baseUrl}/popular`);
      const seriesData = await seriesResponse.json();

      // Verificação para evitar erros se a API falhar ou a chave for inválida
      if (!seriesResponse.ok || !seriesData.results) {
        console.error(
          "Erro da API (via backend):",
          seriesData.status_message || "Resposta inválida da API."
        );
        return this.getFallbackData();
      }

      // Retorna apenas séries (máximo 6)
      return seriesData.results.slice(0, 6);
    } catch (error) {
      console.error("Erro ao buscar séries populares:", error);
      return this.getFallbackData(); // Dados de fallback em caso de erro
    }
  }

  // Busca séries lançadas em 2025 ou mais famosas
  async getRecentReleases() {
    try {
      // Busca séries recentes através do nosso backend
      const seriesResponse = await fetch(`${this.baseUrl}/recent`);
      const seriesData = await seriesResponse.json();

      // Se encontrou séries de 2025, retorna elas
      if (seriesData.results && seriesData.results.length > 0) {
        return seriesData.results.slice(0, 6);
      }

      // Caso contrário, busca as mais famosas
      return await this.getPopularContent();
    } catch (error) {
      console.error("Erro ao buscar séries de 2025:", error);
      return this.getFallbackData();
    }
  }

  // Dados de fallback para quando a API não funciona (apenas séries)
  getFallbackData() {
    return [
      {
        id: 1,
        title: "The Last of Us",
        name: "The Last of Us",
        poster_path: "/uDgy6f6M6oq4VJMc7o6KKMhnNzl.jpg",
        vote_average: 8.7,
        release_date: "2023-01-15",
        first_air_date: "2023-01-15",
        media_type: "tv",
        overview:
          "Série baseada no jogo de mesmo nome, ambientada em um mundo pós-apocalíptico onde um homem precisa proteger uma garota especial.",
      },
      {
        id: 2,
        title: "Succession",
        name: "Succession",
        poster_path: "/7dFZJ2yzyL2bQBLGsx4uU1mDhc.jpg",
        vote_average: 8.8,
        release_date: "2018-06-03",
        first_air_date: "2018-06-03",
        media_type: "tv",
        overview:
          "Série sobre uma família rica e poderosa que controla um dos maiores conglomerados de mídia do mundo.",
      },
      {
        id: 3,
        title: "The Bear",
        name: "The Bear",
        poster_path: "/sHFlb1Wv2WJHcD3K4jY7t7kYp.jpg",
        vote_average: 8.4,
        release_date: "2022-06-23",
        first_air_date: "2022-06-23",
        media_type: "tv",
        overview:
          "Série sobre um jovem chef que retorna a Chicago para administrar a lanchonete da família após uma tragédia.",
      },
      {
        id: 4,
        title: "Stranger Things",
        name: "Stranger Things",
        poster_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
        vote_average: 8.7,
        release_date: "2016-07-15",
        first_air_date: "2016-07-15",
        media_type: "tv",
        overview:
          "Quando um garoto desaparece, uma pequena cidade revela um mistério envolvendo experimentos secretos e forças sobrenaturais.",
      },
      {
        id: 5,
        title: "House of the Dragon",
        name: "House of the Dragon",
        poster_path: "/t9XkeE7HzOsdQcDDDapDYh8LKzQ.jpg",
        vote_average: 8.4,
        release_date: "2022-08-21",
        first_air_date: "2022-08-21",
        media_type: "tv",
        overview:
          "A Casa Targaryen luta pelo trono em uma guerra civil que moldará o destino dos Sete Reinos.",
      },
      {
        id: 6,
        title: "The Mandalorian",
        name: "The Mandalorian",
        poster_path: "/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
        vote_average: 8.7,
        release_date: "2019-11-12",
        first_air_date: "2019-11-12",
        media_type: "tv",
        overview:
          "As aventuras de um caçador de recompensas solitário nos confins da galáxia, longe da autoridade da Nova República.",
      },
    ];
  }

  // Método para obter a URL completa da imagem
  getImageUrl(posterPath) {
    if (posterPath && posterPath !== "/poster1.jpg") {
      return `${this.imageBaseUrl}${posterPath}`;
    }
    // Retorna uma imagem placeholder se não houver poster
    return "https://via.placeholder.com/300x450/1a1625/ffffff?text=Poster+Não+Disponível";
  }

  // Método para formatar a data
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

// Classe para gerenciar a interface
class RecentContentManager {
  constructor() {
    this.tmdbApi = new TMDBApi();
    this.recentGrid = document.getElementById("recentGrid");
  }

  // Inicializa a aplicação
  async init() {
    try {
      // Tenta buscar lançamentos recentes primeiro
      let content = await this.tmdbApi.getRecentReleases();

      // Se não encontrou lançamentos recentes, usa conteúdo popular
      if (!content || content.length === 0) {
        content = await this.tmdbApi.getPopularContent();
      }

      this.displayContent(content);
    } catch (error) {
      console.error("Erro ao inicializar:", error);
      // Usa dados de fallback em caso de erro
      this.displayContent(this.tmdbApi.getFallbackData());
    }
  }

  // Exibe o conteúdo na página
  displayContent(content) {
    if (!this.recentGrid) return;

    // Remove o spinner de loading
    this.recentGrid.innerHTML = "";

    content.forEach((item) => {
      const contentCard = this.createContentCard(item);
      this.recentGrid.appendChild(contentCard);
    });
  }

  // Cria um card para cada item de conteúdo
  createContentCard(item) {
    const card = document.createElement("div");
    card.className = "recent-card";

    const imageUrl = this.tmdbApi.getImageUrl(item.poster_path);
    const title = item.title || item.name;
    const releaseDate = this.tmdbApi.formatDate(
      item.release_date || item.first_air_date
    );
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    const mediaType = item.media_type === "movie" ? "Filme" : "Série";

    card.innerHTML = `
            <div class="recent-poster">
                <img src="${imageUrl}" alt="${title}" loading="lazy">
                <div class="recent-overlay">
                    <div class="recent-info">
                        <span class="media-type">${mediaType}</span>
                        <span class="rating"><i class="fas fa-star"></i> ${rating}</span>
                    </div>
                </div>
            </div>
            <div class="recent-content">
                <h3 class="recent-title">${title}</h3>
                <p class="recent-date">${releaseDate}</p>
                <p class="recent-overview">${this.truncateText(
                  item.overview,
                  100
                )}</p>
            </div>
        `;

    // Adiciona evento de clique
    card.addEventListener("click", () => {
      this.showContentDetails(item);
    });

    return card;
  }

  // Trunca texto para não ficar muito longo
  truncateText(text, maxLength) {
    if (!text) return "Sinopse não disponível.";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  // Mostra detalhes do conteúdo (simulação)
  showContentDetails(item) {
    const title = item.title || item.name;
    alert(
      `Você clicou em: ${title}\n\nEste é um exemplo de como você pode navegar para a página de detalhes do conteúdo.`
    );
  }
}

// Classe para gerenciar atores famosos
class FamousActorsManager {
  constructor() {
    this.actorsGrid = document.getElementById("actorsGrid");
  }

  // Inicializa a aplicação
  init() {
    this.displayActors(this.getActorsData());
  }

  // Dados dos atores famosos
  getActorsData() {
    return [
      {
        id: 1,
        name: "Robert Pattinson",
        famous_series: "The Batman",
        profile_path: "/2hKdd3t6lSUGDhnCAPUIK9Wy6O.jpg",
      },
      {
        id: 2,
        name: "Pedro Pascal",
        famous_series: "The Last of Us",
        profile_path: "/ruCPgZz5l7q4d8gQ7c5l5l5l5l5.jpg",
      },
      {
        id: 3,
        name: "Andrew Garfield",
        famous_series: "The Amazing Spider-Man",
        profile_path: "/f4c2l5l5l5l5l5l5l5l5l5.jpg",
      },
      {
        id: 4,
        name: "Emma Stone",
        famous_series: "The Curse",
        profile_path: "/2wJk9l5l5l5l5l5l5l5l5l5l5l5.jpg",
      },
      {
        id: 5,
        name: "Ana de Armas",
        famous_series: "Blonde",
        profile_path: "/3wJk9l5l5l5l5l5l5l5l5l5l5l5.jpg",
      },
      {
        id: 6,
        name: "Fernanda Montenegro",
        famous_series: "Doce de Mãe",
        profile_path: "/4wJk9l5l5l5l5l5l5l5l5l5l5l5.jpg",
      },
    ];
  }

  // Exibe os atores na página
  displayActors(actors) {
    if (!this.actorsGrid) return;

    // Remove o spinner de loading
    this.actorsGrid.innerHTML = "";

    actors.forEach((actor) => {
      const actorCard = this.createActorCard(actor);
      this.actorsGrid.appendChild(actorCard);
    });
  }

  // Cria um card para cada ator
  createActorCard(actor) {
    const card = document.createElement("div");
    card.className = "actor-card";

    const imageUrl = this.getActorImageUrl(actor.profile_path);
    const name = actor.name;
    const famousSeries = actor.famous_series;

    card.innerHTML = `
            <div class="actor-poster">
                <img src="${imageUrl}" alt="${name}" loading="lazy">
                <div class="actor-overlay">
                    <div class="actor-info">
                        <span class="actor-series">${famousSeries}</span>
                    </div>
                </div>
            </div>
            <div class="actor-content">
                <h3 class="actor-name">${name}</h3>
                <p class="actor-series">${famousSeries}</p>
            </div>
        `;

    // Adiciona evento de clique
    card.addEventListener("click", () => {
      this.showActorDetails(actor);
    });

    return card;
  }

  // Método para obter a URL completa da imagem do ator
  getActorImageUrl(profilePath) {
    if (profilePath) {
      return `https://image.tmdb.org/t/p/w500${profilePath}`;
    }
    // Retorna uma imagem placeholder se não houver imagem
    return "https://via.placeholder.com/300x450/1a1625/ffffff?text=Ator+Não+Disponível";
  }

  // Mostra detalhes do ator (simulação)
  showActorDetails(actor) {
    const name = actor.name;
    alert(
      `Você clicou em: ${name}\n\nSérie mais famosa: ${actor.famous_series}\n\nEste é um exemplo de como você pode navegar para a página de detalhes do ator.`
    );
  }
}

// Função para gerenciar o estado do login na UI
function gerenciarEstadoLogin() {
  const usuarioLogado = localStorage.getItem("usuarioLogado");
  const avatarUrl = localStorage.getItem("userAvatar");
  const linkEntrar = document.getElementById("linkEntrar");
  const liCadastrar = document.getElementById("liCadastrar");
  const spanUsuario = document.getElementById("usuarioLogado");
  const liLogout = document.getElementById("liLogout");
  const btnLogout = document.getElementById("btnLogout");
  const btnCadastreSe = document.getElementById("btnCadastreSe"); // Botão "Cadastre-se"
  const linkUsuario = document.getElementById("linkUsuario");

  // Verifica se há um accessToken para considerar o usuário logado
  if (usuarioLogado) {
    // Usuário está logado
    if (linkEntrar) linkEntrar.parentElement.style.display = "none";
    if (liCadastrar) liCadastrar.style.display = "none";
    // Pega o nome do usuário do localStorage
    const nomeUsuario = localStorage.getItem("usuarioLogado");
    if (spanUsuario && nomeUsuario) spanUsuario.textContent = nomeUsuario;
    if (linkUsuario) {
      linkUsuario.href = "/perfil.html"; // Aponta o link para a página de perfil
    }

    if (liUsuario) liUsuario.style.display = "flex";
    if (userAvatar) {
      if (avatarUrl) {
        userAvatar.src = avatarUrl;
        userAvatar.style.display = "inline-block";
      } else {
        // Se não houver avatar, esconde a tag de imagem para que o CSS mostre a bolinha
        userAvatar.style.display = "none";
      }
    }

    if (liLogout) liLogout.style.display = "list-item";
    if (btnCadastreSe) btnCadastreSe.style.display = "none"; // Esconde o botão "Cadastre-se"
  } else {
    // Usuário não está logado
    if (linkEntrar) linkEntrar.parentElement.style.display = "list-item";
    if (liCadastrar) liCadastrar.style.display = "list-item";
    if (liUsuario) liUsuario.style.display = "none";
    if (spanUsuario) spanUsuario.textContent = "";
    if (liLogout) liLogout.style.display = "none";
    if (linkUsuario) {
      linkUsuario.href = "#"; // Remove o link se não estiver logado
    }
    if (btnCadastreSe) btnCadastreSe.style.display = "inline-block"; // Mostra o botão "Cadastre-se"
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      const refreshToken = localStorage.getItem("refreshToken");

      // Envia o refreshToken para o backend invalidá-lo
      fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).finally(() => {
        // Independentemente do resultado, limpa o localStorage e redireciona
        localStorage.removeItem("usuarioLogado");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userAvatar");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login.html";
      });
    });
  }
}

let isRefreshing = false;

// Inicializa quando a página carrega
document.addEventListener("DOMContentLoaded", function () {
  const contentManager = new RecentContentManager();
  contentManager.init();

  const actorsManager = new FamousActorsManager();
  actorsManager.init();

  // Gerencia a exibição dos links de login/logout
  gerenciarEstadoLogin();
});

document.addEventListener("DOMContentLoaded", () => {
  // Formulário de Login
  const loginForm = document.getElementById("formLogin");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const senha = document.getElementById("senha").value.trim();

      if (!email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
      }

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha }),
        });

        const data = await response.json();

        if (response.ok) {
          // Salva o nome e os tokens no localStorage
          localStorage.setItem("usuarioLogado", data.nome);
          localStorage.setItem("userEmail", data.email); // Salva o e-mail
          if (data.avatarUrl) {
            localStorage.setItem("userAvatar", data.avatarUrl); // Salva o avatar se existir
          }
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);

          window.location.href = "/"; // Redireciona para a página inicial
        } else {
          alert(data.erro || "Erro ao fazer login.");
        }
      } catch (error) {
        console.error("Erro ao fazer login:", error);
        alert("Erro ao fazer login. Tente novamente mais tarde.");
      }
    });
  }

  // Formulário de Cadastro
  const registerForm = document.getElementById("formCadastro");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome").value.trim();
      const email = document.getElementById("email").value.trim();
      const senha = document.getElementById("senha").value.trim();

      if (!nome || !email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
      }

      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Corrigido para enviar 'nome' e 'senha' como o backend espera
          body: JSON.stringify({ nome, email, senha }),
        });

        const data = await response.json();

        if (response.ok) {
          // Corrigido para usar a resposta correta do backend
          alert(`Usuário ${data.nome} cadastrado com sucesso!`);
          window.location.href = "/login.html";
        } else {
          // Corrigido para usar a mensagem de erro correta
          alert(data.erro || "Ocorreu um erro no cadastro.");
        }
      } catch (error) {
        console.error("Erro ao cadastrar:", error);
        alert("Erro ao cadastrar. Tente novamente mais tarde.");
      }
    });
  }

  // Lógica para a página de perfil
  if (window.location.pathname === "/perfil.html") {
    const nome = localStorage.getItem("usuarioLogado");
    const email = localStorage.getItem("userEmail");

    if (nome && email) {
      document.getElementById("profileName").textContent = nome;
      document.getElementById("profileEmail").textContent = email;
    }

    // Lógica para upload de avatar
    const avatarContainer = document.getElementById("avatarContainer");
    const avatarUploadInput = document.getElementById("avatarUpload");
    const profileAvatar = document.getElementById("profileAvatar");

    // Carrega avatar do localStorage se existir
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) {
      profileAvatar.src = savedAvatar;
    }

    avatarContainer.addEventListener("click", () => {
      avatarUploadInput.click();
    });

    avatarUploadInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Exibe preview
      const reader = new FileReader();
      reader.onload = (event) => {
        profileAvatar.src = event.target.result;
      };
      reader.readAsDataURL(file);

      // Envia para o servidor
      const formData = new FormData();
      formData.append("avatar", file);

      const accessToken = localStorage.getItem("accessToken");

      try {
        const response = await fetch("/api/user/avatar", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        const data = await response.json();
        alert(data.message || data.erro);

        if (response.ok) {
          localStorage.setItem("userAvatar", data.avatarUrl);
        }
      } catch (error) {
        console.error("Erro no upload do avatar:", error);
        alert("Falha ao enviar o avatar.");
      }
    });
  }

  // Lógica para a página de alteração de senha
  const changePasswordForm = document.getElementById("formChangePassword");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (newPassword !== confirmPassword) {
        alert("A nova senha e a confirmação não correspondem.");
        return;
      }

      if (newPassword.length < 8) {
        alert("A nova senha deve ter no mínimo 8 caracteres.");
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        alert("Você não está logado. Faça o login para alterar a senha.");
        window.location.href = "/login.html";
        return;
      }

      try {
        const response = await fetch("/api/user/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();

        alert(data.message || data.erro);

        if (response.ok) {
          window.location.href = "/perfil.html";
        }
      } catch (error) {
        console.error("Erro ao alterar senha:", error);
        alert("Ocorreu um erro. Tente novamente.");
      }
    });
  }
});

// Lógica para a página de recuperação de senha
document.addEventListener("DOMContentLoaded", () => {
  const forgotPasswordForm = document.getElementById("formForgotPassword");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const messageEl = document.getElementById("message");

      try {
        const response = await fetch("/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();
        messageEl.textContent =
          data.message ||
          data.erro ||
          "Se o e-mail estiver cadastrado, um link será enviado.";
      } catch (error) {
        console.error("Erro ao solicitar recuperação de senha:", error);
        messageEl.textContent = "Erro de conexão. Tente novamente.";
      }
    });
  }

  // Lógica para a página de redefinição de senha
  const resetPasswordForm = document.getElementById("formResetPassword");
  if (resetPasswordForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      document.body.innerHTML = "<h1>Token de redefinição inválido.</h1>";
      return;
    }

    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("newPassword").value;
      const messageEl = document.getElementById("message");

      try {
        const response = await fetch("/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = await response.json();
        messageEl.textContent = data.message || data.erro;
      } catch (error) {
        messageEl.textContent = "Erro de conexão.";
      }
    });
  }
});

// Interceptador de fetch para renovação automática de token
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  let [resource, config] = args;

  // Executa a requisição original
  let response = await originalFetch(resource, config);

  // Se a resposta for 403 (Token inválido/expirado) e não for uma tentativa de refresh
  if (response.status === 403 && !config.url?.includes("/api/auth/refresh")) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const refreshResponse = await originalFetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);

            // Atualiza o header da requisição original e a refaz
            config.headers["Authorization"] = `Bearer ${data.accessToken}`;
            isRefreshing = false;
            return originalFetch(resource, config);
          }
        } catch (error) {
          console.error("Falha ao renovar token:", error);
        }
      }
    }
    // Se a renovação falhar ou não for necessária, desloga o usuário
    isRefreshing = false;
    // localStorage.clear();
    // window.location.href = "/login.html";
  }

  return response;
};
