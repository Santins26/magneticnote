export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q");

  console.log("QUERY:", query);
  console.log("API KEY EXISTS:", !!process.env.TMDB_API_KEY);

  const url =
    `https://api.themoviedb.org/3/search/movie` +
    `?api_key=${process.env.TMDB_API_KEY}` +
    `&query=${encodeURIComponent(query ?? "")}` + `&language=pt-BR`;

  const response = await fetch(url);

  console.log("TMDB STATUS:", response.status);

  const data = await response.json();

  console.log("TMDB RESPONSE:", data);

  return Response.json(data);
}