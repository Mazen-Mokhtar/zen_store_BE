import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '../enums/payment-method.enum';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { Types } from 'mongoose';

@ValidatorConstraint({ name: 'isInstaTransferValidation', async: true })
@Injectable()
export class IsInstaTransferValidationConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly orderRepository: OrderRepository) {}

  async validate(nameOfInsta: string, args: ValidationArguments) {
    const requestObject = args.object as any;

    // For CreateOrderDTO, check paymentMethod directly from the request
    if (requestObject.paymentMethod) {
      if (requestObject.paymentMethod === PaymentMethod.INSTA_TRANSFER) {
        // Insta transfer requires nameOfInsta
        return !!nameOfInsta && nameOfInsta.trim().length > 0;
      } else {
        // Other payment methods should not have nameOfInsta
        return !nameOfInsta;
      }
    }

    // For WalletTransferDTO, we can't validate without knowing the payment method
    // Since orderId comes from URL params, not from the DTO body
    // We'll allow the validation to pass and let the service handle the logic
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Instagram name is required for insta-transfer payment method and should not be provided for other payment methods';
  }
}

export function IsInstaTransferValidation(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsInstaTransferValidationConstraint,
    });
  };
}
