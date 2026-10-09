"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/movie/[id]/page.module.css";

type Movie = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
};

type Review = {
  id: number;
  user_id: string;
  movie_id: number;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  username: string;
};

type Profile = {
  id: string;
  username: string;
};

export default function MoviePage() {
  const params = useParams();
  const id = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(8);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMovie() {
      setLoading(true);

      try {
        const response = await fetch(`/api/movies/${id}`);
        const movieData = await response.json();

        if (!response.ok) {
          throw new Error("Erro ao carregar filme");
        }

        if (cancelled) return;

        setMovie(movieData);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (cancelled) return;

        setUserId(user?.id ?? null);

        if (user) {
          const { data: listData, error: listError } =
            await supabase
              .from("my_list")
              .select("movie_id")
              .eq("user_id", user.id)
              .eq("movie_id", Number(id))
              .maybeSingle();

          if (listError) throw listError;
          if (cancelled) return;

          setInList(!!listData);
        } else {
          setInList(false);
        }

        const { data: reviewData, error: reviewError } =
          await supabase
            .from("reviews")
            .select("*")
            .eq("movie_id", Number(id))
            .order("created_at", { ascending: false });

        if (reviewError) throw reviewError;
        if (cancelled) return;

        const loadedReviews = reviewData ?? [];

        const userIds = [
          ...new Set(loadedReviews.map((item) => item.user_id)),
        ];

        let usernameById = new Map<string, string>();

        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } =
            await supabase
              .from("profiles")
              .select("id, username")
              .in("id", userIds);

          if (profilesError) throw profilesError;

          const typedProfiles = (profiles ?? []) as Profile[];

          usernameById = new Map(
            typedProfiles.map((profile) => [
              profile.id,
              profile.username,
            ])
          );
        }

        if (cancelled) return;

        const reviewsWithUsernames: Review[] = loadedReviews.map(
          (item) => ({
            ...item,
            username: usernameById.get(item.user_id) ?? "Usuário",
          })
        );

        setReviews(reviewsWithUsernames);

        const ownReview = reviewsWithUsernames.find(
          (item) => item.user_id === user?.id
        );

        if (ownReview) {
          setRating(ownReview.rating);
          setReviewText(ownReview.review);
        } else {
          setRating(8);
          setReviewText("");
        }
      } catch (error) {
        console.error("Erro ao carregar filme e avaliações:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMovie();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  async function saveReview() {
    if (!userId) {
      alert("Por favor, faça login para escrever uma avaliação.");
      return;
    }

    if (!reviewText.trim()) {
      alert("Por favor, escreva sua avaliação primeiro.");
      return;
    }

    setSavingReview(true);

    try {
      const { data, error } = await supabase
        .from("reviews")
        .upsert(
          {
            user_id: userId,
            movie_id: Number(id),
            rating,
            review: reviewText.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,movie_id" }
        )
        .select()
        .single();

      if (error) throw error;

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .maybeSingle();

      if (profileError) throw profileError;

      const savedReview: Review = {
        ...data,
        username: profile?.username ?? "Usuário",
      };

      setReviews((previous) => [
        savedReview,
        ...previous.filter((item) => item.user_id !== userId),
      ]);

      alert("Avaliação salva com sucesso!");
    } catch (error) {
      console.error("Erro salvando sua avaliação:", error);
      alert("Sua avaliação não pôde ser salva.");
    } finally {
      setSavingReview(false);
    }
  }

  async function addToList() {
    if (!movie || !userId) {
      alert("Faça login para adicionar filmes à sua lista.");
      return;
    }

    const { error } = await supabase
      .from("my_list")
      .upsert(
        {
          user_id: userId,
          movie_id: movie.id,
          title: movie.title,
          overview: movie.overview,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
        },
        { onConflict: "user_id,movie_id" }
      );

    if (error) {
      console.error("Erro adicionando filme:", error);
      alert("Erro ao adicionar filme.");
      return;
    }

    setInList(true);
    alert("Filme adicionado à sua lista!");
  }

  if (loading) {
    return <main>Carregando filme...</main>;
  }

  if (!movie) {
    return <main>Filme não encontrado.</main>;
  }

  return (
    <main
      style={{
        padding: "30px",
        color: "white",
        background: "grey",
      }}
    >
      <div className={styles.returnbutton}>
        <button onClick={() => history.back()}>← Voltar</button>
      </div>

      <div
        className={styles.movieinfo}
        style={{
          display: "flex",
          gap: "30px",
          flexWrap: "wrap",
          marginTop: "30px",
        }}
      >
        {movie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            style={{
              width: "300px",
              maxWidth: "100%",
              borderRadius: "10px",
            }}
          />
        )}

        <section style={{ flex: "1", minWidth: "250px" }}>
          <h1>{movie.title}</h1>

          <p>
            ⭐ {movie.vote_average?.toFixed(1) ?? "N/A"}/10
          </p>

          <p>
            Data de lançamento:{" "}
            {movie.release_date || "Desconhecida"}
          </p>

          <h2>Sinopse:</h2>

          <p>
            {movie.overview || "Não há sinopse disponível."}
          </p>

          <button onClick={addToList} disabled={inList}>
            {inList ? "Já está na lista" : "Adicionar à lista"}
          </button>
        </section>
      </div>

      <section style={{ marginTop: "50px", maxWidth: "800px" }}>
        <h2>Avaliações da comunidade:</h2>

        <div
          style={{
            background: "#211f1f",
            padding: "20px",
            borderRadius: "10px",
            marginTop: "20px",
          }}
        >
          <h3>
            {reviews.some((item) => item.user_id === userId)
              ? "Edite sua avaliação"
              : "Escreva uma avaliação"}
          </h3>

          <label htmlFor="rating">Sua nota (1–10)</label>
          <br />

          <select
            id="rating"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            style={{
              margin: "10px 0",
              padding: "8px",
              background: "grey",
            }}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {value}/10
                </option>
              )
            )}
          </select>

          <br />

          <label htmlFor="review">Sua avaliação</label>
          <br />

          <textarea
            id="review"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="O que você achou deste filme?"
            rows={5}
            maxLength={5000}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "grey",
              padding: "12px",
              marginTop: "10px",
              borderRadius: "6px",
              resize: "vertical",
            }}
          />

          <p>{reviewText.length}/5000 caracteres</p>

          <button
            onClick={saveReview}
            disabled={savingReview || !userId}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              background: "grey",
            }}
          >
            {!userId
              ? "Faça login para publicar uma avaliação"
              : savingReview
                ? "Salvando..."
                : "Publicar"}
          </button>
        </div>

        <div style={{ marginTop: "30px" }}>
          {reviews.length === 0 ? (
            <p>
              Nenhuma avaliação. Seja o primeiro a avaliar este filme!
            </p>
          ) : (
            reviews.map((item) => (
              <article
                key={item.id}
                style={{
                  background: "#216657",
                  padding: "18px",
                  borderRadius: "10px",
                  marginBottom: "15px",
                }}
              >
                <h3>
                  {item.username || "Usuário"}
                  {item.user_id === userId ? " (Você)" : ""}
                </h3>

                <p>⭐ {item.rating}/10</p>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {item.review}
                </p>

                <small>
                  {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                  {item.user_id === userId ? " · Sua avaliação" : ""}
                </small>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
