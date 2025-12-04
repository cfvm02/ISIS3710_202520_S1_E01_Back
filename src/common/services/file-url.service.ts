import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileUrlService {
  private readonly fileBaseUrl: string | null;

  constructor(private readonly configService: ConfigService) {
    const configuredBaseUrl =
      this.configService.get<string>('FILE_BASE_URL') ||
      this.configService.get<string>('API_BASE_URL') ||
      this.configService.get<string>('APP_URL') ||
      this.getLocalDefault();

    this.fileBaseUrl = configuredBaseUrl
      ? configuredBaseUrl.replace(/\/$/, '')
      : null;
  }

  toPublicUrl(url?: string | null): string | null | undefined {
    if (!url) {
      return url;
    }

    const uploadsIndex = url.indexOf('/uploads/');
    if (uploadsIndex === -1) {
      return url;
    }

    const relativePath = url.substring(uploadsIndex);
    if (this.fileBaseUrl) {
      return `${this.fileBaseUrl}${relativePath}`;
    }

    return relativePath;
  }

  private getLocalDefault(): string | null {
    const port = this.configService.get<number>('PORT') || 3000;
    return `http://localhost:${port}`;
  }
}
