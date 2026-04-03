import { menu, getMenuByCategory } from "@/lib/menu";

export async function GET() {
  return Response.json({
    items: menu,
    categories: getMenuByCategory(),
  });
}
