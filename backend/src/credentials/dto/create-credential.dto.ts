import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { CredentialCategory } from '../schemas/credential.schema';
export class CreateCredentialDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsString() @MinLength(1) @MaxLength(300) username!: string;
  @IsEnum(CredentialCategory) category!: CredentialCategory;
  @IsOptional() @IsString() @MaxLength(1000) url?: string;
  @IsString() @MinLength(1) @MaxLength(1000) password!: string;
  @IsOptional() @IsString() @MaxLength(10000) notes?: string;
}