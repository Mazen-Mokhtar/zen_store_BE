import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetPackagesDto {
  @IsMongoId()
  @IsNotEmpty()
  gameId: string; // Game ID to filter packages
}
