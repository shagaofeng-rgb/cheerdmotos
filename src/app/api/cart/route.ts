import {addCartItem, getCurrentCart, presentCart, removeCartItem, updateCartItem} from '@/lib/cartStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(presentCart(await getCurrentCart()));
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const cart = payload.action === 'update'
      ? await updateCartItem(payload.productSlug, payload.quantity)
      : payload.action === 'remove'
        ? await removeCartItem(payload.productSlug)
        : await addCartItem(payload.productSlug, payload.quantity);
    return Response.json({ok: true, cart});
  } catch (error) {
    return Response.json({ok: false, message: error instanceof Error && error.message === 'INVALID_PRODUCT' ? 'Invalid product.' : 'Cart update failed.'}, {status: 400});
  }
}
