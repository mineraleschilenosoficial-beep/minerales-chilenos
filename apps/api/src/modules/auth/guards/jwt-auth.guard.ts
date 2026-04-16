import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard that validates Bearer JWT tokens.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
