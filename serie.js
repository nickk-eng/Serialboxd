document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const serieId = params.get("id");

  if (!serieId) {
    document.body.innerHTML = "<h1>ID da série não fornecido.</h1>";
    return;
  }

  try {
    const response = await fetch(`/api/tmdb/tv/${serieId}`);
    if (!response.ok) {
      throw new Error("Não foi possível carregar os detalhes da série.");
    }
    const serie = await response.json();

    // Preencher o Hero
    const backdropPath = serie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${serie.backdrop_path}`
      : "";
    if (backdropPath) {
      document.getElementById(
        "serieHero"
      ).style.backgroundImage = `linear-gradient(to right, rgba(10, 10, 10, 0.8), rgba(10, 10, 10, 0.4)), url('${backdropPath}')`;
    }

    document.getElementById("posterImg").src = serie.poster_path
      ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
      : "https://via.placeholder.com/300x450?text=Sem+Imagem";

    document.getElementById("serieTitle").textContent = serie.name;

    const year = serie.first_air_date
      ? `(${serie.first_air_date.split("-")[0]})`
      : "";
    const genres = serie.genres.map((g) => g.name).join(", ");
    document.getElementById("serieSub").textContent = `${year} • ${genres}`;

    document.getElementById("serieOverview").textContent =
      serie.overview || "Sinopse não disponível.";

    // Preencher Elenco
    const castGrid = document.getElementById("castGrid");
    const cast = serie.credits.cast.slice(0, 10); // Pega os 10 primeiros do elenco
    castGrid.innerHTML = "";
    cast.forEach((member) => {
      const card = document.createElement("div");
      card.className = "cast-card";

      const imageUrl = member.profile_path
        ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
        : "https://via.placeholder.com/150x225?text=Sem+Foto";

      card.innerHTML = `
        <img src="${imageUrl}" alt="${member.name}">
        <div class="cast-name">${member.name}</div>
        <div class="cast-character">${member.character}</div>
      `;
      castGrid.appendChild(card);
    });

    // Preencher Temporadas
    const seasonsGrid = document.getElementById("seasonsGrid");
    seasonsGrid.innerHTML = "";
    serie.seasons.forEach((season) => {
      // Ignora temporadas "Especiais" (season_number 0)
      if (season.season_number === 0) return;

      const card = document.createElement("div");
      card.className = "recent-card"; // Reutilizando estilo

      const imageUrl = season.poster_path
        ? `https://image.tmdb.org/t/p/w500${season.poster_path}`
        : "https://via.placeholder.com/300x450?text=Sem+Imagem";

      card.innerHTML = `
        <div class="recent-poster">
          <img src="${imageUrl}" alt="Pôster da Temporada ${
        season.season_number
      }">
        </div>
        <div class="recent-content">
          <h3 class="recent-title">${season.name}</h3>
          <p class="recent-date">${
            season.air_date ? season.air_date.split("-")[0] : ""
          } • ${season.episode_count} episódios</p>
        </div>
      `;

      // Adicionar link para uma futura página de temporada
      card.addEventListener("click", () => {
        alert(`Clicou na temporada ${season.season_number}`);
        // window.location.href = `/season.html?id=${serieId}&season=${season.season_number}`;
      });

      seasonsGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar detalhes da série:", error);
    document.body.innerHTML = `<h1>Erro ao carregar a página. Tente novamente mais tarde.</h1>`;
  }
});
