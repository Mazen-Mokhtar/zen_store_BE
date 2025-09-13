import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { GameType } from 'src/DB/models/Game/game.schema';
import { Types } from 'mongoose';

@ValidatorConstraint({ name: 'isSteamGameValidation', async: true })
@Injectable()
export class IsSteamGameValidationConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly gameRepository: GameRepository) {}

  async validate(packageId: Types.ObjectId, args: ValidationArguments) {
    const { gameId } = args.object as any;

    if (!gameId) {
      return false; // gameId is required
    }

    const game = await this.gameRepository.findOne({
      _id: gameId,
      isActive: true,
      isDeleted: { $ne: true },
    });

    if (!game) {
      return false; // Game not found
    }

    if (game.type === GameType.STEAM) {
      // Steam games must NOT have packageId
      return !packageId;
    } else {
      // Non-Steam games must have packageId
      return !!packageId;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Steam games cannot have packages, while non-Steam games require packages';
  }
}

export function IsSteamGameValidation(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSteamGameValidationConstraint,
    });
  };
}
