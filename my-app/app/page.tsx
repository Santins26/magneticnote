"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

type Movie = {
  id: number;
  movie_id?: number,
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  vote_average?: number;
};

const categories = [
  { name: "Terror", id: 27},
  { name: "Comédia", id: 35},
  { name: "Ação", id: 28},
  { name: "Ficção Científica", id: 878},
  { name: "Animação", id:16},
];

export default function Home() {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [myList, setMyList] = useState<Movie[]>([]);
  const [movieToRemove, setMovieToRemove] = useState<Movie | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const myListRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<
  Record<string, Movie[]>
  >({});
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const router = useRouter();

  async function loadSuggestions(category: {
    name: string;
    id: number;
  }) {
    const response = await fetch(
      `/api/movies/discover?genre=${category.id}`
    );


    const data = await response.json();

    setSuggestions((previous) => ({
      ...previous,
      [category.name]: data.results,
    }));
  }

  useEffect(() => {
    categories.forEach((category) => {
      loadSuggestions(category);
    });
  }, []);

  function scrollMyList(direction: number) {
    myListRef.current?.scrollBy({
      left: direction * 500,
      behavior: "smooth",
    });
  }

  function scrollCategory(category: string, direction: number) {
    categoryRefs.current[category]?.scrollBy({
      left: direction * 500,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    async function checkUser() {
      const{data} = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setCheckingAuth(false);
    }
    checkUser();
  }, []);
  async function logout() {
    const {error} = await supabase.auth.signOut({
      scope: "local",
    });
    if (error) {
      console.error("Erro deslogando", error);
      return;
    }
    window.location.href = "/login";
  }


  async function addToMyList(movie: Movie) {
          const {error} = await supabase
          .from("my_list")
          .upsert({
            movie_id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            overview: movie.overview,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
          },
        { onConflict: "user_id,movie_id" }
      )

          if (error) {
            console.error("Erro adicionando o filme:", error);
            return;
          }

          setMyList([...myList, movie]);
          console.log("Filme Adicionado!");
        }

  async function loadMyList() {
    const {data, error} = await supabase
    .from("my_list")
    .select("*")
    .order("created_at", {ascending: false});

    if (error) {
      console.error("Erro carregando a lista:", error);
      return;
    }
    setMyList(data);
  }

  async function removeFromMyList(id: number) {
    const {error} = await supabase
    .from("my_list")
    .delete()
    .eq("id", id);

    if (error) {
      console.error("Erro ao excluir", error);
      return;
    }

    setMyList(myList.filter((movie) => movie.id !== id));
  }

  useEffect(() => {
      loadMyList();
    }, []);

    if (checkingAuth) {
      return <p>Loading...</p>
    }
  return (
    <main className={styles.main}>
      

      {showRemoveModal && movieToRemove && (
      <div className={styles.modalOverlay}>
        <div className={styles.confirmationModal}>
          <h2>Remover Filme?</h2>
          <p>Tem certeza que deseja remover{" "}<strong>{movieToRemove.title}</strong> da sua lista?</p>

          <div className={styles.confirmationButtons}>

        <button onClick={() => {
          setShowRemoveModal(false);
          setMovieToRemove(null);
        }}
        >
          Cancelar
          </button>

          <button
          onClick={() => {
            removeFromMyList(movieToRemove.id);
            setShowRemoveModal(false);
            setMovieToRemove(null);
          }}
          >
            Remover
          </button>
      </div>
      </div>
       </div>

        )}

      <div className={styles.search}>
        
      <h1 className={styles.title}>Barra de pesquisa</h1>
      
      <input type="text" placeholder="Digite o nome do filme" value={search} onChange={(e) => setSearch(e.target.value)} />
      
      <button onClick={async () => {
        const response = await fetch(`/api/movies?q=${search}`);
        
        const data = await response.json();
        setMovies(data.results);

        const { data: testData, error } = await supabase
        .from("test_connection")
        .select("*");

        console.log("SUPABASE:", testData);
        console.log("SUPABASE ERROR", error);
        
      }}
      >Procurar</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => router.push("/profile")}>
  Meu Perfil
</button>
      </div>
  
      

      <div className={styles.myList}>
  <h2>Minha Lista:</h2>
</div>

<div className={styles.rowWrapper}>

  <button
    className={`${styles.rowArrow} ${styles.left}`}
    onClick={() => scrollMyList(-1)}
  >
    ‹
  </button>

  <div className={styles.movieRow} ref={myListRef}>

    {myList.map((movie) => (
      <div className={styles.rowCard} key={movie.id}>

        {movie.poster_path && (
          <img
            className={styles.poster}
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            onClick={() => router.push(`/movie/${movie.movie_id ?? movie.id}`)}
          />

          
        )}
         <p className={styles.rating}>
                ⭐ {movie.vote_average?.toFixed(1) ?? "N/A"}/10
              </p>

              

        

        <div className={styles.info}>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setMovieToRemove(movie);
              setShowRemoveModal(true);
            }}
          >
            Remover
          </button>
        </div>

      </div>
    ))}

  </div>

  <button
    className={`${styles.rowArrow} ${styles.right}`}
    onClick={() => scrollMyList(1)}
  >
    ›
  </button>

</div>



<div className={styles.suggestions}>

  <h2 className={styles.sectionTitle}>
    Sugestões:
  </h2>

 {categories.map((category) => (
  <div
    key={category.id}
    className={styles.suggestionSection}
  >

    <h3>{category.name}</h3>

    <div className={styles.rowWrapper}>

      <button
        className={`${styles.rowArrow} ${styles.left}`}
        onClick={() => scrollCategory(category.name, -1)}
      >
        ‹
      </button>

      <div
        className={styles.movieRow}
        ref={(element) => {
          categoryRefs.current[category.name] = element;
        }}
      >

        {suggestions[category.name]?.map((movie) => (
          <div
            className={styles.rowCard}
            key={movie.id}
            onClick={() => setSelectedMovie(movie)}
          >

            {movie.poster_path && (
              <img
                className={styles.poster}
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                onClick={() => router.push(`/movie/${movie.movie_id ?? movie.id}`)}
              />
            )}


              <p className={styles.rating}>
                ⭐ {movie.vote_average?.toFixed(1) ?? "N/A"}/10
              </p>

              </div>

        ))}

      </div>

      <button
        className={`${styles.rowArrow} ${styles.right}`}
        onClick={() => scrollCategory(category.name, 1)}
      >
        ›
      </button>

    </div>

  </div>
))}
  </div>


     {movies.length > 0 && (
  <>
    <h2 className={styles.sectionTitle}>
      Resultados:
    </h2>

    <div className={styles.movies}>
      {movies.map((movie) => (
        <article
          className={styles.card}
          key={movie.id}
          onClick={() => setSelectedMovie(movie)}
        >
          {movie.poster_path && (
            <img
              className={styles.poster}
              src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
              alt={movie.title}
              onClick={() => router.push(`/movie/${movie.movie_id ?? movie.id}`)}
            />
          )}

          <div className={styles.info}>
            <h2>{movie.title}</h2>
          </div>
        </article>
      ))}
    </div>
  </>
)}

    
    </main>
    
  );
}
