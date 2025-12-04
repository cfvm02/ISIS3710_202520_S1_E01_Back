import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ClothItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shop?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  price?: number;
}

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    enum: ['party', 'work', 'casual', 'travel', 'sport', 'night', 'formal'],
    required: false,
  })
  @IsEnum(['party', 'work', 'casual', 'travel', 'sport', 'night', 'formal'])
  @IsOptional()
  occasion?: string;

  @ApiProperty({
    enum: ['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'],
    required: false,
  })
  @IsEnum(['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'])
  @IsOptional()
  style?: string;

  @ApiProperty({ type: [ClothItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClothItemDto)
  @IsOptional()
  clothItems?: ClothItemDto[];

  @ApiProperty({ enum: ['published', 'draft'], default: 'published' })
  @IsEnum(['published', 'draft'])
  @IsOptional()
  status?: string;
}

export class UpdatePostDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsEnum(['party', 'work', 'casual', 'travel', 'sport', 'night', 'formal'])
  @IsOptional()
  occasion?: string;

  @ApiProperty({ required: false })
  @IsEnum(['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'])
  @IsOptional()
  style?: string;

  @ApiProperty({ enum: ['published', 'draft'], required: false })
  @IsEnum(['published', 'draft'])
  @IsOptional()
  status?: string;
}
