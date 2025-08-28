import { registerDecorator, ValidationOptions, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { GameType } from 'src/DB/models/Game/game.schema';
import { Types } from 'mongoose';
import { AccountInfoDTO } from '../dto';

@ValidatorConstraint({ name: 'isValidAccountInfo', async: true })
@Injectable()
export class IsValidAccountInfoConstraint implements ValidatorConstraintInterface {
    constructor(private readonly gameRepository: GameRepository) {}

    async validate(accountInfo: AccountInfoDTO[], args: ValidationArguments) {
        const { gameId } = args.object as any;
        
        if (!gameId || !accountInfo) {
            return false;
        }

        const game = await this.gameRepository.findOne({ 
            _id: gameId, 
            isActive: true, 
            isDeleted: { $ne: true } 
        });
        
        if (!game || !game.accountInfoFields) {
            return false;
        }

        // Check for required fields
        const missingFields: string[] = [];
        for (const field of game.accountInfoFields) {
            if (field.isRequired) {
                const fieldExists = accountInfo.some(
                    (info: AccountInfoDTO) =>
                        info.fieldName === field.fieldName && 
                        info.value && 
                        info.value.trim() !== ''
                );
                if (!fieldExists) {
                    missingFields.push(field.fieldName);
                }
            }
        }

        if (missingFields.length > 0) {
            return false;
        }

        // Validate email format for email fields
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        for (const info of accountInfo) {
            // Check if field name contains 'email' or 'gmail' (case insensitive)
            const fieldNameLower = info.fieldName.toLowerCase();
            if (fieldNameLower.includes('email') || fieldNameLower.includes('gmail')) {
                if (!emailRegex.test(info.value)) {
                    return false;
                }
            }
        }

        // Check for invalid fields
        const validFieldNames = game.accountInfoFields.map(field => field.fieldName);
        const invalidFields: string[] = [];
        for (const info of accountInfo) {
            if (!validFieldNames.includes(info.fieldName)) {
                invalidFields.push(info.fieldName);
            }
        }

        return invalidFields.length === 0;
    }

    defaultMessage(args: ValidationArguments): string {
        return 'Account info validation failed. Please ensure all required fields are provided and email format is correct.';
    }
}

export function IsValidAccountInfo(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidAccountInfoConstraint,
        });
    };
}