import { auth } from '@/auth';

export default auth;

export const config = {
  matcher: ['/app/:path*', '/api/((?!auth|signup|forgot-password|reset-password).*)'],
};