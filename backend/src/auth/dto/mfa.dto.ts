import { IsString, Length } from 'class-validator';

export class MfaDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
