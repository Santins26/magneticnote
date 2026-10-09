export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre");

  const pages = [1, 2, 3, 4, 5, 6];

  const responses = await Promise.all(
    pages.map((page) => {
      const url =
        `https://api.themoviedb.org/3/discover/movie` +
        `?api_key=${process.env.TMDB_API_KEY}` +
        `&language=pt-BR` +
        `&sort_by=popularity.desc` +
        `&include_adult=false` +
        `&with_genres=${genre ?? ""}` +
        `&page=${page}`;

      return fetch(url).then((response) => response.json());
    })
  );

  const movies = responses.flatMap((data) => data.results);

  return Response.json({
    results: movies,
  });
}