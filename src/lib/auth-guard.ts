/**
 * Auth Guard — Middleware de autenticação e autorização para API Routes
 * Usa next-auth para verificar sessão e roles
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Envolve um route handler exigindo sessão autenticada válida.
 * Retorna 401 se não autenticado.
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown) => {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    return handler(req, context);
  };
}

/**
 * Envolve um route handler exigindo uma das roles especificadas.
 * Retorna 401 se não autenticado, 403 se não autorizado.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: NextRequest, context?: unknown) => {
      const session = await getServerSession();
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Autenticação necessária' },
          { status: 401 }
        );
      }
      const userRole = (session.user as { role?: UserRole }).role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Permissão insuficiente para esta operação' },
          { status: 403 }
        );
      }
      return handler(req, context);
    };
  };
}
