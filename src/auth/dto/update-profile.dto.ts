import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    required: false,
    enum: ['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'],
  })
  @IsEnum(['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'])
  @IsOptional()
  style?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ required: false, enum: ['en', 'es'] })
  @IsEnum(['en', 'es'])
  @IsOptional()
  language?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;
}
