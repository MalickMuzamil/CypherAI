import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { CredentialCategory } from '../schemas/credential.schema';

export class UpdateCredentialDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(300) username?: string;
  @IsOptional() @IsEnum(CredentialCategory) category?: CredentialCategory;
  @IsOptional() @IsString() @MaxLength(1000) url?: string;
  // password is intentionally optional — if omitted, the existing password is kept
  @IsOptional() @IsString() @MinLength(1) @MaxLength(1000) password?: string;
  @IsOptional() @IsString() @MaxLength(10000) notes?: string;
}