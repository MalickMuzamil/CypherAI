import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsNotEmpty()
  credentialId!: string;

  @IsEmail()
  @IsNotEmpty()
  recipientEmail!: string;

  @IsOptional()
  @IsEnum(['READ', 'READ_WRITE'])
  permission?: 'READ' | 'READ_WRITE';

  @IsOptional()
  expiresAt?: string;
}
