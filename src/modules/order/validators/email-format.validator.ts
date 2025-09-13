import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'isValidEmailFormat', async: false })
@Injectable()
export class IsValidEmailFormatConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string, args: ValidationArguments) {
    if (!value) return true; // Allow empty values, other validators handle required

    // Email regex pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Email format is invalid';
  }
}

export function IsValidEmailFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidEmailFormatConstraint,
    });
  };
}
