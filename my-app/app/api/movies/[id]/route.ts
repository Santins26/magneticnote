
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const url =
    `https://api.themoviedb.org/3/movie/${id}` +
    `?api_key=${process.env.TMDB_API_KEY}` +
    `&language=pt-BR`;

  const response = await fetch(url);
  const data = await response.json();

  return Response.json(data, { status: response.status });
}