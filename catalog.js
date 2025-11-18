document.addEventListener("DOMContentLoaded", () => {
  const catalogGrid = document.getElementById("catalogGrid");
  const searchInput = document.getElementById("catalogSearch");
  const searchButton = document.getElementById("catalogSearchBtn");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  const imageBaseUrl = "https://image.tmdb.org/t/p/w500";
  let currentPage = 1;
  let currentQuery = "";
  let isLoading = false;

  // Função para buscar e exibir séries
  async function fetchAndDisplaySeries(page = 1, query = "") {
    if (isLoading) return;
    isLoading = true;
    loadMoreBtn.textContent = "Carregando...";
    loadMoreBtn.disabled = true;

    try {
      let url = "";
      if (query) {
        // Se houver uma busca, usa a rota de search
        url = `/api/tmdb/search?query=${encodeURIComponent(
          query
        )}&page=${page}`;
      } else {
        // Senão, usa a rota de discover para o catálogo geral
        url = `/api/tmdb/discover?page=${page}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Falha ao buscar dados do servidor.");
      }
      const data = await response.json();

      if (page === 1) {
        catalogGrid.innerHTML = ""; // Limpa o grid apenas se for uma nova busca ou a primeira página
      }

      displaySeries(data.results);

      // Atualiza controles de paginação
      // Mostra ou esconde o botão "Mostrar mais"
      loadMoreBtn.style.display =
        page < data.total_pages ? "inline-block" : "none";
    } catch (error) {
      console.error("Erro:", error);
      catalogGrid.innerHTML =
        "<p>Não foi possível carregar as séries. Tente novamente mais tarde.</p>";
      loadMoreBtn.style.display = "none"; // Esconde o botão em caso de erro
    } finally {
      isLoading = false;
      loadMoreBtn.textContent = "Mostrar mais";
      loadMoreBtn.disabled = false;
    }
  }

  // Função para exibir as séries na grade
  function displaySeries(series) {
    if (!series || series.length === 0) {
      catalogGrid.innerHTML = "<p>Nenhuma série encontrada.</p>";
      // Garante que o grid não fique vazio se a busca não retornar nada
      if (currentPage === 1) {
        catalogGrid.innerHTML = "<p>Nenhuma série encontrada.</p>";
      }
      return;
    }

    series.forEach((item) => {
      const card = createSerieCard(item);
      catalogGrid.appendChild(card);
    });
  }

  // Função para criar o card de uma série
  function createSerieCard(item) {
    const card = document.createElement("div");
    card.className = "recent-card"; // Reutilizando a classe CSS

    const imageUrl = item.poster_path
      ? `${imageBaseUrl}${item.poster_path}`
      : "https://via.placeholder.com/200x300/1a1625/ffffff?text=Sem+Imagem";

    const title = item.name || item.title;
    const releaseDate = item.first_air_date
      ? new Date(item.first_air_date).toLocaleDateString("pt-BR")
      : "Data indisponível";

    card.innerHTML = `
            <div class="recent-poster">
                <img src="${imageUrl}" alt="Pôster de ${title}" loading="lazy">
            </div>
            <div class="recent-content">
                <h3 class="recent-title">${title}</h3>
                <p class="recent-date">${releaseDate}</p>
            </div>
        `;

    card.addEventListener("click", () => {
      // Redireciona para a página de detalhes da série
      window.location.href = `/serie.html?id=${item.id}`;
    });

    return card;
  }

  // Evento para o botão de busca
  function handleSearch() {
    currentQuery = searchInput.value.trim();
    currentPage = 1; // Reseta para a primeira página
    fetchAndDisplaySeries(currentPage, currentQuery);
  }

  searchButton.addEventListener("click", handleSearch);
  searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  // Evento para o botão "Mostrar mais"
  loadMoreBtn.addEventListener("click", () => {
    currentPage++;
    fetchAndDisplaySeries(currentPage, currentQuery);
  });

  // Carrega as séries iniciais ao carregar a página
  fetchAndDisplaySeries(currentPage);
});
