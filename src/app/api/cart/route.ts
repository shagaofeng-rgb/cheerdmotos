import {addCartItem, getCurrentCart, presentCart, removeCartItem, updateCartItem} from '@/lib/cartStore';
import {persistentWritesAvailable} from '@/lib/durableStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await presentCart(await getCurrentCart()), {headers: {'Cache-Control': 'private, no-store'}});
}

export async function POST(request: Request) {
  try {
    if (!persistentWritesAvailable()) return Response.json({ok: false, message: 'Cart is temporarily unavailable.'}, {status: 503});
    const payload = await request.json();
    const cart = payload.action === 'update'
      ? await updateCartItem(payload.productSlug, payload.quantity)
      : payload.action === 'remove'
        ? await removeCartItem(payload.productSlug)
        : await addCartItem(payload.productSlug, payload.quantity);
    return Response.json({ok: true, cart});
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      return Response.json({ok: false, message: 'That quantity is no longer available.'}, {status: 409});
    }
    return Response.json({ok: false, message: error instanceof Error && error.message === 'INVALID_PRODUCT' ? 'This product is no longer available for the cart.' : 'Cart update failed.'}, {status: 400});
  }
}
